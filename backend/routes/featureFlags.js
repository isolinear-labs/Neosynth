const express = require('express');
const router = express.Router();
const FeatureFlag = require('../models/FeatureFlag');
const UnifiedAuth = require('../middleware/unifiedAuth');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');

// Store SSE connections for cache invalidation
const sseConnections = new Map(); // userId -> response object

// Rate limiting configurations
const featureFlagReadLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute per user
    message: { message: 'Too many feature flag requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

const featureFlagAdminLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute  
    max: 30, // 30 admin operations per minute (same as read limit)
    message: { message: 'Too many admin requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Validation schemas
const createFeatureFlagSchema = Joi.object({
    name: Joi.string().required().min(1).max(100).pattern(/^[a-z0-9_]+$/),
    description: Joi.string().required().min(1).max(500),
    enabled: Joi.boolean().default(false),
    rolloutPercentage: Joi.number().min(0).max(100).default(0),
    category: Joi.string().min(1).max(50).default('general'),
    adminOnly: Joi.boolean().default(false),
    metadata: Joi.object().optional().default({}),
    conditions: Joi.object({
        userRoles: Joi.array().items(Joi.string().valid('admin', 'user')).default([]),
        userIds: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).default([])
    }).default({})
});

const updateFeatureFlagSchema = Joi.object({
    name: Joi.string().min(1).max(100).pattern(/^[a-z0-9_]+$/),
    description: Joi.string().min(1).max(500),
    enabled: Joi.boolean(),
    rolloutPercentage: Joi.number().min(0).max(100),
    category: Joi.string().min(1).max(50),
    adminOnly: Joi.boolean(),
    metadata: Joi.object().optional(),
    conditions: Joi.object({
        userRoles: Joi.array().items(Joi.string().valid('admin', 'user')),
        userIds: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    })
});

// Helper function to get user ID from either auth type
function getUserId(req) {
    return req.authType === 'session' ? req.userId : req.apiKey?.userId;
}

// Helper function to scan frontend modules for feature flag usage
function scanFrontendModules() {
    try {
        const fs = require('fs');
        const path = require('path');
        
        const frontendPath = path.resolve(__dirname, '../../frontend');
        const modulesPath = path.join(frontendPath, 'modules');

        // Validate path to prevent traversal attacks
        const resolvedModulesPath = path.resolve(modulesPath);
        if (!resolvedModulesPath.startsWith(frontendPath)) {
            throw new Error('Path traversal detected in modules path');
        }
        
        if (!fs.existsSync(modulesPath)) {
            console.warn('Frontend modules directory not found:', modulesPath);
            return [];
        }
        
        const discoveredFeatures = [];
        
        // Recursively scan all .js files in modules directory
        function scanDirectory(dirPath, relativePath = '') {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            
            entries.forEach(entry => {
                const fullPath = path.join(dirPath, entry.name);
                const relativeFilePath = path.join(relativePath, entry.name);
                
                if (entry.isDirectory()) {
                    // Recursively scan subdirectories
                    scanDirectory(fullPath, relativeFilePath);
                } else if (entry.isFile() && entry.name.endsWith('.js')) {
                    // Scan JavaScript files
                    scanJavaScriptFile(fullPath, relativeFilePath);
                }
            });
        }
        
        // Scan individual JavaScript file for feature flag usage
        function scanJavaScriptFile(filePath, relativeFilePath) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Look for feature flag patterns
                const patterns = [
                    /featureManager\.isEnabled\(['"`]([^'"`]+)['"`]\)/g,
                    /featureFlags?\.isEnabled\(['"`]([^'"`]+)['"`]\)/g,
                    /isEnabled\(['"`]([^'"`]+)['"`]\)/g
                ];
                
                patterns.forEach(pattern => {
                    let match;
                    while ((match = pattern.exec(content)) !== null) {
                        const flagName = match[1];
                        
                        // Extract metadata from comments above the feature flag usage
                        const metadata = extractMetadata(content, match.index);
                        
                        // Determine module name from file path
                        const moduleName = path.dirname(relativeFilePath).split(path.sep)[0] || 'root';
                        
                        // Skip experimental_themes as it's handled in themes category
                        if (flagName === 'experimental_themes') {
                            return;
                        }
                        
                        // Check if this feature was already found
                        const existingFeature = discoveredFeatures.find(f => f.id === flagName);
                        if (!existingFeature) {
                            discoveredFeatures.push({
                                id: flagName,
                                name: metadata.name || formatFlagName(flagName),
                                description: metadata.description || `Feature flag controlled functionality in ${moduleName} module`,
                                category: metadata.category || 'app-features',
                                module: moduleName,
                                file: relativeFilePath,
                                adminOnly: metadata.adminOnly !== undefined ? metadata.adminOnly : inferAdminOnly(flagName),
                                metadata: {
                                    ...metadata,
                                    discoveredAt: new Date().toISOString(),
                                    pattern: match[0]
                                }
                            });
                        }
                    } // Close while loop
                }); // Close patterns.forEach
                
            } catch (error) {
                console.error(`Error scanning file ${filePath}:`, error.message);
            }
        }
        
        // Extract metadata from comments
        function extractMetadata(content, matchIndex) {
            const lines = content.substring(0, matchIndex).split('\n');
            const metadata = {};
            
            // Look for metadata in comments above the match (last 10 lines)
            const relevantLines = lines.slice(-10);
            
            relevantLines.forEach(line => {
                const trimmed = line.trim();
                
                // Look for @feature-flag metadata comments
                if (trimmed.includes('@feature-flag:')) {
                    const nameMatch = trimmed.match(/@feature-flag:\s*(.+)/);
                    if (nameMatch) metadata.name = nameMatch[1].trim();
                }
                
                if (trimmed.includes('@description:')) {
                    const descMatch = trimmed.match(/@description:\s*(.+)/);
                    if (descMatch) metadata.description = descMatch[1].trim();
                }
                
                if (trimmed.includes('@category:')) {
                    const catMatch = trimmed.match(/@category:\s*(.+)/);
                    if (catMatch) metadata.category = catMatch[1].trim();
                }
                
                if (trimmed.includes('@admin-only')) {
                    metadata.adminOnly = true;
                }
            });
            
            return metadata;
        }
        
        // Format flag name for display
        function formatFlagName(flagName) {
            return flagName
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }
        
        // Infer if feature should be admin-only based on name
        function inferAdminOnly(flagName) {
            const adminKeywords = ['admin', 'debug', 'developer', 'internal'];
            return adminKeywords.some(keyword => flagName.toLowerCase().includes(keyword));
        }
        
        // Start scanning from modules directory
        scanDirectory(modulesPath);
        
        return discoveredFeatures;
        
    } catch (error) {
        console.error('Error scanning frontend modules:', error);
        return [];
    }
}

// Helper function to discover themes from filesystem
function discoverThemes() {
    try {
        const fs = require('fs');
        const path = require('path');
        
        const frontendPath = path.resolve(__dirname, '../../frontend');
        const themesPath = path.join(frontendPath, 'cssCustom/themes');

        // Validate path to prevent traversal attacks
        const resolvedThemesPath = path.resolve(themesPath);
        if (!resolvedThemesPath.startsWith(frontendPath)) {
            throw new Error('Path traversal detected in themes path');
        }
        
        if (!fs.existsSync(themesPath)) {
            console.warn('Themes directory not found:', themesPath);
            return [];
        }
        
        const themeFiles = fs.readdirSync(themesPath)
            .filter(file => file.endsWith('.css') && !['components.css', 'root.css', 'misc.css', 'mobile.css'].includes(file) && !file.startsWith('experimental-'))
            .map(file => {
                const themeId = file.replace('.css', '');
                return {
                    id: themeId,
                    name: themeId.charAt(0).toUpperCase() + themeId.slice(1).replace(/([A-Z])/g, ' $1').trim(),
                    description: `${themeId.charAt(0).toUpperCase() + themeId.slice(1)} theme with unique visual styling`
                };
            });
            
        return themeFiles;
    } catch (error) {
        console.error('Error discovering themes:', error);
        return [];
    }
}

// Audit logging function
function logFeatureFlagChange(action, flagData, userId, userRole) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        action, // 'create', 'update', 'delete'
        flagName: flagData.name,
        flagId: flagData._id,
        userId,
        userRole,
        changes: flagData
    };
    
    console.log('AUDIT - Feature Flag Change:', JSON.stringify(logEntry));
    
    // In production, consider writing to a dedicated audit log file or database
    // Example: auditLogger.info(logEntry);
}

// Helper function to broadcast flag updates to connected clients
function broadcastFeatureFlagUpdate(affectedUserIds = []) {
    // If no specific users, broadcast to all connected clients
    if (affectedUserIds.length === 0) {
        affectedUserIds = Array.from(sseConnections.keys());
    }
    
    affectedUserIds.forEach(userId => {
        const res = sseConnections.get(userId);
        if (res && !res.destroyed && !res.finished) {
            try {
                res.write(`data: ${JSON.stringify({ type: 'refresh', timestamp: Date.now() })}\n\n`);
            } catch (error) {
                console.error('Error broadcasting to user:', userId, error);
                sseConnections.delete(userId);
            }
        } else if (res && (res.destroyed || res.finished)) {
            // Clean up stale connections
            sseConnections.delete(userId);
        }
    });
}

// Helper function to check if user has access to feature flag
function hasFeatureFlagAccess(flag, userId, userRole) {
    if (!flag.enabled) return false;
    
    // Check user-specific access
    if (flag.conditions.userIds.includes(userId)) return true;
    
    // Check role-based access
    if (flag.conditions.userRoles.includes(userRole)) return true;
    
    // Check rollout percentage
    if (flag.rolloutPercentage > 0) {
        // Simple hash-based rollout using userId
        const hash = Array.from(userId).reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return (a & 0xffffffff) >>> 0; // Proper 32-bit unsigned hash
        }, 0);
        const userPercentile = Math.abs(hash) % 100;
        return userPercentile < flag.rolloutPercentage;
    }
    
    return false;
}

// Get all feature flags for current user
router.get('/feature-flags', 
    featureFlagReadLimit,
    UnifiedAuth.authenticate,
    async (req, res) => {
        try {
            const userId = getUserId(req);
            const isAdmin = req.authType === 'session' ? req.isAdmin : req.apiKey?.role === 'admin';
            const userRole = isAdmin ? 'admin' : 'user';
            
            //console.log(`Feature flags request - UserId: ${userId}, IsAdmin: ${isAdmin}, Role: ${userRole}`);
            
            const flags = await FeatureFlag.find({});
            const userFlags = {};
            
            flags.forEach(flag => {
                userFlags[flag.name] = hasFeatureFlagAccess(flag, userId, userRole);
            });
            
            res.json(userFlags);
        } catch (err) {
            console.error('Error fetching feature flags:', err);
            res.status(500).json({ message: 'Server error' });
        }
    });

// Server-Sent Events endpoint for real-time cache invalidation
router.get('/feature-flags/events', 
    UnifiedAuth.authenticate,
    (req, res) => {
        const userId = getUserId(req);
        
        // Set up SSE headers with better HTTP2 compatibility
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control',
            'X-Accel-Buffering': 'no' // Disable nginx buffering
        });
        
        // Store the connection
        sseConnections.set(userId, res);
        
        // Send initial heartbeat
        try {
            res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);
        } catch (error) {
            console.error('Error sending initial SSE data:', error);
            sseConnections.delete(userId);
            return;
        }
        
        // Set up heartbeat to keep connection alive
        const heartbeatInterval = setInterval(() => {
            if (res.destroyed || res.finished) {
                clearInterval(heartbeatInterval);
                sseConnections.delete(userId);
                return;
            }
            
            try {
                res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
            } catch (error) {
                console.error('Error sending SSE heartbeat:', error);
                clearInterval(heartbeatInterval);
                sseConnections.delete(userId);
            }
        }, 30000); // 30 second heartbeat
        
        // Enhanced cleanup on client disconnect
        const cleanup = () => {
            clearInterval(heartbeatInterval);
            sseConnections.delete(userId);
        };
        
        req.on('close', cleanup);
        req.on('aborted', cleanup);
        req.on('error', (error) => {
            // Don't log ECONNRESET errors - these are normal when users refresh/navigate away
            if (error.code !== 'ECONNRESET') {
                console.error('SSE request error:', error);
            }
            cleanup();
        });
        
        res.on('error', (error) => {
            console.error('SSE response error:', error);
            cleanup();
        });
    });

// Admin routes - require admin authentication and rate limiting
router.use('/admin/feature-flags', featureFlagAdminLimit, UnifiedAuth.authenticate, UnifiedAuth.requireAdmin);

// Get all feature flags (admin only)
router.get('/admin/feature-flags', async (req, res) => {
    try {
        const flags = await FeatureFlag.find({}).sort({ created: -1 });
        res.json(flags);
    } catch (err) {
        console.error('Error fetching feature flags:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create new feature flag (admin only)
router.post('/admin/feature-flags', async (req, res) => {
    try {
        const { error, value } = createFeatureFlagSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ 
                message: 'Validation error', 
                details: error.details.map(d => d.message)
            });
        }
        
        const { name, description, enabled, category, adminOnly, conditions } = value;
        let { rolloutPercentage } = value;
        
        // Auto-correct: admin-only features must have 0% rollout
        if (adminOnly) {
            rolloutPercentage = 0;
        }
        
        const flag = new FeatureFlag({
            name: name.toLowerCase().replace(/\s+/g, '_'),
            description,
            enabled,
            rolloutPercentage,
            category,
            conditions: {
                userRoles: adminOnly ? ['admin'] : (conditions.userRoles || []),
                userIds: conditions.userIds || []
            }
        });
        
        const savedFlag = await flag.save();
        
        // Audit log the creation
        const userId = getUserId(req);
        const userRole = req.isAdmin ? 'admin' : 'user';
        logFeatureFlagChange('create', savedFlag, userId, userRole);
        
        // Broadcast update to all connected clients
        broadcastFeatureFlagUpdate();
        
        res.status(201).json(savedFlag);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Feature flag with this name already exists' });
        }
        console.error('Error creating feature flag:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update feature flag (admin only)
router.put('/admin/feature-flags/:id', async (req, res) => {
    try {
        const { error, value } = updateFeatureFlagSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ 
                message: 'Validation error', 
                details: error.details.map(d => d.message)
            });
        }
        
        const { name, description, enabled, category, adminOnly, conditions } = value;
        let { rolloutPercentage } = value;
        
        // Auto-correct: admin-only features must have 0% rollout
        if (adminOnly) {
            rolloutPercentage = 0;
        }
        
        const updateData = {};
        if (name) updateData.name = name;
        if (description) updateData.description = description;
        if (typeof enabled === 'boolean') updateData.enabled = enabled;
        if (typeof rolloutPercentage === 'number') updateData.rolloutPercentage = rolloutPercentage;
        if (category) updateData.category = category;
        
        // Handle adminOnly - convert to conditions format
        if (typeof adminOnly === 'boolean') {
            updateData.conditions = {
                userRoles: adminOnly ? ['admin'] : [],
                userIds: []
            };
        } else if (conditions) {
            updateData.conditions = {
                userRoles: conditions.userRoles || [],
                userIds: conditions.userIds || []
            };
        }
        
        const flag = await FeatureFlag.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );
        
        if (!flag) {
            return res.status(404).json({ message: 'Feature flag not found' });
        }
        
        // Audit log the update
        const userId = getUserId(req);
        const userRole = req.isAdmin ? 'admin' : 'user';
        logFeatureFlagChange('update', { ...flag.toObject(), changes: updateData }, userId, userRole);
        
        // Broadcast update to all connected clients
        broadcastFeatureFlagUpdate();
        
        res.json(flag);
    } catch (err) {
        console.error('Error updating feature flag:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete feature flag (admin only)
router.delete('/admin/feature-flags/:id', async (req, res) => {
    try {
        const flag = await FeatureFlag.findByIdAndDelete(req.params.id);
        
        if (!flag) {
            return res.status(404).json({ message: 'Feature flag not found' });
        }
        
        // Audit log the deletion
        const userId = getUserId(req);
        const userRole = req.isAdmin ? 'admin' : 'user';
        logFeatureFlagChange('delete', flag, userId, userRole);
        
        // Broadcast update to all connected clients
        broadcastFeatureFlagUpdate();
        
        res.json({ message: 'Feature flag deleted successfully' });
    } catch (err) {
        console.error('Error deleting feature flag:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Discovery endpoints for dynamic feature flag creation

// Get available feature categories and templates
router.get('/admin/discovery/categories', UnifiedAuth.authenticate, UnifiedAuth.requireAdmin, async (req, res) => {
    try {
        
        // Use the shared theme discovery function
        const discoveredThemes = discoverThemes().map(theme => ({
            ...theme,
            description: `Controls access to the ${theme.id} theme`,
            category: 'themes',
            metadata: { themeId: theme.id, cssFile: `${theme.id}.css` }
        }));

        // Scan frontend modules for feature flag usage
        const discoveredAppFeatures = scanFrontendModules();

        // Group app features by category
        const appFeatureCategories = {};
        discoveredAppFeatures.forEach(feature => {
            const category = feature.category || 'app-features';
            if (!appFeatureCategories[category]) {
                appFeatureCategories[category] = [];
            }
            appFeatureCategories[category].push(feature);
        });

        const categories = {
            themes: {
                name: 'Theme Features',
                icon: '🎨',
                description: 'Control access to visual themes',
                templates: [
                    {
                        id: 'experimental_themes',
                        name: 'Experimental Themes',
                        description: 'Enables access to experimental and beta themes',
                        category: 'themes',
                        metadata: { special: 'experimental' }
                    }
                ]
            },
            'app-features': {
                name: 'App Features',
                icon: '⚡',
                description: 'Frontend application features discovered from modules',
                templates: appFeatureCategories['app-features'] || []
            },
            navigation: {
                name: 'Navigation Features',
                icon: '🧭',
                description: 'UI navigation and menu features',
                templates: appFeatureCategories['navigation'] || []
            },
            ui: {
                name: 'UI Features',
                icon: '🎛️',
                description: 'User interface enhancements and controls',
                templates: appFeatureCategories['ui'] || []
            },
            admin: {
                name: 'Admin Features',
                icon: '⚙️',
                description: 'Administrative tools and controls',
                templates: appFeatureCategories['admin'] || []
            },
            developer: {
                name: 'Developer Features',
                icon: '🔧',
                description: 'Developer tools and debugging features',
                templates: [
                    ...(appFeatureCategories['developer'] || []),
                    {
                        id: 'debug_authentication_logging',
                        name: 'Authentication Debug Logging',
                        description: 'Debug logging for authentication flow to troubleshoot login redirects',
                        category: 'developer',
                        adminOnly: true,
                        metadata: { backend: true, location: 'server.js, sessionAuth.js' }
                    }
                ]
            }
        };

        // Add any additional categories found during scanning
        Object.keys(appFeatureCategories).forEach(categoryKey => {
            if (!categories[categoryKey]) {
                categories[categoryKey] = {
                    name: categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1).replace('-', ' '),
                    icon: '📦',
                    description: `Features in the ${categoryKey} category`,
                    templates: appFeatureCategories[categoryKey]
                };
            }
        });

        res.json(categories);
    } catch (error) {
        console.error('Error discovering feature categories:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get existing feature flags grouped by category
router.get('/admin/discovery/existing', UnifiedAuth.authenticate, UnifiedAuth.requireAdmin, async (req, res) => {
    try {
        const flags = await FeatureFlag.find({}).sort({ category: 1, name: 1 });
        
        const categorized = {};
        flags.forEach(flag => {
            const category = flag.category || 'general';
            if (!categorized[category]) {
                categorized[category] = [];
            }
            categorized[category].push(flag);
        });

        res.json(categorized);
    } catch (error) {
        console.error('Error fetching categorized flags:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get available themes based on feature flags (for frontend consumption)
router.get('/themes', 
    featureFlagReadLimit,
    UnifiedAuth.authenticate,
    async (req, res) => {
        try {
            const userId = getUserId(req);
            const isAdmin = req.authType === 'session' ? req.isAdmin : req.apiKey?.role === 'admin';
            const userRole = isAdmin ? 'admin' : 'user';
            
            // Get all feature flags to check theme availability
            const flags = await FeatureFlag.find({});
            const userFlags = {};
            
            flags.forEach(flag => {
                userFlags[flag.name] = hasFeatureFlagAccess(flag, userId, userRole);
            });

            // Discover themes dynamically from filesystem
            const discoveredThemes = discoverThemes();
            
            // Add default theme (always available, not in filesystem)
            let availableThemes = [
                { id: 'default', name: 'Default', description: 'Classic 80s magenta/cyan contrast' },
                ...discoveredThemes
            ];

            // Add experimental themes if feature flag is enabled
            if (userFlags['experimental_themes']) {
                availableThemes.push(
                    { id: 'hologram', name: 'Hologram', description: '[EXPERIMENTAL] Translucent blue/green holographic interface' },
                    { id: 'matrix', name: 'Matrix Code', description: '[EXPERIMENTAL] Green cascading code matrix theme' },
                    { id: 'cyber-glass', name: 'Cyber Glass', description: '[EXPERIMENTAL] Transparent glass-like cyberpunk interface' },
                    { id: 'toxic', name: 'Toxic Waste', description: '[EXPERIMENTAL] Radioactive green/yellow hazardous energy' }
                );
            }

            // Filter themes based on individual theme feature flags
            availableThemes = availableThemes.filter(theme => {
                const themeFlag = `theme_${theme.id}`;
                const alternateFlag = theme.id; // Also check just the theme ID (for backwards compatibility)
                
                const hasThemeFlag = Object.prototype.hasOwnProperty.call(userFlags, themeFlag);
                const hasAlternateFlag = Object.prototype.hasOwnProperty.call(userFlags, alternateFlag);
                
                const themeFlagValue = userFlags[themeFlag];
                const alternateFlagValue = userFlags[alternateFlag];
                
                // If neither flag exists, theme is available by default
                if (!hasThemeFlag && !hasAlternateFlag) {
                    return true;
                }
                
                // If theme_X flag exists, use it
                if (hasThemeFlag) {
                    return themeFlagValue;
                }
                
                // If just X flag exists, use it
                if (hasAlternateFlag) {
                    return alternateFlagValue;
                }
                
                return true;
            });

            res.json(availableThemes);
        } catch (err) {
            console.error('Error fetching themes:', err);
            res.status(500).json({ message: 'Server error' });
        }
    });

module.exports = router;
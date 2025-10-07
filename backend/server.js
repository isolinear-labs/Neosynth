const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Import routes
const apiDocsRoutes = require('./routes/api-docs');
const authRoutes = require('./routes/auth');
const nowPlayingRoutes = require('./routes/nowPlaying');
const playlistRoutes = require('./routes/playlists');
const preferenceRoutes = require('./routes/preference');
const shuffleRoutes = require('./routes/shuffle');
const trackRoutes = require('./routes/tracks');
const userRoutes = require('./routes/users');
const apiKeyRoutes = require('./routes/apiKeys');
const featureFlagRoutes = require('./routes/featureFlags');
const { generateAssetHashes } = require('./utils/assetHasher');


// Initialize express app
const app = express();

// Global setup completion flag - loaded once at startup
let isSetupComplete = false;

// Global database ready flag - blocks requests until migrations complete
let isDatabaseReady = false;

// Function to update setup status (called when setup completes)
function markSetupComplete() {
    isSetupComplete = true;
    console.log('[INFO] Setup status updated: System setup completed');
}

// Make setup functions globally available
global.markSetupComplete = markSetupComplete;
global.isSetupComplete = () => isSetupComplete;
global.isDatabaseReady = () => isDatabaseReady;

// Trust proxy - trust only the immediate proxy
app.set('trust proxy', 1);

// Security headers middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ['\'self\''],
            scriptSrc: ['\'self\'', '\'unsafe-inline\'', '\'unsafe-hashes\''], // Allow inline scripts and event handlers
            scriptSrcAttr: ['\'unsafe-inline\''],       // Allow inline event handlers (onclick, etc.)
            styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com'],  // Allow inline styles and Google Fonts
            imgSrc: ['\'self\'', 'data:', 'https:'],    // Allow images from any HTTPS source
            connectSrc: ['\'self\'', 'https:', 'http:'], // Allow API calls to external streaming sources
            fontSrc: ['\'self\'', 'data:', 'https://fonts.gstatic.com'],  // Allow fonts from same origin, data URLs, and Google Fonts
            objectSrc: ['\'none\''],                    // Block object/embed tags
            mediaSrc: ['\'self\'', 'https:'],           // Allow audio/video from HTTPS sources
            frameSrc: ['\'none\'']                      // Block iframes
        }
    },
    crossOriginEmbedderPolicy: false // Disable COEP for compatibility
}));

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true // Allow cookies to be sent
}));
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));

// Database readiness middleware - blocks all requests until migrations complete
app.use((req, res, next) => {
    // Allow health check endpoint even when database is not ready
    if (req.path === '/health') {
        return next();
    }

    // Block all other requests if database is not ready
    if (!isDatabaseReady) {
        return res.status(503).json({
            status: 'Service Unavailable',
            message: 'Database migrations in progress. Please wait...',
            code: 'DATABASE_NOT_READY'
        });
    }

    next();
});

// Connect to MongoDB and initialize setup status
mongoose.set('strictQuery', true);
mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('MongoDB connected');

        // Run database migrations before marking database as ready
        const bypassMigrations = process.env.BYPASS_MIGRATIONS === 'true';

        if (bypassMigrations) {
            console.log('[WARN] ╔════════════════════════════════════════════════════════════════╗');
            console.log('[WARN] ║         BYPASSING MIGRATIONS - UNSAFE MODE ENABLED             ║');
            console.log('[WARN] ╚════════════════════════════════════════════════════════════════╝');
            console.log('[WARN] BYPASS_MIGRATIONS=true detected');
            console.log('[WARN] Database marked ready WITHOUT running migrations');
            console.log('[WARN] This should only be used for emergency recovery');
            isDatabaseReady = true;
        } else {
            try {
                const { runMigrations } = require('./migrations/migrationRunner');
                const migrationResult = await runMigrations();

                if (!migrationResult.success) {
                    console.error('[CRITICAL] Migrations failed - database is NOT ready');
                    console.error('[CRITICAL] Server will NOT accept requests until migrations succeed');
                    console.error('[CRITICAL] Please fix migration errors and restart the server');
                    console.error('[CRITICAL] Or set BYPASS_MIGRATIONS=true to force startup (unsafe)');
                    // Keep isDatabaseReady = false, blocking all requests
                    return;
                }

                // Mark database as ready only after successful migrations
                isDatabaseReady = true;

                if (migrationResult.migrationsRun > 0) {
                    console.log(`[OK] Database ready - ${migrationResult.migrationsRun} migration(s) completed successfully`);
                } else {
                    console.log('[OK] Database ready');
                }

            } catch (error) {
                console.error('[CRITICAL] Migration runner error:', error);
                console.error('[CRITICAL] Database is NOT ready - server will reject requests');
                console.error('[CRITICAL] Set BYPASS_MIGRATIONS=true to force startup (unsafe)');
                // Keep isDatabaseReady = false, blocking all requests
                return;
            }
        }

        // Load setup completion status at startup
        try {
            const SystemSettings = require('./models/SystemSettings');
            const settings = await SystemSettings.getSystemSettings();
            isSetupComplete = settings.firstTimeSetupCompleted;
            console.log(`[INFO] Setup status loaded: ${isSetupComplete ? 'Completed' : 'Required'}`);
        } catch (error) {
            console.error('[ERROR] Error loading setup status:', error);
            // Default to incomplete on error to be safe
            isSetupComplete = false;
        }
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        isDatabaseReady = false;
    });

// Determine frontend path based on current working directory
let frontendPath;
if (process.cwd().endsWith('/backend')) {
    // If working directory is /app/backend
    frontendPath = path.join(__dirname, '../frontend');
} else {
    // If working directory is /app
    frontendPath = path.join(process.cwd(), 'frontend');
}

// Verify frontend path exists
if (!fs.existsSync(frontendPath)) {
    console.error(`Frontend directory not found at: ${frontendPath}`);
}

// Generate asset hashes at startup for cache busting
const assetHashes = generateAssetHashes(frontendPath);

// Cache index.html with injected asset hashes (generated once at startup)
let cachedIndexHtml = null;
const indexPath = path.join(frontendPath, 'index.html');
if (fs.existsSync(indexPath)) {
    let html = fs.readFileSync(indexPath, 'utf8');

    // Verify placeholders exist before replacement
    const cssPlaceholderCount = (html.match(/\{\{CSS_HASH\}\}/g) || []).length;
    const jsPlaceholderCount = (html.match(/\{\{JS_HASH\}\}/g) || []).length;
    console.log(`[DEBUG] Found ${cssPlaceholderCount} CSS_HASH placeholders and ${jsPlaceholderCount} JS_HASH placeholders in index.html`);

    cachedIndexHtml = html
        .replace(/\{\{CSS_HASH\}\}/g, assetHashes.mainCss)
        .replace(/\{\{JS_HASH\}\}/g, assetHashes.appJs);

    // Verify replacement succeeded
    const cssHashInHtml = cachedIndexHtml.match(/main\.css\?v=([a-f0-9]+)/);
    const jsHashInHtml = cachedIndexHtml.match(/app\.js\?v=([a-f0-9]+)/);
    console.log('[INFO] Index.html cached with asset hashes injected');
    console.log(`[DEBUG] CSS URL in cached HTML: main.css?v=${cssHashInHtml ? cssHashInHtml[1] : 'NOT FOUND'}`);
    console.log(`[DEBUG] JS URL in cached HTML: app.js?v=${jsHashInHtml ? jsHashInHtml[1] : 'NOT FOUND'}`);
} else {
    console.error('[ERROR] index.html not found at startup');
}

// Cache sw-v2.js with injected asset hash (migrated from sw.js for optimized cache busting)
let cachedServiceWorker = null;
const swPath = path.join(frontendPath, 'sw-v2.js');
if (fs.existsSync(swPath)) {
    let swContent = fs.readFileSync(swPath, 'utf8');

    // Use CSS hash as the service worker version (since SW mainly affects CSS/asset loading)
    cachedServiceWorker = swContent.replace(/\{\{SW_HASH\}\}/g, assetHashes.mainCss);

    console.log(`[INFO] Service worker cached with version: ${assetHashes.mainCss}`);
} else {
    console.warn('[WARN] sw-v2.js not found at startup - service worker will not be available');
}

// Health check endpoint for liveness probe (always responds, even during migrations)
app.get('/health', (req, res) => {
    const healthStatus = {
        status: isDatabaseReady ? 'healthy' : 'degraded',
        database: {
            connected: mongoose.connection.readyState === 1,
            ready: isDatabaseReady,
            message: isDatabaseReady ? 'Ready' : 'Migrations in progress'
        },
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    };

    // Return 200 for liveness (server is running)
    // Use status field to indicate readiness
    res.status(200).json(healthStatus);
});


// Login endpoint  
app.get('/login', (req, res) => {
    const loginPath = path.join(frontendPath, 'pages/login.html');
    if (fs.existsSync(loginPath)) {
        res.sendFile(loginPath);
    } else {
        res.status(404).send(`Login file not found at: ${loginPath}`);
    }
});


// Register endpoint
app.get('/register', (req, res) => {
    const registerPath = path.join(frontendPath, 'pages/register.html');
    if (fs.existsSync(registerPath)) {
        res.sendFile(registerPath);
    } else {
        res.status(404).send(`Register file not found at: ${registerPath}`);
    }
});

// Rate limiting for setup endpoint to prevent DB hammering
const setupLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // 10 requests per 15 minutes per IP
    message: { message: 'Too many setup requests' },
    standardHeaders: false,
    legacyHeaders: false
});

// First-time setup endpoint (conditional access based on setup status)
app.get('/setup', setupLimit, async (req, res) => {
    try {
        const SystemSettings = require('./models/SystemSettings');
        const isFirstTimeSetup = await SystemSettings.isFirstTimeSetup();

        if (!isFirstTimeSetup) {
            // Setup already completed, redirect to login
            console.log(`SECURITY: Blocked access to /setup from IP ${req.ip} - setup already completed`);
            return res.redirect('/login');
        }

        const setupPath = path.join(frontendPath, 'pages/first-time-setup.html');
        if (fs.existsSync(setupPath)) {
            res.sendFile(setupPath);
        } else {
            res.status(404).send(`First-time setup page not found at: ${setupPath}`);
        }
    } catch (error) {
        console.error('Error checking setup status:', error);
        res.status(500).send('Internal server error');
    }
});

// Redirect legacy route to clean URL
app.get('/first-time-setup', (req, res) => {
    res.redirect(301, '/setup');
});

// Admin endpoint - requires admin authentication
const UnifiedAuth = require('./middleware/unifiedAuth');
app.get('/admin', UnifiedAuth.authenticate, UnifiedAuth.requireAdmin, (req, res) => {
    const adminPath = path.join(frontendPath, 'pages/admin.html');
    if (fs.existsSync(adminPath)) {
        res.sendFile(adminPath);
    } else {
        res.status(404).send(`Admin page not found at: ${adminPath}`);
    }
});

// Serve cached service worker with injected hash (migrated to sw-v2.js for optimized cache busting)
app.get('/sw-v2.js', (req, res) => {
    if (cachedServiceWorker) {
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Cache-Control', 'no-cache'); // Force browsers to check for updates
        res.setHeader('Service-Worker-Allowed', '/');
        console.log(`[DEBUG] Serving sw-v2.js with version: ${assetHashes.mainCss}`);
        res.send(cachedServiceWorker);
    } else {
        res.status(404).send('Service worker not found');
    }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/users', userRoutes);
app.use('/api', preferenceRoutes);
app.use('/api', shuffleRoutes);
app.use('/api', apiDocsRoutes);
app.use('/api/tracks', trackRoutes);
app.use('/api', nowPlayingRoutes);
app.use('/api/keys', apiKeyRoutes);
app.use('/api', featureFlagRoutes);


// Debug middleware to log CSS/JS requests
app.use((req, res, next) => {
    if (req.path.endsWith('.css') || req.path.endsWith('.js')) {
        const userAgent = req.headers['user-agent'] || 'unknown';
        const isMobile = /Mobile|Android|iPhone/i.test(userAgent);
        console.log(`[DEBUG] Static asset requested - Path: ${req.path}, Query: ${JSON.stringify(req.query)}, Mobile: ${isMobile}`);
    }
    next();
});

// Serve static files from the frontend directory (excluding index.html)
// Override helmet cache headers for static assets to prevent 304s
app.use(express.static(frontendPath, {
    index: false,
    maxAge: '24h', // Cache for 24 hours
    setHeaders: (res, _path) => {
        // Override any cache-control headers set by helmet
        res.set('Cache-Control', 'public, max-age=86400');
    }
}));


/**
 * @feature-flag: debug_authentication_logging
 * @description: Debug logging for authentication flow to troubleshoot login redirects
 * @category: developer
 * @admin-only
 */
// Web authentication middleware - redirects to login instead of JSON error
const webAuth = async (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
        return next();
    }

    // Efficient setup status check using memory flag (no DB hit)
    if (!isSetupComplete) {
        // Setup not completed, redirect to setup unless already going there
        if (req.path !== '/setup' && req.path !== '/first-time-setup') {
            return res.redirect('/setup');
        } else {
            // Allow access to setup page
            return next();
        }
    } else {
        // Setup completed, block access to setup page
        if (req.path === '/setup' || req.path === '/first-time-setup') {
            console.log(`SECURITY: Blocked access to /setup from IP ${req.ip} - setup already completed`);
            return res.redirect('/login');
        }
    }
    
    try {
        // Simple admin-only debug logging check
        let debugAuthLogging = false;
        try {
            const FeatureFlag = require('./models/FeatureFlag');
            const flag = await FeatureFlag.findOne({ 
                name: 'debug_authentication_logging',
                enabled: true 
            });
            // Since this will be admin-only, just check if flag exists and is enabled
            debugAuthLogging = flag && flag.enabled;
        } catch (_flagError) {
            // Ignore feature flag errors in auth middleware
        }
        
        
        // Check for session token first
        const sessionToken = req.signedCookies?.sessionToken || req.cookies?.sessionToken;
        const startTime = Date.now();
        
        if (debugAuthLogging) {
            console.log('==== WEB AUTH DEBUG ====');
            console.log(' [AUTH-DEBUG] Path:', req.path);
            console.log(' [AUTH-DEBUG] Request timestamp:', new Date().toISOString());
            console.log(' [AUTH-DEBUG] Cookie header present:', !!req.headers.cookie);
            if (req.signedCookies?.sessionToken === false) {
                console.log(' [AUTH-DEBUG] COOKIE SIGNATURE FAILED');
            } else if (!sessionToken) {
                console.log(' [AUTH-DEBUG] No session token found');
                console.log(' [AUTH-DEBUG] Raw cookies:', req.headers.cookie ? 'Present' : 'Missing');
            } else {
                console.log(' [AUTH-DEBUG] Session token found:', sessionToken.substring(0, 20) + '...');
            }
        }
        
        if (sessionToken) {
            const UserSession = require('./models/UserSession');
            const session = await UserSession.findOne({ 
                sessionToken,
                isActive: true 
            });
            
            if (debugAuthLogging) {
                const dbLookupTime = Date.now();
                console.log(' [AUTH-DEBUG] DB lookup completed in:', dbLookupTime - startTime, 'ms');
                if (session) {
                    console.log(' [AUTH-DEBUG] Session found in DB, checking validity...');
                } else {
                    console.log(' [AUTH-DEBUG] Session NOT found in DB');
                    console.log('========================');
                }
            }
            
            if (session && session.isValid()) {
                if (debugAuthLogging) {
                    console.log(' [AUTH-DEBUG] Session valid, proceeding');
                    console.log('========================');
                }
                // Valid session found
                await session.updateActivity();
                req.session = session;
                req.userId = session.userId;
                req.isAdmin = session.isAdmin;
                req.authType = 'session';
                return next();
            } else if (debugAuthLogging) {
                console.log(' [AUTH-DEBUG] ❌ Redirecting to login - invalid session');
                console.log('========================');
            }
        } else if (debugAuthLogging) {
            console.log(' [AUTH-DEBUG] Redirecting to login for', req.path, '- no token');
            console.log('========================');
        }
        return res.redirect('/login');
        
    } catch (error) {
        console.error('Web auth error:', error);
        // Skip feature flag check in error handler
        return res.redirect('/login');
    }
};

// Catch-all route for API endpoint - for any other routes, serve the index.html
app.get('*', webAuth, (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
        return next();
    }

    if (cachedIndexHtml) {
        // Log asset hash info for debugging
        const userAgent = req.headers['user-agent'] || 'unknown';
        const isMobile = /Mobile|Android|iPhone/i.test(userAgent);
        console.log(`[DEBUG] Serving index.html - Path: ${req.path}, Mobile: ${isMobile}, CSS Hash: ${assetHashes.mainCss}, JS Hash: ${assetHashes.appJs}`);

        res.setHeader('Content-Type', 'text/html');
        res.send(cachedIndexHtml);
    } else {
        console.error('[ERROR] Attempted to serve index.html but cachedIndexHtml is null!');
        res.status(404).send('Index file not found');
    }
});

// Start server on port 5000
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Main server running on port ${PORT}`);

    // Display connection info for WSL/mobile access
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    console.log('\n[INFO] Server accessible at:');
    console.log(`  - Local: http://localhost:${PORT}`);

    // Find and display all available IP addresses
    Object.keys(networkInterfaces).forEach(interfaceName => {
        networkInterfaces[interfaceName].forEach(iface => {
            if (iface.family === 'IPv4' && !iface.internal) {
                console.log(`  - Network (${interfaceName}): http://${iface.address}:${PORT}`);
            }
        });
    });
    console.log('\n[TIP] For WSL2 mobile access, use the Windows host IP');
    console.log('[TIP] Run: ipconfig (Windows) to find your WiFi adapter IPv4 address\n');
});


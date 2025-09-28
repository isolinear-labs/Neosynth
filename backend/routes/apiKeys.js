const express = require('express');
const router = express.Router();
const ApiKey = require('../models/ApiKey');
const User = require('../models/User');
const UnifiedAuth = require('../middleware/unifiedAuth');

/*
 * API Key Management Routes
 * 
 * Endpoints support both session and API key authentication:
 * - POST /api/keys - Create API key
 * - GET /api/keys - List user's API keys  
 * - DELETE /api/keys/:keyId - Delete API key
 * - PUT /api/keys/:keyId - Update API key
 * - GET /api/keys/:keyId/stats - Get usage stats
 * - GET /api/keys/admin/all - Admin: list all keys
 */

// Helper function to get user ID from either auth type
function getUserId(req) {
    return req.authType === 'session' ? req.userId : req.apiKey?.userId;
}

// Helper function to check if user is admin
function isAdmin(req) {
    return req.authType === 'session' ? req.isAdmin : req.apiKey?.role === 'admin';
}

// Create API key
router.post('/', UnifiedAuth.authenticate, async (req, res) => {
    try {
        const { name, role = 'user', expiresIn = null, ipWhitelist } = req.body;
        const currentUserId = getUserId(req);

        if (!name) {
            return res.status(400).json({ message: 'API key name is required' });
        }

        // Get user info
        const user = await User.findOne({ userId: currentUserId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Validate role
        if (!['user', 'admin', 'service'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        // Admin role requires admin privileges
        if (role === 'admin' && !isAdmin(req)) {
            return res.status(403).json({ 
                message: 'Admin role API keys can only be created by admin users' 
            });
        }

        // Generate API key
        const prefix = process.env.NODE_ENV === 'production' ? 'nsk_live' : 'nsk_test';
        const keyData = ApiKey.generateApiKey(prefix);

        // Set permissions
        const permissions = ApiKey.getDefaultPermissions(role);

        // Calculate expiration
        let expiresAt = null;
        if (expiresIn) {
            const now = new Date();
            switch (expiresIn) {
            case '30d':
                expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
                break;
            case '1y':
                expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                return res.status(400).json({ 
                    message: 'Invalid expiresIn. Use: 30d, 90d, 1y, or null for no expiration' 
                });
            }
        }

        // Create API key record
        const apiKey = new ApiKey({
            keyId: keyData.keyId,
            keyHash: keyData.keyHash,
            userId: currentUserId,
            name: name,
            role: role,
            permissions: permissions,
            prefix: prefix,
            expiresAt: expiresAt,
            createdBy: currentUserId,
            ipWhitelist: ipWhitelist && Array.isArray(ipWhitelist) ? ipWhitelist : []
        });

        await apiKey.save();

        // Return the full key (this is the ONLY time it's shown)
        res.status(201).json({
            message: 'API key created successfully',
            key: keyData.fullKey, // ⚠️ ONLY TIME THIS IS RETURNED
            keyId: keyData.keyId,
            name: name,
            role: role,
            expiresAt: expiresAt
        });

    } catch (error) {
        console.error('API key creation error:', error);
        res.status(500).json({ message: 'Failed to create API key' });
    }
});

// List user's API keys
router.get('/', UnifiedAuth.authenticate, async (req, res) => {
    try {
        const currentUserId = getUserId(req);
        
        const apiKeys = await ApiKey.find({ 
            userId: currentUserId,
            isActive: true 
        }).select('-keyHash'); // Never return the hash

        const keyList = apiKeys.map(key => ({
            keyId: key.keyId,
            name: key.name,
            role: key.role,
            lastUsed: key.lastUsed,
            usageCount: key.usageCount,
            expiresAt: key.expiresAt,
            created: key.created
        }));

        res.json(keyList);

    } catch (error) {
        console.error('API key list error:', error);
        res.status(500).json({ message: 'Failed to retrieve API keys' });
    }
});

// Delete API key by keyId
router.delete('/:keyId', UnifiedAuth.authenticate, async (req, res) => {
    try {
        const { keyId } = req.params;
        const currentUserId = getUserId(req);

        const apiKey = await ApiKey.findOne({ 
            keyId: keyId,
            isActive: true 
        });
        
        if (!apiKey) {
            return res.status(404).json({ message: 'API key not found' });
        }

        // Check ownership (user can only delete own keys, admin can delete any)
        if (!isAdmin(req) && apiKey.userId !== currentUserId) {
            return res.status(403).json({ message: 'Cannot delete another user\'s API key' });
        }

        // Deactivate the key
        apiKey.isActive = false;
        await apiKey.save();

        res.json({ 
            message: 'API key deleted successfully',
            keyId: keyId,
            name: apiKey.name
        });

    } catch (error) {
        console.error('API key deletion error:', error);
        res.status(500).json({ message: 'Failed to delete API key' });
    }
});

// Update API key settings
router.put('/:keyId', UnifiedAuth.authenticate, async (req, res) => {
    try {
        const { keyId } = req.params;
        const { name, rateLimit, ipWhitelist } = req.body;
        const currentUserId = getUserId(req);

        const apiKey = await ApiKey.findOne({ keyId });
        
        if (!apiKey) {
            return res.status(404).json({ message: 'API key not found' });
        }

        // Check ownership
        if (!isAdmin(req) && apiKey.userId !== currentUserId) {
            return res.status(403).json({ message: 'Cannot modify another user\'s API key' });
        }

        // Update fields
        if (name) apiKey.name = name;
        if (rateLimit) {
            if (rateLimit.requestsPerMinute) {
                apiKey.rateLimit.requestsPerMinute = Math.min(rateLimit.requestsPerMinute, 1000);
            }
            if (rateLimit.requestsPerHour) {
                apiKey.rateLimit.requestsPerHour = Math.min(rateLimit.requestsPerHour, 10000);
            }
        }
        if (ipWhitelist && Array.isArray(ipWhitelist)) {
            apiKey.ipWhitelist = ipWhitelist;
        }

        await apiKey.save();

        res.json({ 
            message: 'API key updated successfully',
            keyId: keyId,
            name: apiKey.name,
            rateLimit: apiKey.rateLimit,
            ipWhitelist: apiKey.ipWhitelist
        });

    } catch (error) {
        console.error('API key update error:', error);
        res.status(500).json({ message: 'Failed to update API key' });
    }
});

// Get API key usage statistics
router.get('/:keyId/stats', UnifiedAuth.authenticate, async (req, res) => {
    try {
        const { keyId } = req.params;
        const currentUserId = getUserId(req);

        const apiKey = await ApiKey.findOne({ keyId });
        
        if (!apiKey) {
            return res.status(404).json({ message: 'API key not found' });
        }

        // Check ownership
        if (!isAdmin(req) && apiKey.userId !== currentUserId) {
            return res.status(403).json({ message: 'Cannot view another user\'s API key stats' });
        }

        res.json({
            keyId: keyId,
            name: apiKey.name,
            usageCount: apiKey.usageCount,
            lastUsed: apiKey.lastUsed,
            created: apiKey.created,
            isActive: apiKey.isActive,
            expiresAt: apiKey.expiresAt,
            rateLimit: apiKey.rateLimit
        });

    } catch (error) {
        console.error('API key stats error:', error);
        res.status(500).json({ message: 'Failed to retrieve API key stats' });
    }
});

// Admin: List all API keys
router.get('/admin/all', UnifiedAuth.authenticate, UnifiedAuth.requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const skip = (page - 1) * limit;

        const apiKeys = await ApiKey.find({})
            .select('-keyHash')
            .sort({ created: -1 })
            .skip(skip)
            .limit(limit);

        const total = await ApiKey.countDocuments({});

        const keyList = apiKeys.map(key => ({
            keyId: key.keyId,
            userId: key.userId,
            name: key.name,
            role: key.role,
            isActive: key.isActive,
            lastUsed: key.lastUsed,
            usageCount: key.usageCount,
            expiresAt: key.expiresAt,
            created: key.created
        }));

        res.json({
            apiKeys: keyList,
            pagination: {
                page: page,
                limit: limit,
                total: total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Admin API key list error:', error);
        res.status(500).json({ message: 'Failed to retrieve API keys' });
    }
});

module.exports = router;
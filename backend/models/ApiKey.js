const mongoose = require('mongoose');
const crypto = require('crypto');

const ApiKeySchema = new mongoose.Schema({
    keyId: {
        type: String,
        required: true,
        unique: true
    },
    keyHash: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: String,
        required: true,
        ref: 'User'
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        required: true,
        enum: ['user', 'admin', 'service'],
        default: 'user'
    },
    permissions: [{
        type: String,
        enum: [
            'users.read',
            'users.write', 
            'users.admin',
            'playlists.read',
            'playlists.write',
            'tracks.read',
            'preferences.read',
            'preferences.write',
            'nowplaying.read',
            'nowplaying.write',
            'admin.users.read',
            'admin.users.write',
            'admin.system.read'
        ]
    }],
    prefix: {
        type: String,
        required: true,
        enum: ['nsk_live', 'nsk_test'],
        default: 'nsk_live'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastUsed: {
        type: Date,
        default: null
    },
    usageCount: {
        type: Number,
        default: 0
    },
    rateLimit: {
        requestsPerMinute: {
            type: Number,
            default: 100
        },
        requestsPerHour: {
            type: Number,
            default: 1000
        }
    },
    ipWhitelist: [{
        type: String,
        validate: {
            validator: function(v) {
                return /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(v) || v === '*';
            },
            message: 'Invalid IP address or CIDR notation'
        }
    }],
    expiresAt: {
        type: Date,
        default: null // null = never expires
    },
    created: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: String,
        required: true
    }
});

// Indexes for performance
ApiKeySchema.index({ keyHash: 1 });
ApiKeySchema.index({ userId: 1 });
ApiKeySchema.index({ isActive: 1 });
ApiKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to generate API key
ApiKeySchema.statics.generateApiKey = function(prefix = 'nsk_live') {
    const randomBytes = crypto.randomBytes(32);
    const keyId = randomBytes.slice(0, 8).toString('hex');
    const keySecret = randomBytes.slice(8).toString('hex');
    const fullKey = `${prefix}_${keyId}${keySecret}`;
    
    return {
        keyId,
        fullKey,
        keyHash: crypto.createHash('sha256').update(fullKey).digest('hex')
    };
};

// Static method to hash API key for lookup
ApiKeySchema.statics.hashApiKey = function(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
};

// Method to check if key has permission
ApiKeySchema.methods.hasPermission = function(permission) {
    return this.permissions.includes(permission);
};

// Method to check if key can access resource
ApiKeySchema.methods.canAccess = function(resource, action, targetUserId = null) {
    const permission = `${resource}.${action}`;
    
    // Check basic permission
    if (!this.hasPermission(permission)) {
        return false;
    }
    
    // For user-level permissions, check ownership
    if (this.role === 'user' && targetUserId && this.userId !== targetUserId) {
        return false;
    }
    
    // Admin can access everything
    if (this.role === 'admin') {
        return true;
    }
    
    return true;
};

// Method to get default permissions by role
ApiKeySchema.statics.getDefaultPermissions = function(role) {
    switch (role) {
    case 'user':
        return [
            'users.read',
            'playlists.read',
            'playlists.write',
            'tracks.read',
            'preferences.read',
            'preferences.write',
            'nowplaying.read',
            'nowplaying.write'
        ];
    case 'admin':
        return [
            'users.read',
            'users.write',
            'playlists.read',
            'playlists.write',
            'tracks.read',
            'preferences.read',
            'preferences.write',
            'nowplaying.read',
            'nowplaying.write',
            'admin.users.read',
            'admin.users.write',
            'admin.system.read'
        ];
    case 'service':
        return [
            'users.read',
            'playlists.read',
            'tracks.read',
            'nowplaying.read'
        ];
    default:
        return [];
    }
};

// Update usage statistics
ApiKeySchema.methods.recordUsage = function() {
    this.lastUsed = new Date();
    this.usageCount += 1;
    return this.save();
};

module.exports = mongoose.model('ApiKey', ApiKeySchema);
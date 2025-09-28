const mongoose = require('mongoose');
const crypto = require('crypto');

const userSessionSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    sessionToken: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    deviceInfo: {
        userAgent: String,
        ip: String,
        platform: String
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expireAfterSeconds: 0 } // MongoDB TTL index for automatic cleanup
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

// Static method to create session with appropriate duration
userSessionSchema.statics.createSession = function(userId, isAdmin = false, deviceInfo = {}) {
    const sessionDuration = isAdmin ? 90 * 24 * 60 * 60 * 1000 : 90 * 24 * 60 * 60 * 1000; // 90 days for both admin and regular users
    const expiresAt = new Date(Date.now() + sessionDuration);
    
    // Generate cryptographically secure session token
    const sessionToken = `nss_${crypto.randomBytes(32).toString('hex')}`;
    
    return new this({
        userId,
        sessionToken,
        deviceInfo,
        isAdmin,
        expiresAt
    });
};

// Method to check if session is valid
userSessionSchema.methods.isValid = function() {
    const isActive = this.isActive;
    const currentTime = new Date();
    const isNotExpired = currentTime < this.expiresAt;
    const isValid = isActive && isNotExpired;
    
    // TEMPORARILY COMMENTED OUT - Testing if this fixes auth issues
    // Simple admin-only debug logging check
    /*
    try {
        const FeatureFlag = require('./FeatureFlag');
        const flag = await FeatureFlag.findOne({ 
            name: 'debug_authentication_logging',
            enabled: true 
        });
        const debugAuthLogging = flag && flag.enabled;
        
        if (debugAuthLogging && !isValid) {
            console.log('==== SESSION VALIDATION DEBUG ====');
            console.log('📋 [AUTH-DEBUG] Session invalid for', this.userId, 'isActive:', isActive, 'expired:', !isNotExpired);
            console.log('===================================');
        }
    } catch (flagError) {
        // Ignore feature flag errors in validation
    }
    */
    
    return isValid;
};

// Method to update last active time
userSessionSchema.methods.updateActivity = function() {
    this.lastActive = new Date();
    return this.save();
};


// Static method to cleanup expired sessions
userSessionSchema.statics.cleanupExpired = function() {
    return this.deleteMany({
        $or: [
            { expiresAt: { $lt: new Date() } },
            { isActive: false }
        ]
    });
};

// Static method to revoke all sessions for a user
userSessionSchema.statics.revokeUserSessions = function(userId) {
    return this.updateMany(
        { userId },
        { isActive: false }
    );
};

const UserSession = mongoose.model('UserSession', userSessionSchema);

module.exports = UserSession;
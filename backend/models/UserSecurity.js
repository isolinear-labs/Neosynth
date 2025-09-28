const mongoose = require('mongoose');

const TrustedDeviceSchema = new mongoose.Schema({
    deviceFingerprint: {
        type: String,
        required: true
    },
    deviceInfo: {
        type: String,
        required: true
    },
    deviceToken: {
        type: String,
        required: true
    },
    lastUsed: {
        type: Date,
        default: Date.now
    },
    created: {
        type: Date,
        default: Date.now
    },
    name: {
        type: String,
        default: 'Unknown Device'
    }
});

const UserSecuritySchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        ref: 'User'
    },
    backupCodes: [{
        code: {
            type: String,
            required: true
        },
        used: {
            type: Boolean,
            default: false
        },
        usedAt: {
            type: Date,
            default: null
        }
    }],
    trustedDevices: [TrustedDeviceSchema],
    tempCodes: [{
        code: {
            type: String,
            required: true
        },
        expiresAt: {
            type: Date,
            required: true
        },
        used: {
            type: Boolean,
            default: false
        }
    }],
    created: {
        type: Date,
        default: Date.now
    },
    lastSecurityUpdate: {
        type: Date,
        default: Date.now
    }
});

UserSecuritySchema.index({ userId: 1 });
UserSecuritySchema.index({ 'tempCodes.expiresAt': 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('UserSecurity', UserSecuritySchema);
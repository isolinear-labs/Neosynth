const mongoose = require('mongoose');

const UserAuthSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        ref: 'User'
    },
    passwordHash: {
        type: String,
        required: false
    },
    salt: {
        type: String,
        required: false
    },
    totpSecretEncrypted: {
        type: String,
        required: false
    },
    created: {
        type: Date,
        default: Date.now
    },
    lastPasswordChange: {
        type: Date,
        default: Date.now
    }
});

UserAuthSchema.index({ userId: 1 });

module.exports = mongoose.model('UserAuth', UserAuthSchema);
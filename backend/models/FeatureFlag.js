const mongoose = require('mongoose');

const FeatureFlagSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    enabled: {
        type: Boolean,
        default: false
    },
    rolloutPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    conditions: {
        userRoles: {
            type: [String],
            default: [],
            enum: ['admin', 'user']
        },
        userIds: {
            type: [String],
            default: []
        }
    },
    created: {
        type: Date,
        default: Date.now
    },
    updated: {
        type: Date,
        default: Date.now
    },
    // New optional fields for modular system
    category: {
        type: String,
        default: 'general',
        trim: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
});

FeatureFlagSchema.pre('save', function(next) {
    this.updated = Date.now();
    next();
});

module.exports = mongoose.model('FeatureFlag', FeatureFlagSchema);
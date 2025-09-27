const mongoose = require('mongoose');

const PlayHistorySchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    trackUrl: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return /^(https?):\/\/[^\s/$.?#].[^\s]*$/.test(v);
            },
            message: props => `${props.value} is not a valid URL!`
        }
    },
    trackName: {
        type: String,
        required: true
    },
    playCount: {
        type: Number,
        default: 1,
        min: 1
    },
    lastPlayed: {
        type: Date,
        default: Date.now
    },
    playedInCurrentSession: {
        type: Boolean,
        default: false
    },
    sessionId: {
        type: String,
        default: null
    },
    created: {
        type: Date,
        default: Date.now
    },
    updated: {
        type: Date,
        default: Date.now
    }
});

// Compound index for efficient queries
PlayHistorySchema.index({ userId: 1, trackUrl: 1 }, { unique: true });
PlayHistorySchema.index({ userId: 1, lastPlayed: -1 });
PlayHistorySchema.index({ userId: 1, playCount: -1 });

module.exports = mongoose.model('PlayHistory', PlayHistorySchema);
const mongoose = require('mongoose');

const TrackSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    duration: {
        type: Number,
        default: null
    },
    volume_multiplier: {
        type: Number,
        default: 1,
        min: 0.5,
        max: 3
    }
});

const PlaylistSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    userId: {
        type: String,
        required: true,
        default: 'anonymous' //  Link to user authentication when we implement
    },
    tracks: [TrackSchema],
    created: {
        type: Date,
        default: Date.now
    },
    updated: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Playlist', PlaylistSchema);
const mongoose = require('mongoose');

const NowPlayingSchema = new mongoose.Schema({
    playListId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PlayList',
        default: null
    },
    trackUrl: {
        type: String,
        validate: {
            validator: function(v) {
                return v === null || /^(https?):\/\/[^\s/$.?#].[^\s]*$/.test(v);
            },
            message: props => `${props.value} is not a valid URL!`
        },
        default: null
    },
    trackName: {
        type: String,
        default: null
    },
    position: {
        type: Number,
        min: 0,
        default: 0
    },
    isPlaying: {
        type: Boolean,
        default: false
    },
    updated: {
        type: Date,
        default: Date.now
    }
});


const PreferencesSchema = new mongoose.Schema({
    shuffleEnabled: {
        type: Boolean,
        default: false
    },
    volume: {
        type: Number,
        default: 100,
        min: 0,
        max: 100
    },
    theme : {
        type: String,
        default: 'default',
        enum: ['default', 'vapor', 'synthwave', 'quantum', 'noir', 'mint', 'laser', 'toxic', 'hologram', 'matrix', 'cyber-glass']
    },
    videoDisplay: {
        type: Boolean,
        default: true
    }
});

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    userId: {
        type: String,
        required: true,
        unique: true
    },
    created: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date,
        default: Date.now
    },
    authEnabled: {
        type: Boolean,
        default: true
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    preferences: {
        type: PreferencesSchema,
        default: () => ({})
    },
    nowPlaying: {
        type: NowPlayingSchema,
        default: () => ({})
    }
});

module.exports = mongoose.model('User', UserSchema);
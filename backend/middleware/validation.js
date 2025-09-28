const mongoose = require('mongoose');
const sanitizeHtml = require('sanitize-html');

const sanitizeText = (text) => {
    if (typeof text !== 'string') return text;

    // Use sanitize-html but preserve most characters - only remove dangerous HTML
    return sanitizeHtml(text, {
        allowedTags: [], // No HTML tags allowed at all
        allowedAttributes: {},
        disallowedTagsMode: 'discard', // Remove tags but keep content: <b>hello</b> becomes hello
        textFilter: function(text) {
            // Keep emojis, unicode, special chars - just remove HTML
            return text;
        }
    }).trim();
};

const validateObjectId = (req, res, next) => {
    const { id } = req.params;
    if (id && !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid ID format' });
    }
    next();
};

const validateUserId = (req, res, next) => {
    const { userId } = req.params;
    if (!userId || typeof userId !== 'string' || userId.length > 50) {
        return res.status(400).json({ message: 'Invalid user ID' });
    }
    req.params.userId = sanitizeText(userId);
    next();
};

const validateTrackName = (req, res, next) => {
    const { trackName } = req.params;
    if (!trackName || typeof trackName !== 'string' || trackName.length > 200) {
        return res.status(400).json({ message: 'Invalid track name' });
    }
    req.params.trackName = sanitizeText(trackName);
    next();
};

const validatePlaylist = (req, res, next) => {
    // Validate playlist name
    if (!req.body.name || typeof req.body.name !== 'string' || req.body.name.length > 100) {
        return res.status(400).json({ message: 'Name must be a string (1-100 characters)' });
    }
    
    // Validate userId if provided
    const userId = req.body.userId || 'anonymous';
    if (typeof userId !== 'string' || userId.length > 50) {
        return res.status(400).json({ message: 'User ID must be string (max 50 characters)' });
    }
    
    // Validate tracks array if provided
    const tracks = req.body.tracks || [];
    if (!Array.isArray(tracks)) {
        return res.status(400).json({ message: 'Tracks must be an array' });
    }
    
    // Validate each track in the array
    for (const track of tracks) {
        if (!track.name || !track.url || typeof track.name !== 'string' || typeof track.url !== 'string') {
            return res.status(400).json({ message: 'Each track must have name and url as strings' });
        }
        if (track.name.length > 200 || track.url.length > 500) {
            return res.status(400).json({ message: 'Track name (max 200) or URL (max 500) too long' });
        }
        if (track.duration !== null && track.duration !== undefined && (typeof track.duration !== 'number' || track.duration < 0)) {
            return res.status(400).json({ message: 'Track duration must be null or non-negative number' });
        }
        if (track.volume_multiplier !== null && track.volume_multiplier !== undefined && 
            (typeof track.volume_multiplier !== 'number' || track.volume_multiplier < 0.5 || track.volume_multiplier > 3)) {
            return res.status(400).json({ message: 'Track volume_multiplier must be a number between 0.5 and 3' });
        }
    }
    
    // Sanitize inputs
    req.body.name = sanitizeText(req.body.name);
    req.body.userId = sanitizeText(userId);
    req.body.tracks = tracks.map(track => ({
        name: sanitizeText(track.name),
        url: track.url.trim(),
        duration: track.duration || null,
        volume_multiplier: track.volume_multiplier || 1
    }));
    
    next();
};

const validatePlaylistUpdate = (req, res, next) => {
    // Validate name if provided
    if (req.body.name !== undefined) {
        if (typeof req.body.name !== 'string' || req.body.name.length === 0 || req.body.name.length > 100) {
            return res.status(400).json({ message: 'Name must be a string (1-100 characters)' });
        }
        req.body.name = sanitizeText(req.body.name);
    }
    
    // Validate tracks if provided
    if (req.body.tracks !== undefined) {
        if (!Array.isArray(req.body.tracks)) {
            return res.status(400).json({ message: 'Tracks must be an array' });
        }
        
        // Validate each track
        for (const track of req.body.tracks) {
            if (!track.name || !track.url || typeof track.name !== 'string' || typeof track.url !== 'string') {
                return res.status(400).json({ message: 'Each track must have name and url as strings' });
            }
            if (track.name.length > 200 || track.url.length > 500) {
                return res.status(400).json({ message: 'Track name (max 200) or URL (max 500) too long' });
            }
            if (track.duration !== null && track.duration !== undefined && (typeof track.duration !== 'number' || track.duration < 0)) {
                return res.status(400).json({ message: 'Track duration must be null or non-negative number' });
            }
            if (track.volume_multiplier !== null && track.volume_multiplier !== undefined && 
                (typeof track.volume_multiplier !== 'number' || track.volume_multiplier < 0.5 || track.volume_multiplier > 3)) {
                return res.status(400).json({ message: 'Track volume_multiplier must be a number between 0.5 and 3' });
            }
        }
        
        // Sanitize tracks
        req.body.tracks = req.body.tracks.map(track => ({
            name: sanitizeText(track.name),
            url: track.url.trim(),
            duration: track.duration || null,
            volume_multiplier: track.volume_multiplier || 1
        }));
    }
    
    next();
};

const validateUser = (req, res, next) => {
    // Check for unexpected fields
    const allowedFields = ['username', 'isAdmin'];
    const providedFields = Object.keys(req.body);
    const unexpectedFields = providedFields.filter(field => !allowedFields.includes(field));
    
    if (unexpectedFields.length > 0) {
        return res.status(400).json({ message: `Unexpected fields: ${unexpectedFields.join(', ')}. Only 'username' and 'isAdmin' are allowed.` });
    }
    
    // Validate username
    if (!req.body.username || typeof req.body.username !== 'string') {
        return res.status(400).json({ message: 'Username is required and must be a string' });
    }
    if (req.body.username.length < 3 || req.body.username.length > 20) {
        return res.status(400).json({ message: 'Username must be 3-20 characters' });
    }
    
    // Sanitize username
    req.body.username = req.body.username.trim();
    
    // Validate isAdmin if provided
    if (req.body.isAdmin !== undefined) {
        if (typeof req.body.isAdmin !== 'boolean') {
            return res.status(400).json({ message: 'isAdmin must be a boolean value' });
        }
    }
    
    // Generate userId as lowercase username
    req.body.userId = req.body.username.toLowerCase();
    
    next();
};

const validatePreferences = (req, res, next) => {
    // Ensure at least one field is being updated
    if (req.body.shuffleEnabled === undefined && req.body.volume === undefined && req.body.theme === undefined) {
        return res.status(400).json({ message: 'At least one preference field must be provided' });
    }
    
    // Validate shuffleEnabled
    if (req.body.shuffleEnabled !== undefined && typeof req.body.shuffleEnabled !== 'boolean') {
        return res.status(400).json({ message: 'shuffleEnabled must be a boolean' });
    }
    
    // Validate volume
    if (req.body.volume !== undefined) {
        if (typeof req.body.volume !== 'number' || req.body.volume < 0 || req.body.volume > 100) {
            return res.status(400).json({ message: 'Volume must be a number between 0 and 100' });
        }
    }
    
    // Validate theme format (let MongoDB handle specific theme names)
    if (req.body.theme !== undefined) {
        if (typeof req.body.theme !== 'string' || req.body.theme.length > 20) {
            return res.status(400).json({ message: 'Invalid theme format' });
        }
    }
    
    next();
};

const validateTheme = (req, res, next) => {
    // Basic format validation (let MongoDB handle specific theme validation)
    if (!req.params.theme || typeof req.params.theme !== 'string' || req.params.theme.length > 20) {
        return res.status(400).json({ message: 'Invalid theme format' });
    }
    next();
};

const validateNowPlaying = (req, res, next) => {
    const nowPlaying = {};

    // Validate playListId
    if (req.body.playListId !== undefined) {
        if (req.body.playListId !== null && !mongoose.Types.ObjectId.isValid(req.body.playListId)) {
            return res.status(400).json({ message: 'Invalid playlist ID format' });
        }
        nowPlaying.playListId = req.body.playListId;
    }

    // Validate trackUrl
    if (req.body.trackUrl !== undefined) {
        if (req.body.trackUrl !== null) {
            if (typeof req.body.trackUrl !== 'string' || req.body.trackUrl.length > 500) {
                return res.status(400).json({ message: 'Track URL must be string (max 500 chars)' });
            }
            // Basic URL validation
            try { new URL(req.body.trackUrl); } catch {
                return res.status(400).json({ message: 'Invalid track URL format' });
            }
        }
        nowPlaying.trackUrl = req.body.trackUrl;
    }

    // Validate trackName
    if (req.body.trackName !== undefined) {
        if (req.body.trackName !== null) {
            if (typeof req.body.trackName !== 'string' || req.body.trackName.length > 200) {
                return res.status(400).json({ message: 'Track name must be string (max 200 chars)' });
            }
            nowPlaying.trackName = sanitizeText(req.body.trackName);
        } else {
            nowPlaying.trackName = null;
        }
    }

    // Validate position
    if (req.body.position !== undefined) {
        if (typeof req.body.position !== 'number' || req.body.position < 0) {
            return res.status(400).json({ message: 'Position must be non-negative number' });
        }
        nowPlaying.position = req.body.position;
    }

    // Validate isPlaying
    if (req.body.isPlaying !== undefined) {
        if (typeof req.body.isPlaying !== 'boolean') {
            return res.status(400).json({ message: 'isPlaying must be boolean' });
        }
        nowPlaying.isPlaying = req.body.isPlaying;
    }

    // Replace req.body with validated fields only
    req.body = nowPlaying;
    next();
};

module.exports = {
    validateObjectId,
    validateUserId,
    validateTrackName,
    validatePlaylist,
    validatePlaylistUpdate,
    validateUser,
    validatePreferences,
    validateTheme,
    validateNowPlaying,
    sanitizeText
};
const express = require('express');
const router = express.Router();
const Playlist = require('../models/Playlist');
const { validateTrackName } = require('../middleware/validation');
const UnifiedAuth = require('../middleware/unifiedAuth');

// Helper function to get user ID from either auth type
function getUserId(req) {
    return req.authType === 'session' ? req.userId : req.apiKey?.userId;
}

// Helper function to check if user is admin
function isAdmin(req) {
    return req.authType === 'session' ? req.isAdmin : req.apiKey?.role === 'admin';
}


// Search tracks by name (requires authentication)
router.get('/:trackName', 
    UnifiedAuth.authenticate,
    validateTrackName, 
    async (req, res) => {
        try {
            // Escape special regex characters to prevent ReDoS attacks (trackName already validated by middleware)
            const escapedTrackName = req.params.trackName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // For non-admin users, only search in their own playlists
            const currentUserId = getUserId(req);
            const userIsAdmin = isAdmin(req);
            const matchCondition = userIsAdmin 
                ? { 'tracks.name': new RegExp(escapedTrackName, 'i') }
                : { 
                    'tracks.name': new RegExp(escapedTrackName, 'i'),
                    'userId': currentUserId 
                };
            
            const tracks = await Playlist.aggregate([
                { $unwind: '$tracks' },
                { $match: matchCondition },
                {
                    $project: {
                        PlaylistName: '$name',
                        userId: '$userId',
                        trackUrl: '$tracks.url',
                        trackName: '$tracks.name',
                        trackDuration: '$tracks.duration'
                    }
                }
            ]);
            
            res.json({
                tracks: tracks,
                total: tracks.length,
                searchTerm: req.params.trackName
            });
        } catch (err) {
            console.error('Error fetching tracks:', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);
module.exports = router;
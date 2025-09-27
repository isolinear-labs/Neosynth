const express = require('express');
const router = express.Router();
const Playlist = require('../models/Playlist');
const { validateUserId, validateObjectId, validatePlaylist, validatePlaylistUpdate } = require('../middleware/validation');
const UnifiedAuth = require('../middleware/unifiedAuth');

// Helper function to get user ID from either auth type
function getUserId(req) {
    return req.authType === 'session' ? req.userId : req.apiKey?.userId;
}

// Helper function to get identifier for logging
function getRequestIdentifier(req) {
    return req.authType === 'session' ? `user:${req.userId}` : `apikey:${req.apiKey?.name}`;
}

// Get all unique user IDs (admin only)
router.get('/users', 
    UnifiedAuth.authenticate,
    UnifiedAuth.requireAdmin,
    async (req, res) => {
        try {
            const users = await Playlist.distinct('userId');
            res.json({
                users: users,
                total: users.length,
                requestedBy: getRequestIdentifier(req)
            });
        } catch (err) {
            console.error('Error fetching users:', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

// Get all playlists for a user (user can access own, admin can access any)
router.get('/:userId', 
    UnifiedAuth.authenticate,
    UnifiedAuth.requireOwnership('userId'),
    validateUserId, 
    async (req, res) => {
        try {
            const playlists = await Playlist.find({ userId: req.params.userId });
            res.json(playlists);
        } catch (err) {
            console.error('Error fetching playlists:', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

// Get a single playlist by ID (requires playlist ownership check)
router.get('/detail/:id', 
    UnifiedAuth.authenticate,
    validateObjectId, 
    async (req, res) => {
        try {
            const playlist = await Playlist.findById(req.params.id);
            if (!playlist) {
                return res.status(404).json({ message: 'Playlist not found' });
            }
            
            // Check ownership (user can only see own playlists, admin can see all)
            const currentUserId = getUserId(req);
            const isAdmin = req.authType === 'session' ? req.isAdmin : req.apiKey?.role === 'admin';
            if (!isAdmin && playlist.userId !== currentUserId) {
                return res.status(403).json({ message: 'Access denied to this playlist' });
            }
            
            res.json(playlist);
        } catch (err) {
            console.error('Error fetching playlist:', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

// Create a new playlist (user can create own, admin can create for anyone)
router.post('/', 
    UnifiedAuth.authenticate,
    validatePlaylist, 
    async (req, res) => {
        try {
            // Ensure user can only create playlists for themselves (unless admin)
            const currentUserId = getUserId(req);
            const isAdmin = req.authType === 'session' ? req.isAdmin : req.apiKey?.role === 'admin';
            if (!isAdmin && req.body.userId !== currentUserId) {
                return res.status(403).json({ message: 'Cannot create playlist for another user' });
            }
            
            const newPlaylist = new Playlist(req.body);
            const playlist = await newPlaylist.save();
            res.status(201).json(playlist);
        } catch (err) {
            console.error('Error creating playlist:', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

// Update a playlist (requires ownership)
router.put('/:id', 
    UnifiedAuth.authenticate,
    validateObjectId, 
    validatePlaylistUpdate, 
    async (req, res) => {
        try {
            const playlist = await Playlist.findById(req.params.id);
            
            if (!playlist) {
                return res.status(404).json({ message: 'Playlist not found' });
            }
            
            // Check ownership
            const currentUserId = getUserId(req);
            const isAdmin = req.authType === 'session' ? req.isAdmin : req.apiKey?.role === 'admin';
            if (!isAdmin && playlist.userId !== currentUserId) {
                return res.status(403).json({ message: 'Access denied to this playlist' });
            }
            
            // Update playlist fields
            if (req.body.name !== undefined) playlist.name = req.body.name;
            if (req.body.tracks !== undefined) playlist.tracks = req.body.tracks;
            playlist.updated = Date.now();
            
            const updatedPlaylist = await playlist.save();
            res.json(updatedPlaylist);
        } catch (err) {
            console.error('Error updating playlist:', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

// Delete a playlist (requires ownership)
router.delete('/:id', 
    UnifiedAuth.authenticate,
    validateObjectId, 
    async (req, res) => {
        try {
            const playlist = await Playlist.findById(req.params.id);
            
            if (!playlist) {
                return res.status(404).json({ message: 'Playlist not found' });
            }
            
            // Check ownership
            const currentUserId = getUserId(req);
            const isAdmin = req.authType === 'session' ? req.isAdmin : req.apiKey?.role === 'admin';
            if (!isAdmin && playlist.userId !== currentUserId) {
                return res.status(403).json({ message: 'Access denied to this playlist' });
            }
            
            await playlist.deleteOne();
            res.json({ message: 'Playlist removed' });
        } catch (err) {
            console.error('Error deleting playlist:', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

module.exports = router;
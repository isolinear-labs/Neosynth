const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { validateUserId, validateNowPlaying } = require('../middleware/validation');
const UnifiedAuth = require('../middleware/unifiedAuth');


// Save now playing state
router.put('/nowplaying/:userId', 
    UnifiedAuth.authenticate,
    UnifiedAuth.requireOwnership('userId'),
    validateUserId, 
    validateNowPlaying, 
    async (req, res) => {
        try {
            const user = await User.findOne({ userId: req.params.userId });
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            // Update now playing state with validated fields
            Object.assign(user.nowPlaying, req.body);
            user.nowPlaying.updated = Date.now();
        
            const updatedUser = await user.save();
            res.json(updatedUser.nowPlaying);
        
        } catch (err) {
            console.error('Error updating now playing state:', err);
            res.status(500).json({ message: 'Server error' });
        }
    });

// GET now playing state
router.get('/nowplaying/:userId', 
    UnifiedAuth.authenticate,
    UnifiedAuth.requireOwnership('userId'),
    validateUserId, 
    async (req, res) => {
        try {
            const user = await User.findOne({ userId: req.params.userId });
        
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
        
            res.json(user.nowPlaying || {});
        } catch (err) {
            console.error('Error fetching now playing state:', err);
            res.status(500).json({ message: 'Server error' });
        }
    });

module.exports = router;
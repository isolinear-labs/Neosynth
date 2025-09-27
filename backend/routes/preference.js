const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { validateUserId, validatePreferences } = require('../middleware/validation');
const UnifiedAuth = require('../middleware/unifiedAuth');


// Get user preferences
router.get('/users/:userId/preferences', 
    UnifiedAuth.authenticate,
    UnifiedAuth.requireOwnership('userId'),
    validateUserId, 
    async (req, res) => {
        try {
            const user = await User.findOne({ userId: req.params.userId });
        
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Return user preferences
            res.json(user.preferences);
        } catch (err) {
            console.error('Error fetching user preferences:', err);
            res.status(500).json({ message: 'Server error' });
        }
    });

// Save single pref
router.put('/users/:userId/preferences', 
    UnifiedAuth.authenticate,
    UnifiedAuth.requireOwnership('userId'),
    validateUserId, 
    validatePreferences, 
    async (req, res) => {
        try {
            const user = await User.findOne({ userId: req.params.userId });
        
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
        
            // Update specific preference(s)
            if (req.body.shuffleEnabled !== undefined) {
                user.preferences.shuffleEnabled = req.body.shuffleEnabled;
            }
        
            if (req.body.volume !== undefined) {
                user.preferences.volume = req.body.volume;
            }

            if (req.body.theme !== undefined) {
                user.preferences.theme = req.body.theme;
            }

            if (req.body.videoDisplay !== undefined) {
                user.preferences.videoDisplay = req.body.videoDisplay;
            }
        
            // Set the updated timestamp
            user.updated = Date.now();
        
            const updatedUser = await user.save();
            res.json(updatedUser.preferences);
        
        } catch (err) {
            console.error('Error updating user preferences:', err);
            res.status(500).json({ message: 'Server error' });
        }
    });

// Reset user preferences to defaults
router.delete('/users/:userId/preferences', 
    UnifiedAuth.authenticate,
    UnifiedAuth.requireOwnership('userId'),
    validateUserId, 
    async (req, res) => {
        try {
            const user = await User.findOne({ userId: req.params.userId });
        
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
        
            // Reset preferences to defaults
            user.preferences = {
                shuffleEnabled: false,
                volume: 100,
                theme: 'default',
                videoDisplay: true
            };
        
            // Set the updated timestamp
            user.updated = Date.now();
        
            const updatedUser = await user.save();
            res.json(updatedUser.preferences);
        
        } catch (err) {
            console.error('Error resetting user preferences:', err);
            res.status(500).json({ message: 'Server error' });
        }
    });

module.exports = router;
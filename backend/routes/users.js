const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { validateUserId, validateUser } = require('../middleware/validation');
const UnifiedAuth = require('../middleware/unifiedAuth');


// Helper function to get identifier for logging
function getRequestIdentifier(req) {
    return req.authType === 'session' ? `user:${req.userId}` : `apikey:${req.apiKey?.name}`;
}

// Get all users (admin only)
router.get('/', 
    UnifiedAuth.authenticate,
    UnifiedAuth.requireAdmin,
    async (req, res) => {
        try {
            const users = await User.find().select('-__v');
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

// Get a single user by ID (user can access own data, admin can access any)
router.get('/:userId', 
    UnifiedAuth.authenticate,
    UnifiedAuth.requireOwnership('userId'),
    validateUserId, 
    async (req, res) => {
        try {
            const user = await User.findOne({ userId: req.params.userId });
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json(user);
        } catch (err) {
            console.error('Error fetching user:', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

// Create a new user (admin only)
router.post('/', 
    UnifiedAuth.authenticate,
    UnifiedAuth.requireAdmin,
    validateUser, 
    async (req, res) => {
        try {
            // Check if user already exists
            const existingUser = await User.findOne({ 
                $or: [
                    { username: req.body.username },
                    { userId: req.body.userId }
                ]
            });
            
            if (existingUser) {
                return res.status(400).json({ message: 'Username or User ID already exists' });
            }
            
            const newUser = new User({
                username: req.body.username,
                userId: req.body.userId,
                isAdmin: req.body.isAdmin || false
            });
            
            const user = await newUser.save();
            res.status(201).json({
                user: user,
                createdBy: getRequestIdentifier(req)
            });
        } catch (err) {
            console.error('Error creating user:', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

// Update user last login (user can update own, admin can update any)
router.put('/:userId/login', 
    UnifiedAuth.authenticate,
    UnifiedAuth.requireOwnership('userId'),
    validateUserId, 
    async (req, res) => {
        try {
            const user = await User.findOne({ userId: req.params.userId });
            
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            
            // Update last login time
            user.lastLogin = Date.now();
            
            const updatedUser = await user.save();
            res.json(updatedUser);
        } catch (err) {
            console.error('Error updating user login time:', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

module.exports = router;
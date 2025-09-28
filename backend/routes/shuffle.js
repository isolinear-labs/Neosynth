const express = require('express');
const router = express.Router();
const PlayHistory = require('../models/PlayHistory');
const { validateUserId } = require('../middleware/validation');
const UnifiedAuth = require('../middleware/unifiedAuth');

// Record a track play
router.post('/users/:userId/shuffle/play', 
    UnifiedAuth.authenticate,
    UnifiedAuth.requireOwnership('userId'),
    validateUserId,
    async (req, res) => {
        try {
            const { trackUrl, trackName, sessionId } = req.body;
            
            if (!trackUrl || !trackName) {
                return res.status(400).json({ 
                    message: 'trackUrl and trackName are required' 
                });
            }

            // Find existing play history for this track
            let playHistory = await PlayHistory.findOne({
                userId: req.params.userId,
                trackUrl: trackUrl
            });

            if (playHistory) {
                // Update existing record
                playHistory.playCount += 1;
                playHistory.lastPlayed = new Date();
                playHistory.playedInCurrentSession = true;
                playHistory.sessionId = sessionId || null;
                playHistory.updated = new Date();
                await playHistory.save();
            } else {
                // Create new record
                playHistory = new PlayHistory({
                    userId: req.params.userId,
                    trackUrl: trackUrl,
                    trackName: trackName,
                    playCount: 1,
                    lastPlayed: new Date(),
                    playedInCurrentSession: true,
                    sessionId: sessionId || null
                });
                await playHistory.save();
            }

            res.json({
                message: 'Play recorded successfully',
                playCount: playHistory.playCount,
                lastPlayed: playHistory.lastPlayed
            });

        } catch (err) {
            console.error('Error recording play:', err);
            res.status(500).json({ message: 'Server error' });
        }
    });

// Get play history for shuffle algorithm
router.get('/users/:userId/shuffle/history', 
    UnifiedAuth.authenticate,
    UnifiedAuth.requireOwnership('userId'),
    validateUserId,
    async (req, res) => {
        try {
            const { tracks } = req.query;
            
            if (!tracks) {
                return res.status(400).json({ 
                    message: 'tracks parameter is required (comma-separated URLs)' 
                });
            }

            const trackUrls = tracks.split(',').map(url => url.trim());
            
            const playHistories = await PlayHistory.find({
                userId: req.params.userId,
                trackUrl: { $in: trackUrls }
            }).select('trackUrl playCount lastPlayed playedInCurrentSession');

            // Create a map for easy lookup
            const historyMap = {};
            playHistories.forEach(history => {
                historyMap[history.trackUrl] = {
                    playCount: history.playCount,
                    lastPlayed: history.lastPlayed,
                    playedInCurrentSession: history.playedInCurrentSession
                };
            });

            res.json(historyMap);

        } catch (err) {
            console.error('Error fetching play history:', err);
            res.status(500).json({ message: 'Server error' });
        }
    });

// Reset current session for all tracks
router.post('/users/:userId/shuffle/reset-session', 
    UnifiedAuth.authenticate,
    UnifiedAuth.requireOwnership('userId'),
    validateUserId,
    async (req, res) => {
        try {
            const { sessionId } = req.body;

            await PlayHistory.updateMany(
                { userId: req.params.userId },
                { 
                    playedInCurrentSession: false,
                    sessionId: sessionId || null,
                    updated: new Date()
                }
            );

            res.json({ message: 'Session reset successfully' });

        } catch (err) {
            console.error('Error resetting session:', err);
            res.status(500).json({ message: 'Server error' });
        }
    });

// Get shuffle statistics
router.get('/users/:userId/shuffle/stats', 
    UnifiedAuth.authenticate,
    UnifiedAuth.requireOwnership('userId'),
    validateUserId,
    async (req, res) => {
        try {
            const stats = await PlayHistory.aggregate([
                { $match: { userId: req.params.userId } },
                {
                    $group: {
                        _id: null,
                        totalTracks: { $sum: 1 },
                        totalPlays: { $sum: '$playCount' },
                        avgPlaysPerTrack: { $avg: '$playCount' },
                        maxPlays: { $max: '$playCount' },
                        minPlays: { $min: '$playCount' },
                        tracksPlayedInSession: {
                            $sum: { $cond: ['$playedInCurrentSession', 1, 0] }
                        }
                    }
                }
            ]);

            const result = stats.length > 0 ? stats[0] : {
                totalTracks: 0,
                totalPlays: 0,
                avgPlaysPerTrack: 0,
                maxPlays: 0,
                minPlays: 0,
                tracksPlayedInSession: 0
            };

            // Remove the _id field
            delete result._id;

            res.json(result);

        } catch (err) {
            console.error('Error fetching shuffle stats:', err);
            res.status(500).json({ message: 'Server error' });
        }
    });

// Get tracks ordered by play count (for debugging/analysis)
router.get('/users/:userId/shuffle/tracks', 
    UnifiedAuth.authenticate,
    UnifiedAuth.requireOwnership('userId'),
    validateUserId,
    async (req, res) => {
        try {
            const { sortBy = 'playCount', order = 'desc', limit = 50 } = req.query;
            
            const sortOrder = order === 'asc' ? 1 : -1;
            const sortField = {};
            sortField[sortBy] = sortOrder;

            const tracks = await PlayHistory.find({
                userId: req.params.userId
            })
                .sort(sortField)
                .limit(parseInt(limit))
                .select('trackUrl trackName playCount lastPlayed playedInCurrentSession');

            res.json(tracks);

        } catch (err) {
            console.error('Error fetching tracks:', err);
            res.status(500).json({ message: 'Server error' });
        }
    });

// Clear all play history (for testing/reset)
router.delete('/users/:userId/shuffle/history', 
    UnifiedAuth.authenticate,
    UnifiedAuth.requireOwnership('userId'),
    validateUserId,
    async (req, res) => {
        try {
            const result = await PlayHistory.deleteMany({
                userId: req.params.userId
            });

            res.json({ 
                message: 'Play history cleared successfully',
                deletedCount: result.deletedCount
            });

        } catch (err) {
            console.error('Error clearing play history:', err);
            res.status(500).json({ message: 'Server error' });
        }
    });

module.exports = router;
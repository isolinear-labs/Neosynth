// frontend/modules/shuffle/shuffleManager.js

/**
 * Robust Shuffle Manager for NeoSynth
 * Handles intelligent shuffle logic with backend API integration
 * Designed for hour-long tracks and large playlists
 */
import debug from '../debugLogger/debugLogger.js';

export class ShuffleManager {
    constructor() {
        this.API_URL = '/api';
        this.isEnabled = false;
        this.currentSessionId = this.generateSessionId();
        this.userId = null;
        this.showStatus = null;
    }

    /**
     * Initialize the shuffle manager
     * @param {Object} options - Configuration options
     */
    init(options = {}) {
        this.userId = options.userId;
        this.showStatus = options.showStatus || (() => {});
        debug.log('Shuffle manager initialized with backend API');
    }

    /**
     * Generate a unique session ID
     * @returns {string} Session ID
     */
    generateSessionId() {
        return 'shuffle_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    }

    /**
     * Record that a track was played
     * @param {string} trackUrl - URL of the played track
     * @param {string} trackName - Name of the played track
     * @returns {Promise<boolean>} Success status
     */
    async recordPlay(trackUrl, trackName) {
        if (!trackUrl || !trackName || !this.userId) {
            console.warn('Cannot record play: missing required data');
            return false;
        }

        try {
            const response = await window.apiCall(`${this.API_URL}/users/${this.userId}/shuffle/play`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    trackUrl: trackUrl,
                    trackName: trackName,
                    sessionId: this.currentSessionId
                })
            });

            if (response && response.ok) {
                const data = await response.json();
                console.log(`Play recorded for "${trackName}" (play count: ${data.playCount})`);
                return true;
            } else {
                console.error('Failed to record play:', response?.status);
                return false;
            }
        } catch (error) {
            console.error('Error recording play:', error);
            return false;
        }
    }

    /**
     * Get play history for tracks to calculate weights
     * @param {Array} playlist - Current playlist
     * @returns {Promise<Object>} Play history map
     */
    async getPlayHistory(playlist) {
        if (!playlist || playlist.length === 0 || !this.userId) {
            return {};
        }

        try {
            const trackUrls = playlist.map(track => encodeURIComponent(track.url)).join(',');
            const response = await window.apiCall(
                `${this.API_URL}/users/${this.userId}/shuffle/history?tracks=${trackUrls}`
            );

            if (response && response.ok) {
                return await response.json();
            } else {
                console.error('Failed to fetch play history:', response?.status);
                return {};
            }
        } catch (error) {
            console.error('Error fetching play history:', error);
            return {};
        }
    }

    /**
     * Calculate weights for tracks based on play history using mathematical rebalancing
     * @param {Array} availableIndices - Array of available track indices
     * @param {Array} playlist - Current playlist
     * @param {Object} playHistory - Play history map from API
     * @returns {Array} Array of weights corresponding to availableIndices
     */
    calculateWeights(availableIndices, playlist, playHistory) {
        if (!availableIndices || availableIndices.length === 0) {
            return [];
        }

        // Calculate average play count across all tracks in current playlist
        const allPlayCounts = playlist.map(track => {
            const history = playHistory[track.url] || {};
            return history.playCount || 0;
        });
        const avgPlayCount = allPlayCounts.reduce((sum, count) => sum + count, 0) / allPlayCounts.length;

        const weights = availableIndices.map(index => {
            const track = playlist[index];
            if (!track) return 0;

            const history = playHistory[track.url] || {};
            const playCount = history.playCount || 0;
            
            // Base weight using mathematical rebalancing
            // Formula: weight = baseWeight * (avgPlayCount + 1) / (trackPlayCount + 1)
            // This auto-balances based on playlist's play history and avoids division by zero
            let weight = 1.0 * (avgPlayCount + 1) / (playCount + 1);

            // Factor 2: Session tracking (strong penalty for tracks played in current session)
            if (history.playedInCurrentSession) {
                weight *= 0.1; // Very low weight for already played tracks in this session
            }

            return Math.max(weight, 0.001); // Ensure minimum weight
        });

        return weights;
    }

    /**
     * Select next track using weighted random selection
     * @param {Array} availableIndices - Array of available track indices
     * @param {Array} playlist - Current playlist
     * @returns {Promise<number>} Selected track index
     */
    async selectNextTrack(availableIndices, playlist) {
        if (!availableIndices || availableIndices.length === 0) {
            return -1;
        }

        if (availableIndices.length === 1) {
            return availableIndices[0];
        }

        // Get play history from backend
        const playHistory = await this.getPlayHistory(playlist);
        
        // Calculate weights
        const weights = this.calculateWeights(availableIndices, playlist, playHistory);
        
        // Use weighted random selection
        return this.weightedRandomSelection(availableIndices, weights);
    }

    /**
     * Weighted random selection algorithm
     * @param {Array} items - Array of items to select from
     * @param {Array} weights - Array of weights corresponding to items
     * @returns {*} Selected item
     */
    weightedRandomSelection(items, weights) {
        if (items.length !== weights.length) {
            console.error('Items and weights arrays must have the same length');
            return items[Math.floor(Math.random() * items.length)];
        }

        // Calculate total weight
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        
        if (totalWeight === 0) {
            // All weights are zero, use random selection
            return items[Math.floor(Math.random() * items.length)];
        }

        // Generate random value
        const randomValue = Math.random() * totalWeight;
        let weightSum = 0;

        // Find the item that corresponds to this random value
        for (let i = 0; i < items.length; i++) {
            weightSum += weights[i];
            if (randomValue <= weightSum) {
                return items[i];
            }
        }

        // Fallback (should rarely happen)
        return items[items.length - 1];
    }

    /**
     * Reset current session for all tracks
     * @returns {Promise<boolean>} Success status
     */
    async resetCurrentSession() {
        if (!this.userId) {
            console.warn('Cannot reset session: no user ID');
            return false;
        }

        try {
            // Generate new session ID
            this.currentSessionId = this.generateSessionId();

            const response = await window.apiCall(`${this.API_URL}/users/${this.userId}/shuffle/reset-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: this.currentSessionId
                })
            });

            if (response && response.ok) {
                debug.log('Shuffle session reset successfully');
                return true;
            } else {
                console.error('Failed to reset shuffle session:', response?.status);
                return false;
            }
        } catch (error) {
            console.error('Error resetting shuffle session:', error);
            return false;
        }
    }

    /**
     * Get shuffle statistics
     * @returns {Promise<Object>} Statistics object
     */
    async getStatistics() {
        if (!this.userId) {
            return {
                totalTracks: 0,
                totalPlays: 0,
                avgPlaysPerTrack: 0,
                maxPlays: 0,
                minPlays: 0,
                tracksPlayedInSession: 0
            };
        }

        try {
            const response = await window.apiCall(`${this.API_URL}/users/${this.userId}/shuffle/stats`);

            if (response && response.ok) {
                return await response.json();
            } else {
                console.error('Failed to fetch shuffle statistics:', response?.status);
                return {};
            }
        } catch (error) {
            console.error('Error fetching shuffle statistics:', error);
            return {};
        }
    }

    /**
     * Clear all play history (for testing/reset)
     * @returns {Promise<boolean>} Success status
     */
    async clearPlayHistory() {
        if (!this.userId) {
            console.warn('Cannot clear play history: no user ID');
            return false;
        }

        try {
            const response = await window.apiCall(`${this.API_URL}/users/${this.userId}/shuffle/history`, {
                method: 'DELETE'
            });

            if (response && response.ok) {
                const data = await response.json();
                console.log(`Play history cleared: ${data.deletedCount} records deleted`);
                this.showStatus(`Play history cleared (${data.deletedCount} records)`);
                return true;
            } else {
                console.error('Failed to clear play history:', response?.status);
                return false;
            }
        } catch (error) {
            console.error('Error clearing play history:', error);
            return false;
        }
    }

    /**
     * Enable shuffle mode
     */
    enable() {
        this.isEnabled = true;
        this.resetCurrentSession(); // Fresh start when enabling
        debug.log('Shuffle enabled');
    }

    /**
     * Disable shuffle mode
     */
    disable() {
        this.isEnabled = false;
        debug.log('Shuffle disabled');
    }

    /**
     * Check if shuffle is enabled
     * @returns {boolean} True if shuffle is enabled
     */
    get enabled() {
        return this.isEnabled;
    }

    /**
     * Get current session ID
     * @returns {string} Current session ID
     */
    get sessionId() {
        return this.currentSessionId;
    }
}
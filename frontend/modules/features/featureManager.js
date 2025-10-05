/**
 * Feature Flag Manager Module
 * Manages feature flags and provides easy access to feature status
 */

import debug from '../debugLogger/debugLogger.js';

export class FeatureManager {
    constructor() {
        this.flags = new Map();
        this.userId = null;
        this.isInitialized = false;
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes
        this.lastFetch = 0;
        this.eventSource = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    /**
     * Initialize the feature manager
     * @param {Object} options - Configuration options
     */
    async init(options = {}) {
        this.userId = options.userId;
        
        if (this.userId) {
            await this.loadFeatureFlags();
            this.setupSSE();
        } else {
            // Load from localStorage if available
            this.loadFromCache();
        }
        
        this.isInitialized = true;
        debug.log('Feature manager initialized');
    }

    /**
     * Check if a feature flag is enabled for the current user
     * @param {string} flagName - Name of the feature flag
     * @returns {boolean} True if feature is enabled
     */
    isEnabled(flagName) {
        if (!this.isInitialized) {
            // Silently return false if not initialized (normal during app startup)
            return false;
        }

        return this.flags.get(flagName) === true;
    }

    /**
     * Check multiple feature flags at once
     * @param {string[]} flagNames - Array of feature flag names
     * @returns {Object} Object with flag names as keys and boolean values
     */
    getFlags(flagNames) {
        const result = {};
        flagNames.forEach(name => {
            result[name] = this.isEnabled(name);
        });
        return result;
    }

    /**
     * Get all available feature flags
     * @returns {Object} All feature flags
     */
    getAllFlags() {
        const result = {};
        this.flags.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    }

    /**
     * Load feature flags from the server
     */
    async loadFeatureFlags() {
        try {
            // Check cache first
            const now = Date.now();
            if (now - this.lastFetch < this.cacheDuration && this.flags.size > 0) {
                debug.log('Using cached feature flags');
                return;
            }

            const response = await fetch('/api/feature-flags', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const flags = await response.json();
                this.flags.clear();
                
                Object.entries(flags).forEach(([name, enabled]) => {
                    this.flags.set(name, enabled);
                });
                
                this.lastFetch = now;
                this.saveToCache();
                debug.log('Feature flags loaded from server:', flags);
            } else {
                console.warn('Failed to load feature flags from server');
                this.loadFromCache();
            }
        } catch (error) {
            console.error('Error loading feature flags:', error);
            this.loadFromCache();
        }
    }

    /**
     * Save feature flags to localStorage
     */
    saveToCache() {
        try {
            const cacheData = {
                flags: Object.fromEntries(this.flags),
                timestamp: this.lastFetch
            };
            localStorage.setItem('neosynth_feature_flags', JSON.stringify(cacheData));
        } catch (error) {
            console.error('Error saving feature flags to cache:', error);
        }
    }

    /**
     * Load feature flags from localStorage
     */
    loadFromCache() {
        try {
            const cached = localStorage.getItem('neosynth_feature_flags');
            if (cached) {
                const cacheData = JSON.parse(cached);
                const now = Date.now();
                
                // Use cached data if it's still fresh
                if (now - cacheData.timestamp < this.cacheDuration) {
                    this.flags.clear();
                    Object.entries(cacheData.flags).forEach(([name, enabled]) => {
                        this.flags.set(name, enabled);
                    });
                    this.lastFetch = cacheData.timestamp;
                    debug.log('Loaded feature flags from cache');
                }
            }
        } catch (error) {
            console.error('Error loading feature flags from cache:', error);
        }
    }

    /**
     * Refresh feature flags from server
     */
    async refresh() {
        this.lastFetch = 0; // Force refresh
        await this.loadFeatureFlags();
    }

    /**
     * Set feature flag manually (for testing)
     * @param {string} flagName - Name of the feature flag
     * @param {boolean} enabled - Whether the flag is enabled
     */
    setFlag(flagName, enabled) {
        this.flags.set(flagName, enabled);
        console.log(`Feature flag '${flagName}' set to ${enabled}`);
    }

    /**
     * Clear all feature flags
     */
    clear() {
        this.flags.clear();
        localStorage.removeItem('neosynth_feature_flags');
        this.lastFetch = 0;
        this.closeSSE();
    }
    
    /**
     * Setup Server-Sent Events for real-time cache invalidation
     */
    setupSSE() {
        if (!this.userId) return;
        
        try {
            this.eventSource = new EventSource('/api/feature-flags/events', {
                withCredentials: true
            });
            
            this.eventSource.onopen = () => {
                debug.log('Feature flag SSE connected');
                this.reconnectAttempts = 0;
            };
            
            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'refresh') {
                        debug.log('Feature flags changed, refreshing...');
                        this.refresh();
                    } else if (data.type === 'connected') {
                        console.log('SSE connection established');
                    }
                } catch (error) {
                    console.error('Error parsing SSE message:', error);
                }
            };
            
            this.eventSource.onerror = (error) => {
                console.error('SSE connection error:', error);
                this.handleSSEReconnect();
            };
            
        } catch (error) {
            console.error('Failed to setup SSE:', error);
        }
    }
    
    /**
     * Handle SSE reconnection logic
     */
    handleSSEReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            
            console.log(`Attempting SSE reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
            
            setTimeout(() => {
                this.closeSSE();
                this.setupSSE();
            }, delay);
        } else {
            console.warn('Max SSE reconnection attempts reached');
        }
    }
    
    /**
     * Close SSE connection
     */
    closeSSE() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
    }

    /**
     * Get feature flag status with metadata
     * @param {string} flagName - Name of the feature flag
     * @returns {Object} Status object with enabled state and metadata
     */
    getFeatureStatus(flagName) {
        return {
            enabled: this.isEnabled(flagName),
            exists: this.flags.has(flagName),
            lastUpdated: this.lastFetch
        };
    }
}

// Create a global instance
export const featureManager = new FeatureManager();
// Theme System Integration
// This file coordinates the ThemeManager and ThemeSelector

import debug from '../debugLogger/debugLogger.js';
import { ThemeManager } from './themeManager.js';
import { ThemeSelector } from './themeSelector.js';
import { saveThemePreference } from '../settings/userPreferences.js';
import { featureManager as _featureManager } from '../features/index.js';

export class ThemeSystem {
    constructor() {
        this.themeManager = new ThemeManager();
        this.themeSelector = null; // Will be null if selector elements don't exist
        this.isInitialized = false;
        this.userId = null;
        this.showStatus = null;
        this.hasThemeSelector = false;
    }

    /**
	 * Initialize the complete theme system
	 * @param {string} userId - Current user ID for preferences
	 * @param {Function} showStatus - Status message function
	 */
    async init(userId, showStatus) {
        this.userId = userId;
        this.showStatus = showStatus;
		
        try {
            // Initialize theme manager first (always works)
            this.themeManager.init(userId, showStatus);
			
            // Get current theme from manager
            const currentTheme = this.themeManager.getCurrentTheme();
			
            // Check if theme selector elements exist in DOM
            const themeCurrentBtn = document.getElementById('themeCurrentBtn');
            const themeOptions = document.getElementById('themeOptions');
			
            if (themeCurrentBtn && themeOptions) {
                // Elements exist, initialize theme selector
                this.themeSelector = new ThemeSelector();
                this.themeSelector.init((themeName) => {
                    this.handleThemeChange(themeName);
                });
				
                // Sync selector with current theme
                this.themeSelector.setCurrentTheme(currentTheme);
                this.hasThemeSelector = true;

                debug.log('Theme system initialized with selector');
            } else {
                // Elements don't exist, theme selector disabled
                debug.log('Theme selector elements not found - using settings panel only');
                this.hasThemeSelector = false;
            }

            this.isInitialized = true;
            debug.log('Theme system initialized successfully');
			
        } catch (error) {
            console.error('Error initializing theme system:', error);
			
            // Fallback: try to initialize just the theme manager
            try {
                this.themeManager.init(userId, showStatus);
                console.warn('Theme system partially initialized (manager only)');
                this.isInitialized = true;
            } catch (fallbackError) {
                console.error('Theme system initialization completely failed:', fallbackError);
            }
        }
    }

    /**
	 * Handle theme change from selector or settings
	 * @param {string} themeName - Selected theme name
	 */
    async handleThemeChange(themeName) {
        if (!this.isInitialized) {
            console.error('Theme system not initialized');
            return;
        }

        // Apply theme through manager
        const success = this.themeManager.setTheme(themeName);
		
        if (success) {
            // Add animation effect if selector exists
            if (this.hasThemeSelector && this.themeSelector) {
                this.themeSelector.animateThemeChange();
            }
			
            // Save theme preference to user preferences
            if (this.userId) {
                try {
                    await saveThemePreference(this.userId, themeName);
                    if (this.showStatus) {
                        const themeDisplayName = this.themeManager.getThemeDisplayName(themeName);
                        this.showStatus(`Theme "${themeDisplayName}" saved to profile`);
                    }
                } catch (error) {
                    console.error('Failed to save theme preference:', error);
                    // Still show success message for the theme change itself
                    if (this.showStatus) {
                        const themeDisplayName = this.themeManager.getThemeDisplayName(themeName);
                        this.showStatus(`Theme changed to "${themeDisplayName}" (not saved to profile)`);
                    }
                }
            }
        } else {
            console.error('Failed to apply theme:', themeName);
        }
    }

    /**
	 * Get current theme
	 * @returns {string} - Current theme name
	 */
    getCurrentTheme() {
        return this.themeManager.getCurrentTheme();
    }

    /**
	 * Set theme programmatically (from preferences loading)
	 * @param {string} themeName - Theme to set
	 * @param {boolean} saveToPreferences - Whether to save to user preferences
	 * @returns {boolean} - Success status
	 */
    setTheme(themeName, saveToPreferences = false) {
        if (!this.isInitialized) {
            console.error('Theme system not initialized');
            return false;
        }

        // Update manager
        const success = this.themeManager.setTheme(themeName);
		
        if (success) {
            // Update selector if it exists
            if (this.hasThemeSelector && this.themeSelector) {
                this.themeSelector.setCurrentTheme(themeName);
            }
			
            // Only save to preferences if explicitly requested
            // (to avoid loops when loading preferences)
            if (saveToPreferences && this.userId) {
                saveThemePreference(this.userId, themeName).catch(error => {
                    console.error('Failed to save theme preference:', error);
                });
            }
        }
		
        return success;
    }

    /**
	 * Get all available themes (now loads from API with feature flag filtering)
	 * @returns {Promise<Array>} - Array of theme objects
	 */
    async getAvailableThemes() {
        try {
            const response = await fetch('/api/themes', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const themes = await response.json();
                debug.log('Loaded themes from API:', themes);
                return themes;
            } else {
                console.warn('Failed to load themes from API, using fallback');
                return this.getFallbackThemes();
            }
        } catch (error) {
            console.error('Error loading themes:', error);
            return this.getFallbackThemes();
        }
    }

    /**
     * Fallback themes if API fails - minimal fallback
     * @returns {Array} - Array with just default theme
     */
    getFallbackThemes() {
        return [{ id: 'default', name: 'Default', description: 'Classic NeoSynth blue/pink theme' }];
    }

    /**
	 * Animate theme change with ripple effect
	 * @param {string} themeName - Theme to animate to
	 */
    animateThemeChange(themeName) {
        if (!this.isInitialized) {
            console.error('Theme system not initialized');
            return;
        }

        // Use the manager's ripple animation
        this.themeManager.animateThemeChange(themeName);
    }

    /**
	 * Force close any open dropdowns
	 */
    closeDropdowns() {
        if (this.isInitialized && this.hasThemeSelector && this.themeSelector) {
            this.themeSelector.forceClose();
        }
    }

    /**
	 * Check if theme system is ready
	 * @returns {boolean} - True if initialized
	 */
    isReady() {
        return this.isInitialized;
    }

    /**
	 * Check if theme selector is available
	 * @returns {boolean} - True if theme selector is available
	 */
    hasSelector() {
        return this.hasThemeSelector;
    }

    /**
	 * Destroy theme system (cleanup)
	 */
    destroy() {
        if (this.themeSelector) {
            this.themeSelector.destroy();
            this.themeSelector = null;
        }
		
        this.isInitialized = false;
        this.hasThemeSelector = false;
        this.userId = null;
        this.showStatus = null;
        debug.log('Theme system destroyed');
    }
}

// Create and export singleton instance
export const themeSystem = new ThemeSystem();
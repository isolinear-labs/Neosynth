// frontend/modules/volumeMultiplier/volumeMultiplierManager.js

/**
 * Volume Multiplier Manager Module
 * @feature-flag: volume_multiplier
 * @description: Per-track volume multiplier controls for audio normalization
 * @category: ui
 */

import { featureManager } from '../features/featureManager.js';
export class VolumeMultiplierManager {
    constructor() {
        this.volumeMultiplierInput = null;
        this.volumeMultiplierContainer = null;
        this.isInitialized = false;
        this.appScope = null;
    }

    /**
     * Detect if the current device is mobile
     * @returns {boolean} True if mobile device, false otherwise
     */
    isMobileDevice() {
        // Check for mobile user agents
        const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        const isMobileUA = mobileRegex.test(navigator.userAgent);
        
        // Check for touch capability and small screen
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isSmallScreen = window.innerWidth <= 768;
        
        // Consider it mobile if it matches UA pattern or is both touch-enabled and small screen
        return isMobileUA || (isTouchDevice && isSmallScreen);
    }

    /**
     * Initialize the volume multiplier manager
     * @param {Object} appElements - App elements with getters for currentPlayer, etc.
     */
    async init(appElements = null) {
        if (appElements) {
            this.appElements = appElements;
        }
        if (this.isInitialized) return;

        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            // Wait for feature manager to be ready
            await this.waitForFeatureManager();

            // Check if volume multiplier feature is enabled and device is not mobile
            const isFeatureEnabled = featureManager.isEnabled('volume_multiplier');
            const isMobile = this.isMobileDevice();

            if (isFeatureEnabled && !isMobile) {
                this.setupElements();
                this.setupEventListeners();
            } else {
                this.hideControls();
                if (isMobile) {
                    console.log('Volume multiplier disabled on mobile devices');
                }
            }

            this.isInitialized = true;
        } catch (error) {
            console.error('Error initializing volume multiplier:', error);
        }
    }

    /**
     * Wait for feature manager to be available
     */
    async waitForFeatureManager() {
        let attempts = 0;
        const maxAttempts = 50;

        while (attempts < maxAttempts) {
            if (window.featureManager && featureManager.isInitialized) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        throw new Error('Feature manager not available after 5 seconds');
    }

    /**
     * Set up DOM elements
     */
    setupElements() {
        this.volumeMultiplierInput = document.getElementById('volumeMultiplier');
        this.volumeMultiplierContainer = document.querySelector('.volume-multiplier-container');
        
        if (this.volumeMultiplierContainer) {
            this.volumeMultiplierContainer.style.display = 'flex';
        }
    }

    /**
     * Hide the volume multiplier controls
     */
    hideControls() {
        const container = document.querySelector('.volume-multiplier-container');
        if (container) {
            container.style.display = 'none';
        }
    }


    /**
     * Get app elements from initialized app elements or global scope
     */
    getAppElements() {
        if (this.appElements) {
            return {
                playlist: this.appElements.playlist,
                currentTrackIndex: this.appElements.currentTrackIndex,
                currentPlayer: this.appElements.currentPlayer,
                volumeSlider: document.getElementById('volumeSlider')
            };
        }
        
        return {
            playlist: window.playlist || [],
            currentTrackIndex: window.currentTrackIndex !== undefined ? window.currentTrackIndex : -1,
            currentPlayer: window.currentPlayer,
            volumeSlider: document.getElementById('volumeSlider')
        };
    }

    /**
     * Set up event listeners for the volume multiplier input
     */
    setupEventListeners() {
        if (!this.volumeMultiplierInput) {
            return;
        }
        
        // Handle final changes (blur or enter key)
        this.volumeMultiplierInput.addEventListener('change', (e) => {
            this.handleVolumeMultiplierChange(e);
        });

        this.volumeMultiplierInput.addEventListener('blur', (e) => {
            this.handleVolumeMultiplierChange(e);
        });

        this.volumeMultiplierInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleVolumeMultiplierChange(e);
                e.target.blur(); // Remove focus after enter
            }
        });
    }

    /**
     * Handle volume multiplier input change (when user finishes editing)
     */
    handleVolumeMultiplierChange(e) {
        const appElements = this.getAppElements();
        const newMultiplier = parseFloat(e.target.value);

        // Check for valid number and range
        if (isNaN(newMultiplier) || newMultiplier < 0.5 || newMultiplier > 3) {
            // Reset to current track's multiplier or 1
            const currentTrack = appElements.currentTrackIndex >= 0 ? appElements.playlist[appElements.currentTrackIndex] : null;
            const currentMultiplier = currentTrack?.volume_multiplier || 1;
            e.target.value = currentMultiplier;
            return;
        }
        
        if (appElements.currentTrackIndex >= 0) {
            appElements.playlist[appElements.currentTrackIndex].volume_multiplier = newMultiplier;
            this.applyVolumeMultiplier();
            
            if (window.showStatus) {
                window.showStatus(`Volume multiplier set to ${newMultiplier}x`);
            }
        }
    }

    /**
     * Apply volume multiplier to current player
     * @param {number} multiplier Optional multiplier override
     */
    applyVolumeMultiplier(multiplier = null) {
        // Don't apply volume multiplier on mobile devices
        if (this.isMobileDevice()) {
            return;
        }

        const appElements = this.getAppElements();
        
        if (!appElements.currentPlayer || !appElements.volumeSlider) return;

        const baseVolume = appElements.volumeSlider.value / 100;
        
        // Use provided multiplier or get from current track
        let volumeMultiplier;
        if (multiplier !== null) {
            volumeMultiplier = multiplier;
        } else {
            const currentTrack = appElements.currentTrackIndex >= 0 ? appElements.playlist[appElements.currentTrackIndex] : null;
            volumeMultiplier = currentTrack?.volume_multiplier || 1;
        }

        const finalVolume = Math.min(baseVolume * volumeMultiplier, 1.0);
        console.log('Volume calculation - base:', baseVolume, 'multiplier:', volumeMultiplier, 'final:', finalVolume);
        
        // Apply volume multiplier, cap at 1.0 to prevent distortion
        appElements.currentPlayer.volume = finalVolume;
    }

    /**
     * Update the volume multiplier input to show current track's multiplier
     */
    updateDisplayForCurrentTrack() {
        if (!this.volumeMultiplierInput) return;

        const appElements = this.getAppElements();
        const currentTrack = appElements.currentTrackIndex >= 0 ? appElements.playlist[appElements.currentTrackIndex] : null;

        if (currentTrack) {
            this.volumeMultiplierInput.value = currentTrack.volume_multiplier || 1;
        } else {
            this.volumeMultiplierInput.value = 1;
        }
    }

    /**
     * Called when track changes to update display and apply multiplier
     */
    onTrackChange() {
        this.updateDisplayForCurrentTrack();
        this.applyVolumeMultiplier();
    }

    /**
     * Called when volume slider changes to reapply multiplier
     */
    onVolumeChange() {
        this.applyVolumeMultiplier();
    }

    /**
     * Get the current track's volume multiplier
     * @returns {number} Current track's volume multiplier or 1 if no track
     */
    getCurrentMultiplier() {
        const appElements = this.getAppElements();
        const currentTrack = appElements.currentTrackIndex >= 0 ? appElements.playlist[appElements.currentTrackIndex] : null;
        return currentTrack?.volume_multiplier || 1;
    }

    /**
     * Set volume multiplier for current track
     * @param {number} multiplier New multiplier value (0.5-3.0)
     */
    setCurrentMultiplier(multiplier) {
        if (multiplier < 0.5 || multiplier > 3) return false;

        const appElements = this.getAppElements();
        if (appElements.currentTrackIndex >= 0) {
            appElements.playlist[appElements.currentTrackIndex].volume_multiplier = multiplier;
            this.updateDisplayForCurrentTrack();
            this.applyVolumeMultiplier();
            return true;
        }

        return false;
    }
}
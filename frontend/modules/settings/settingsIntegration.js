// Updated Settings Integration Module
// Connects the settings system with existing NeoSynth functionality

import { SettingsSystem } from './settingsSystem.js';

export class SettingsIntegration {
    constructor() {
        this.settingsSystem = new SettingsSystem();
        this.themeSystem = null;
        this.appElements = null;
        this.isInitialized = false;
    }

    /**
	 * Initialize the settings integration
	 * @param {Object} options - Configuration options
	 */
    async init(options = {}) {
        this.themeSystem = options.themeSystem;
        this.appElements = options.appElements;
        this.userId = options.userId;
        this.showStatus = options.showStatus;

        // Initialize the settings system
        await this.settingsSystem.init({
            themeSystem: this.themeSystem,
            userId: this.userId,
            showStatus: this.showStatus
        });

        // Add settings button to footer (replacing theme selector)
        this.addSettingsButton();

        // Sync existing preferences
        this.syncExistingPreferences();

        this.isInitialized = true;
        console.log('Settings integration initialized');
    }

    /**
	 * Add settings button to footer and remove theme selector
	 */
    addSettingsButton() {
        const footer = document.querySelector('.footer');
        if (!footer) {
            console.error('Footer not found for settings button');
            return;
        }

        // Remove the theme selector wrapper if it exists
        const themeSelector = footer.querySelector('.theme-selector-wrapper');
        if (themeSelector) {
            themeSelector.remove();
        }

        // Create settings button
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'settings-btn';
        settingsBtn.innerHTML = 'SETTINGS';
        settingsBtn.id = 'settingsBtn';

        // Add click handler
        settingsBtn.addEventListener('click', () => {
            this.openSettings();
        });

        // Insert settings button
        footer.appendChild(settingsBtn);
    }

    /**
	 * Sync existing app preferences with settings system
	 */
    syncExistingPreferences() {
        if (!this.appElements) return;

        const currentPrefs = this.settingsSystem.getPreferences();
		
        // Sync volume
        if (this.appElements.volumeSlider) {
            currentPrefs.volume = parseInt(this.appElements.volumeSlider.value);
        }

        // Sync theme
        if (this.themeSystem) {
            currentPrefs.theme = this.themeSystem.getCurrentTheme();
        }

        // Sync shuffle default
        if (this.appElements.shuffleState) {
            currentPrefs.shuffleDefault = this.appElements.shuffleState.value;
        }

        // Check current UI states
        currentPrefs.digitalRain = document.getElementById('digitalRain')?.style.display !== 'none';

        // Update settings system with current values
        this.settingsSystem.setPreferences(currentPrefs);
    }

    /**
	 * Open the settings panel
	 */
    openSettings() {
        if (!this.isInitialized) {
            console.error('Settings integration not initialized');
            return;
        }

        // Close any open theme dropdowns first
        if (this.themeSystem && this.themeSystem.closeDropdowns) {
            this.themeSystem.closeDropdowns();
        }

        this.settingsSystem.open();
    }

    /**
	 * Close the settings panel
	 */
    closeSettings() {
        if (this.settingsSystem) {
            this.settingsSystem.close();
        }
    }

    /**
	 * Get current settings
	 * @returns {Object} Current settings
	 */
    getSettings() {
        return this.settingsSystem.getPreferences();
    }

    /**
	 * Set settings programmatically
	 * @param {Object} settings - Settings to apply
	 */
    setSettings(settings) {
        if (this.settingsSystem) {
            this.settingsSystem.setPreferences(settings);
        }
    }

    /**
	 * Check if settings panel is open
	 * @returns {boolean} True if open
	 */
    isSettingsOpen() {
        return this.settingsSystem ? this.settingsSystem.isSettingsOpen() : false;
    }

    /**
	 * Save current settings to preferences
	 */
    async saveSettings() {
        if (this.settingsSystem) {
            await this.settingsSystem.saveSettings();
        }
    }

    /**
	 * Reset settings to defaults
	 */
    resetSettings() {
        if (this.settingsSystem) {
            this.settingsSystem.resetSettings();
        }
    }

    /**
	 * Handle keyboard shortcuts for settings
	 * @param {KeyboardEvent} event - Keyboard event
	 */
    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + , to open settings
        if ((event.ctrlKey || event.metaKey) && event.key === ',') {
            event.preventDefault();
            this.openSettings();
            return true;
        }

        // Escape to close settings
        if (event.key === 'Escape' && this.isSettingsOpen()) {
            this.closeSettings();
            return true;
        }

        return false;
    }

    /**
	 * Apply settings that affect the main app
	 * @param {Object} settings - Settings to apply
	 */
    applyMainAppSettings(settings) {
        // Apply volume setting
        if (settings.volume && this.appElements.volumeSlider) {
            this.appElements.volumeSlider.value = settings.volume;
            if (this.appElements.updateVolume) {
                this.appElements.updateVolume();
            }
        }

        // Apply shuffle default
        if (settings.shuffleDefault !== undefined && this.appElements.shuffleState) {
            this.appElements.shuffleState.value = settings.shuffleDefault;
        }

        // Apply theme
        if (settings.theme && this.themeSystem) {
            this.themeSystem.setTheme(settings.theme, false);
        }

        // Apply digital rain setting
        if (settings.digitalRain !== undefined) {
            const digitalRain = document.getElementById('digitalRain');
            if (digitalRain) {
                digitalRain.style.display = settings.digitalRain ? 'block' : 'none';
            }
        }


    }

    /**
	 * Destroy the settings integration
	 */
    destroy() {
        if (this.settingsSystem) {
            this.settingsSystem.destroy();
        }

        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn && settingsBtn.parentNode) {
            settingsBtn.parentNode.removeChild(settingsBtn);
        }

        this.isInitialized = false;
        this.themeSystem = null;
        this.appElements = null;
    }
}

// Export singleton instance
export const settingsIntegration = new SettingsIntegration();
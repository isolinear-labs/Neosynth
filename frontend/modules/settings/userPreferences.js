// Enhanced User Preferences Module with Settings Integration

// Default preferences
const DEFAULT_PREFERENCES = {
    volume: 100,
    shuffleEnabled: false,
    theme: 'default',
    videoDisplay: true,
    autoSave: true,
    autoSaveTheme: true
};

// API URL
const API_URL = '/api';

/**
 * Save user preferences to the server
 * @param {string} userId - The user ID
 * @param {Object} preferences - User preferences to save
 * @returns {Promise} - Promise resolving to saved preferences
 */
async function saveUserPreferences(userId, preferences) {
    try {
        const response = await window.apiCall(`${API_URL}/users/${userId}/preferences`, {
            method: 'PUT',
            body: JSON.stringify(preferences)
        });
		
        if (!response || !response.ok) {
            throw new Error('Failed to save preferences');
        }
		
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error saving preferences:', error);
        throw error; // Don't fall back to localStorage - let caller handle
    }
}

/**
 * Save theme preference specifically
 * @param {string} userId - The user ID
 * @param {string} theme - Theme to save
 * @returns {Promise} - Promise resolving to saved theme
 */
export async function saveThemePreference(userId, theme) {
    try {
        // Get current preferences first
        const currentPrefs = await loadUserPreferences(userId);
		
        // Update theme
        const updatedPrefs = { ...currentPrefs, theme };
		
        // Save full preferences
        return await saveUserPreferences(userId, updatedPrefs);
    } catch (error) {
        console.error('Error saving theme preference:', error);
        throw error;
    }
}

/**
 * Load user preferences from the server
 * @param {string} userId - The user ID
 * @returns {Promise} - Promise resolving to user preferences
 */
async function loadUserPreferences(userId) {
    try {
        const response = await window.apiCall(`${API_URL}/users/${userId}/preferences`);
		
        if (!response || !response.ok) {
            throw new Error('Failed to load preferences');
        }
		
        const serverPrefs = await response.json();
		
        // Merge with defaults to ensure we have all required preferences
        return { ...DEFAULT_PREFERENCES, ...serverPrefs };
		
    } catch (error) {
        console.error('Error loading preferences from server:', error);
        console.warn('Using default preferences - server unavailable');
        
        // Return defaults if server fails
        return DEFAULT_PREFERENCES;
    }
}

/**
 * Apply loaded preferences to the application
 * @param {Object} preferences - The preferences to apply
 * @param {Object} appElements - App elements and state references
 */
function applyPreferences(preferences, appElements) {
    const {
        volumeSlider,
        updateVolume,
        isShuffleEnabledRef,
        shuffleBtn,
        playerStatusIndicator,
        themeSystem
    } = appElements;
	
    // Apply volume preference
    if (preferences.volume !== undefined && volumeSlider) {
        volumeSlider.value = preferences.volume;
        if (updateVolume) updateVolume();
    }
	
    // Apply shuffle preference
    if (preferences.shuffleEnabled !== undefined && isShuffleEnabledRef) {
        isShuffleEnabledRef.value = preferences.shuffleEnabled;
		
        // Update UI to match shuffle state
        if (preferences.shuffleEnabled) {
            shuffleBtn?.classList.add('active');
            playerStatusIndicator?.classList.remove('hide');
            playerStatusIndicator?.classList.add('active');
        }
    }
	
    // Apply theme preference
    if (preferences.theme && themeSystem) {
        themeSystem.setTheme(preferences.theme, false); // Don't save to avoid loop
    }
	
	
    console.log('Applied preferences:', preferences);
}

/**
 * Get current preferences from the application state
 * @param {Object} appElements - App elements and state references
 * @returns {Object} - Current preferences
 */
function getCurrentPreferences(appElements) {
    const {
        volumeSlider,
        isShuffleEnabledRef,
        themeSystem
    } = appElements;
	
    return {
        volume: volumeSlider ? volumeSlider.value : DEFAULT_PREFERENCES.volume,
        shuffleEnabled: isShuffleEnabledRef ? isShuffleEnabledRef.value : DEFAULT_PREFERENCES.shuffleEnabled,
        theme: themeSystem ? themeSystem.getCurrentTheme() : DEFAULT_PREFERENCES.theme,
        videoDisplay: DEFAULT_PREFERENCES.videoDisplay,
        autoSave: DEFAULT_PREFERENCES.autoSave,
        autoSaveTheme: DEFAULT_PREFERENCES.autoSaveTheme
    };
}

/**
 * Initialize preferences with settings integration
 * @param {string} userId - User ID
 * @param {Object} appElements - App elements
 * @param {Object} settingsSystem - Settings system instance
 */
async function initPreferencesWithSettings(userId, appElements, settingsSystem) {
    try {
        // Load preferences from server
        const preferences = await loadUserPreferences(userId);
		
        // Apply to main app
        applyPreferences(preferences, appElements);
		
        // Apply to settings system
        if (settingsSystem) {
            settingsSystem.setPreferences(preferences);
        }
		
        console.log('Preferences initialized with settings integration');
        return preferences;
		
    } catch (error) {
        console.error('Error initializing preferences:', error);
		
        // Apply defaults on error
        applyPreferences(DEFAULT_PREFERENCES, appElements);
        if (settingsSystem) {
            settingsSystem.setPreferences(DEFAULT_PREFERENCES);
        }
		
        return DEFAULT_PREFERENCES;
    }
}

/**
 * Save all current preferences from both app and settings
 * @param {string} userId - User ID
 * @param {Object} appElements - App elements
 * @param {Object} settingsSystem - Settings system instance
 */
async function saveAllPreferences(userId, appElements, settingsSystem) {
    try {
        // Get preferences from settings system (most complete)
        const preferences = settingsSystem ? 
            settingsSystem.getPreferences() : 
            getCurrentPreferences(appElements);
		
        // Ensure we have current app state for critical settings
        if (appElements.volumeSlider) {
            preferences.volume = appElements.volumeSlider.value;
        }
		
        if (appElements.isShuffleEnabledRef) {
            preferences.shuffleEnabled = appElements.isShuffleEnabledRef.value;
        }
		
        if (appElements.themeSystem) {
            preferences.theme = appElements.themeSystem.getCurrentTheme();
        }
		
        // Save to server
        await saveUserPreferences(userId, preferences);
		
        console.log('All preferences saved successfully');
        return preferences;
		
    } catch (error) {
        console.error('Error saving all preferences:', error);
        throw error;
    }
}

// Export functions for use in other files
export {
    saveUserPreferences,
    loadUserPreferences,
    applyPreferences,
    getCurrentPreferences,
    initPreferencesWithSettings,
    saveAllPreferences,
    DEFAULT_PREFERENCES
};
// frontend/modules/preferences/init.js

import { 
    loadUserPreferences, 
    applyPreferences, 
    saveUserPreferences,
    getCurrentPreferences 
} from './userPreferences.js';

/**
 * Initialize the preferences module
 * @param {string} userId - The user's ID
 * @param {Object} appElements - App elements and state references
 * @param {Function} showStatus - Function to show status messages
 */
export async function initPreferences(userId, appElements, showStatus) {
    // Load and apply preferences
    const preferences = await loadUserPreferences(userId);
    applyPreferences(preferences, appElements);
    
    // Set up save button event handler
    const prefBtn = document.getElementById('prefBtn');
    if (prefBtn) {
        prefBtn.addEventListener('click', async () => {
            const currentPrefs = getCurrentPreferences(appElements);
            await saveUserPreferences(userId, currentPrefs);
            showStatus('Preferences saved successfully');
        });
    }
}
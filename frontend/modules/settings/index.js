// Settings Module - Main Export
// Create this as: frontend/modules/settings/index.js

export { SettingsSystem } from './settingsSystem.js';
export { SettingsIntegration, settingsIntegration } from './settingsIntegration.js';
export { 
    saveUserPreferences,
    loadUserPreferences,
    applyPreferences,
    getCurrentPreferences,
    initPreferencesWithSettings,
    saveAllPreferences,
    saveThemePreference,
    DEFAULT_PREFERENCES
} from './userPreferences.js';

// Re-export the singleton for easy access
import { settingsIntegration } from './settingsIntegration.js';
export default settingsIntegration;
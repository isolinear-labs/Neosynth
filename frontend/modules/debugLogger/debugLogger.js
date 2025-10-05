/**
 * Debug Logger Utility (Frontend)
 * Provides centralized debug logging controlled by the 'console_debug_logging' feature flag.
 * Logs are only output when the feature flag is enabled.
 *
 * To enable debug mode:
 * - Go to Admin Panel > Feature Flags
 * - Enable the "Console Debug Logging" flag
 */

const debugLogger = {
    /**
     * Check if debug mode is enabled via feature flag
     * @returns {boolean}
     */
    isEnabled: () => {
        try {
            // Check if featureManager is available globally and initialized
            if (window.featureManager && window.featureManager.isInitialized) {
                return window.featureManager.isEnabled('console_debug_logging');
            }
            // Before feature manager is initialized, return false silently
            return false;
        } catch {
            return false;
        }
    },

    /**
     * Log a debug message
     * @param {...any} args - Arguments to log
     */
    log: (...args) => {
        if (debugLogger.isEnabled()) {
            console.log(...args);
        }
    },

    /**
     * Log an error message (always shows for critical errors)
     * @param {...any} args - Arguments to log
     */
    error: (...args) => {
        console.error(...args);
    },

    /**
     * Log a warning message (always shows)
     * @param {...any} args - Arguments to log
     */
    warn: (...args) => {
        console.warn(...args);
    },

    /**
     * Log an info message (only in debug mode)
     * @param {...any} args - Arguments to log
     */
    info: (...args) => {
        if (debugLogger.isEnabled()) {
            console.info(...args);
        }
    }
};

// Make it available globally for easy access in browser console
if (typeof window !== 'undefined') {
    window.debugLogger = debugLogger;
}

export default debugLogger;

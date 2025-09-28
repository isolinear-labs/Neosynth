/**
 * Session Check Module
 * Handles session expiration warnings and notifications
 * 
 * @feature-flag: session_expiration_warning
 * @description: Shows session expiration warning when less than 1 hour remaining
 * @category: session
 */
export class SessionCheck {
    constructor() {
        this.updateInterval = null;
        this.isEnabled = false;
    }

    /**
     * Initialize session warning functionality
     * @param {HTMLElement} userStatusElement - The user status container element
     * @param {Function} apiCallFunction - The API call function from app.js
     * @param {Object} featureManager - Feature manager instance (optional)
     */
    init(userStatusElement, apiCallFunction, featureManager = null) {
        this.userStatusElement = userStatusElement;
        this.apiCall = apiCallFunction;
        this.featureManager = featureManager;
        
        if (!this.userStatusElement) {
            console.warn('SessionCheck: userStatusElement not provided');
            return;
        }

        this.createSessionWarningElement();
        this.enable();
    }

    /**
     * Refresh based on feature flag status
     */
    refresh() {
        if (!this.featureManager) return;
        
        const isEnabled = this.featureManager.isEnabled('session_expiration_warning');
        
        if (isEnabled && !this.isEnabled) {
            this.enable();
        } else if (!isEnabled && this.isEnabled) {
            this.disable();
        }
    }

    /**
     * Create and insert the session warning element
     */
    createSessionWarningElement() {
        // Create session warning as separate element
        this.sessionWarning = document.createElement('div');
        this.sessionWarning.id = 'sessionWarning';
        this.sessionWarning.className = 'session-warning hide';
        this.sessionWarning.innerHTML = '<span id="sessionWarningText">Session expires in: --</span>';
        
        // Insert session warning after user status
        this.userStatusElement.parentNode.insertBefore(this.sessionWarning, this.userStatusElement.nextSibling);
        
        this.sessionWarningText = document.getElementById('sessionWarningText');
    }

    /**
     * Enable session checking
     */
    enable() {
        if (this.isEnabled) return;
        
        this.isEnabled = true;
        
        // Update immediately
        this.updateSessionWarning();
        
        // No polling - session validation happens on API requests via UnifiedAuth
        
        console.log('SessionCheck: Enabled');
    }

    /**
     * Disable session checking
     */
    disable() {
        if (!this.isEnabled) return;
        
        this.isEnabled = false;
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        // Hide warning
        if (this.sessionWarning) {
            this.sessionWarning.classList.add('hide');
            this.sessionWarning.classList.remove('expiring-soon');
        }
        
        console.log('SessionCheck: Disabled');
    }

    /**
     * Remove session warning element from DOM
     */
    remove() {
        this.disable();
        
        if (this.sessionWarning && this.sessionWarning.parentNode) {
            this.sessionWarning.parentNode.removeChild(this.sessionWarning);
            this.sessionWarning = null;
            this.sessionWarningText = null;
        }
    }

    /**
     * Update session warning display
     */
    async updateSessionWarning() {
        if (!this.isEnabled || !this.sessionWarning || !this.sessionWarningText || !this.apiCall) {
            return;
        }

        try {
            const response = await this.apiCall('/api/auth/session-info');
            if (!response) return; // API call failed (likely session expired)
            
            const sessionInfo = await response.json();
            
            if (sessionInfo.isExpiringSoon) {
                // Show warning if less than 1 hour remaining
                const hours = sessionInfo.hoursRemaining;
                const minutes = sessionInfo.minutesRemaining;
                
                let timeText = '';
                if (hours === 0) {
                    timeText = `${minutes} minutes`;
                } else if (minutes === 0) {
                    timeText = `${hours} hour${hours > 1 ? 's' : ''}`;
                } else {
                    timeText = `${hours}h ${minutes}m`;
                }
                
                this.sessionWarningText.textContent = `⚠️ Session expires in: ${timeText} - Log out and back in to prevent session interuption.`;
                this.sessionWarning.classList.remove('hide');
                this.sessionWarning.classList.add('expiring-soon');
            } else {
                // Hide warning if more than 1 hour remaining
                this.sessionWarning.classList.add('hide');
                this.sessionWarning.classList.remove('expiring-soon');
            }
        } catch (error) {
            console.error('SessionCheck: Failed to update session warning:', error);
            // Hide warning on error
            this.sessionWarning.classList.add('hide');
        }
    }

    /**
     * Get current session status
     */
    async getSessionInfo() {
        if (!this.apiCall) return null;
        
        try {
            const response = await this.apiCall('/api/auth/session-info');
            if (!response) return null;
            
            return await response.json();
        } catch (error) {
            console.error('SessionCheck: Failed to get session info:', error);
            return null;
        }
    }

    /**
     * Check session status and handle daily extensions
     * Used during app initialization to validate session and handle logout if needed
     * @param {Function} showStatus - Status message function
     * @returns {Promise<boolean>} - Returns true if session is valid, false if should redirect to login
     */
    async validateSessionOnStartup(showStatus) {
        if (!this.apiCall) {
            console.error('SessionCheck: API call function not available');
            return false;
        }

        try {
            const sessionResponse = await this.apiCall('/api/auth/session-status');
            if (!sessionResponse || !sessionResponse.ok) {
                // Session expired or hit extension limit - redirect to login
                console.log('Session expired, redirecting to login');
                return false;
            }
            
            const sessionData = await sessionResponse.json();
            console.log('Session status:', sessionData);
            
            if (sessionData.wasExtended && showStatus) {
                showStatus('Session extended for another day');
            }
            
            return true;
        } catch (error) {
            console.error('Session status check failed:', error);
            // If session check fails, redirect to login to be safe
            return false;
        }
    }

    /**
     * Check if session warning is currently enabled
     */
    get enabled() {
        return this.isEnabled;
    }
}

// Create singleton instance
export const sessionCheck = new SessionCheck();
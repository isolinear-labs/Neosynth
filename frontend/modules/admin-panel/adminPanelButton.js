/**
 * Admin Panel Button Module
 * @feature-flag: Admin Panel Button
 * @description: Adds admin panel access button next to Save Profile button for admin users
 * @category: admin
 * @admin-only
 */

import { featureManager } from '../features/featureManager.js';

export class AdminPanelButton {
    constructor() {
        this.buttonElement = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the admin panel button
     */
    async init() {
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

            // Check if admin panel button feature is enabled
            // @feature-flag: Admin Panel Button
            // @description: Adds admin panel access button next to playlist save button for admin users
            // @category: admin
            // @admin-only
            const isEnabled = featureManager.isEnabled('admin_panel_button');
            console.log('Admin panel button feature flag check:', isEnabled);
            console.log('All feature flags:', featureManager.getAllFlags());
            
            if (isEnabled) {
                console.log('Rendering admin panel button...');
                this.render();
            } else {
                console.log('Admin panel button disabled or not available');
            }

            this.isInitialized = true;
            console.log('Admin panel button module initialized');
        } catch (error) {
            console.error('Error initializing admin panel button:', error);
        }
    }

    /**
     * Wait for feature manager to be available
     */
    async waitForFeatureManager() {
        return new Promise(resolve => {
            const checkManager = () => {
                if (featureManager && featureManager.isInitialized) {
                    resolve();
                } else {
                    setTimeout(checkManager, 100);
                }
            };
            checkManager();
        });
    }

    /**
     * Render the admin panel button
     */
    render() {
        // Check if button already exists
        if (this.buttonElement && document.contains(this.buttonElement)) {
            return;
        }

        // Find the user status container (where Save Profile button is)
        const userStatus = document.querySelector('.user-status');
        if (!userStatus) {
            console.warn('User status container not found, retrying in 1 second...');
            setTimeout(() => this.render(), 1000);
            return;
        }

        // Create admin panel button
        this.buttonElement = document.createElement('button');
        this.buttonElement.id = 'adminPanelBtn';
        this.buttonElement.className = 'btn-admin';
        this.buttonElement.textContent = 'Admin Panel';
        this.buttonElement.title = 'Access admin control panel';

        // Add click handler
        this.buttonElement.addEventListener('click', this.handleClick.bind(this));

        // Insert after the Save Profile button
        const saveProfileButton = userStatus.querySelector('#prefBtn');
        if (saveProfileButton && saveProfileButton.nextSibling) {
            userStatus.insertBefore(this.buttonElement, saveProfileButton.nextSibling);
        } else if (saveProfileButton) {
            saveProfileButton.parentNode.appendChild(this.buttonElement);
        } else {
            // Fallback: append to container
            userStatus.appendChild(this.buttonElement);
        }

        console.log('Admin panel button rendered');
    }

    /**
     * Remove the admin panel button
     */
    remove() {
        if (this.buttonElement && document.contains(this.buttonElement)) {
            this.buttonElement.remove();
            console.log('Admin panel button removed');
        }
        this.buttonElement = null;
    }

    /**
     * Handle button click
     */
    handleClick(event) {
        event.preventDefault();
        event.stopPropagation();
        
        // Add visual feedback
        this.buttonElement.style.transform = 'scale(0.95)';
        setTimeout(() => {
            if (this.buttonElement) {
                this.buttonElement.style.transform = '';
            }
        }, 150);

        // Navigate to admin panel in new tab
        console.log('Opening admin panel in new tab...');
        window.open('/admin', '_blank');
    }

    /**
     * Refresh the button state based on current feature flag
     */
    refresh() {
        const isEnabled = featureManager.isEnabled('admin_panel_button');
        
        if (isEnabled && !this.buttonElement) {
            this.render();
        } else if (!isEnabled && this.buttonElement) {
            this.remove();
        }
    }

    /**
     * Update button visibility based on feature flag changes
     */
    onFeatureFlagUpdate() {
        this.refresh();
    }
}

// Create and export singleton instance
export const adminPanelButton = new AdminPanelButton();

// Auto-initialize when module loads
adminPanelButton.init();
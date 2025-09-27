// Password Reset Dropdown Module
// Adds a dropdown to the username area with password reset functionality

class PasswordResetDropdown {
    constructor() {
        this.modal = null;
    }

    // Initialize the dropdown on the user status area
    init(userStatusElement, apiCall) {
        if (!userStatusElement || !apiCall) {
            console.error('PasswordResetDropdown: Missing required parameters');
            return;
        }

        this.apiCall = apiCall;
        this.attachToUserStatus(userStatusElement);
    }

    // Attach dropdown to the user status area
    attachToUserStatus(userStatusElement) {
        const userName = userStatusElement.querySelector('.user-name');
        if (!userName) {
            console.error('PasswordResetDropdown: .user-name element not found');
            return;
        }

        // Make username clickable
        userName.style.cursor = 'pointer';
        userName.classList.add('user-dropdown-trigger');

        // Add click event to show terminal modal directly
        userName.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showPasswordResetModal();
        });
    }


    // Show password reset modal
    showPasswordResetModal() {
        console.log('showPasswordResetModal called'); // Debug
        this.modal = this.createModal();
        document.body.appendChild(this.modal);
        console.log('Modal appended to body'); // Debug

        // Start terminal opening animation
        this.startTerminalAnimation();
    }

    // Create password reset modal
    createModal() {
        const modal = document.createElement('div');
        modal.className = 'password-reset-terminal hide';
        modal.innerHTML = `
            <div class="terminal-container">
                <div class="loading-overlay">
                    <div class="loading-text">Opening root Socket...</div>
                    <div class="loading-bar">
                        <div class="loading-progress"></div>
                    </div>
                </div>

                <div class="terminal-header">
                    <div class="terminal-title">
                        <span>👾 Socket Opened - Password Management</span>
                    </div>
                </div>

                <div class="terminal-body">
                    <div class="terminal-prompt">
                        root@neosynth:~# ./passwd<span class="running-indicator"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>
                    </div>

                    <div class="password-form-container">
                        <form id="passwordResetForm" class="terminal-form">
                            <div class="terminal-input-group">
                                <label class="terminal-label">CURRENT_PASSWORD:</label>
                                <input type="password" id="currentPassword" name="currentPassword"
                                       class="terminal-input" placeholder="Enter current password" required>
                            </div>
                            <div class="terminal-input-group">
                                <label class="terminal-label">NEW_PASSWORD:</label>
                                <input type="password" id="newPassword" name="newPassword"
                                       class="terminal-input" placeholder="Enter new password" required>
                            </div>
                            <div class="terminal-input-group">
                                <label class="terminal-label">CONFIRM_PASSWORD:</label>
                                <input type="password" id="confirmPassword" name="confirmPassword"
                                       class="terminal-input" placeholder="Confirm new password" required>
                            </div>
                            <div class="terminal-requirements">
                                <span class="requirement-text">* Password must be at least 8 characters long</span>
                            </div>
                        </form>

                        <div class="terminal-actions">
                            <button type="button" class="terminal-btn btn-cancel">CANCEL</button>
                            <button type="submit" form="passwordResetForm" class="terminal-btn btn-execute">EXECUTE</button>
                        </div>
                    </div>

                    <div id="passwordResetStatus" class="terminal-status hide"></div>

                    <div class="terminal-status-line">
                        <div id="passwordStatusLine" class="status-line status-success" style="visibility: hidden;">$ passwd.init() -> Enter current and new password sequence</div>
                    </div>
                </div>

                <div class="terminal-footer"></div>
            </div>
        `;

        // Add event listeners
        this.addModalEventListeners(modal);
        return modal;
    }

    // Add event listeners to modal
    addModalEventListeners(modal) {
        const cancelBtn = modal.querySelector('.btn-cancel');
        const form = modal.querySelector('#passwordResetForm');

        // Close modal events
        cancelBtn.addEventListener('click', () => this.closeModal());

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.modal?.classList.contains('hide')) {
                this.closeModal();
            }
        });

        // Prevent closing when clicking inside terminal container
        modal.querySelector('.terminal-container').addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Close when clicking outside terminal container
        modal.addEventListener('click', () => this.closeModal());

        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handlePasswordReset();
        });

        // Real-time password confirmation validation
        const newPassword = modal.querySelector('#newPassword');
        const confirmPassword = modal.querySelector('#confirmPassword');

        confirmPassword.addEventListener('input', () => {
            if (confirmPassword.value && newPassword.value !== confirmPassword.value) {
                confirmPassword.setCustomValidity('Passwords do not match');
            } else {
                confirmPassword.setCustomValidity('');
            }
        });
    }

    // Start terminal opening animation
    startTerminalAnimation() {
        console.log('startTerminalAnimation called'); // Debug
        this.modal.classList.remove('hide');
        console.log('Hide class removed'); // Debug

        const container = this.modal.querySelector('.terminal-container');
        const loadingOverlay = this.modal.querySelector('.loading-overlay');
        console.log('Container and overlay found:', container, loadingOverlay); // Debug

        if (container && loadingOverlay) {
            // Start loading animation
            container.classList.add('terminal-loading');
            loadingOverlay.style.opacity = '1';
            loadingOverlay.style.pointerEvents = 'auto';

            // Start animations
            container.style.animation = 'terminalSlideIn 1s ease-out 0.5s forwards';
            loadingOverlay.style.animation = 'loadingFadeOut 2s ease-out 1.5s forwards';

            // Start the running indicator animation
            this.startRunningIndicator();

            // Show initial status message
            this.showStatusLine('$ passwd.init() -> Enter current and new password sequence', 'info');

            // Focus on first input after animation
            setTimeout(() => {
                const firstInput = this.modal.querySelector('#currentPassword');
                if (firstInput) firstInput.focus();
            }, 2000);
        }
    }

    // Start running indicator animation
    startRunningIndicator() {
        const dots = this.modal.querySelectorAll('.running-indicator .dot');
        let currentDot = 0;

        this.indicatorInterval = setInterval(() => {
            // Reset all dots
            dots.forEach(dot => {
                dot.style.color = 'var(--secondary-base)';
                dot.style.textShadow = 'none';
            });

            // Highlight current dot
            if (dots[currentDot]) {
                dots[currentDot].style.color = 'var(--interactive-highlight)';
                dots[currentDot].style.textShadow = '0 0 10px var(--interactive-highlight)';
            }

            currentDot = (currentDot + 1) % dots.length;
        }, 200);
    }

    // Show status line message (similar to API key terminal)
    showStatusLine(message, type = 'info') {
        const statusLine = this.modal.querySelector('#passwordStatusLine');
        if (!statusLine) return;

        // Clear any existing timer
        if (this.statusTimer) {
            clearTimeout(this.statusTimer);
            this.statusTimer = null;
        }

        statusLine.textContent = message;
        statusLine.className = `status-line status-${type === 'info' ? 'success' : type}`;
        statusLine.classList.remove('hide');
        statusLine.style.visibility = 'visible';

        // Auto-hide after 5 seconds for non-persistent messages
        this.statusTimer = setTimeout(() => {
            statusLine.style.visibility = 'hidden';
        }, 5000);
    }

    // Handle password reset form submission
    async handlePasswordReset() {
        const form = this.modal.querySelector('#passwordResetForm');
        const statusDiv = this.modal.querySelector('#passwordResetStatus');
        const submitBtn = this.modal.querySelector('.btn-execute');

        const formData = new FormData(form);
        const currentPassword = formData.get('currentPassword');
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');

        // Clear previous status
        statusDiv.classList.add('hide');
        statusDiv.className = 'status-message hide';

        // Client-side validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            this.showStatus('All fields are required', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showStatus('Passwords do not match', 'error');
            return;
        }

        if (newPassword.length < 8) {
            this.showStatus('Password must be at least 8 characters long', 'error');
            return;
        }

        // Disable submit button during request
        submitBtn.disabled = true;
        submitBtn.textContent = 'PROCESSING...';

        try {
            const response = await this.apiCall('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            if (response && response.ok) {
                const result = await response.json();
                this.showStatus('Password changed successfully!', 'success');

                // Clear form and close modal after success
                setTimeout(() => {
                    form.reset();
                    this.closeModal();
                }, 2000);
            }

        } catch (error) {
            console.error('Password reset error:', error);

            if (error.message.includes('401')) {
                this.showStatus('Current password is incorrect', 'error');
            } else if (error.message.includes('400')) {
                this.showStatus('Invalid password format', 'error');
            } else {
                this.showStatus('Password reset failed. Please try again.', 'error');
            }
        } finally {
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.textContent = 'EXECUTE';
        }
    }

    // Show status message in modal
    showStatus(message, type = 'info') {
        const statusDiv = this.modal.querySelector('#passwordResetStatus');
        statusDiv.className = `terminal-status terminal-${type}`;
        statusDiv.textContent = `> ${message}`;
        statusDiv.classList.remove('hide');
    }

    // Close modal
    closeModal() {
        if (this.modal) {
            // Clear the running indicator interval
            if (this.indicatorInterval) {
                clearInterval(this.indicatorInterval);
                this.indicatorInterval = null;
            }

            // Clear status timer
            if (this.statusTimer) {
                clearTimeout(this.statusTimer);
                this.statusTimer = null;
            }

            document.body.removeChild(this.modal);
            this.modal = null;
        }
    }
}

export { PasswordResetDropdown };
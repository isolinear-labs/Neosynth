// Terminal Manager for API Key Management
class TerminalManager {
    constructor() {
        this.modal = null;
        this.currentAction = null;
        this.apiKeys = [];
        this.init();
    }

    init() {
        this.modal = document.getElementById('terminalModal');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Socket button click
        const socketBtn = document.getElementById('techSocketBtn');
        if (socketBtn) {
            socketBtn.addEventListener('click', () => this.openTerminal());
        }

        // Close modal on background click
        this.modal?.addEventListener('click', (e) => {
            // Check if clicked outside the terminal container
            if (e.target === this.modal || !e.target.closest('.terminal-container')) {
                this.closeTerminal();
            }
        });

        // Menu option clicks
        document.querySelectorAll('.menu-option').forEach(option => {
            option.addEventListener('click', () => {
                // Don't handle clicks on disabled options
                if (option.classList.contains('menu-option-disabled')) {
                    return;
                }
                const action = option.dataset.action;
                this.handleMenuAction(action);
            });
        });

        // Execute button
        const executeBtn = document.getElementById('executeBtn');
        if (executeBtn) {
            executeBtn.addEventListener('click', () => this.executeCommand());
        }

        // Enter key in terminal input
        const terminalInput = document.getElementById('terminalInput');
        if (terminalInput) {
            terminalInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.executeCommand();
                }
            });
        }

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.modal?.classList.contains('hide')) {
                this.closeTerminal();
            }
        });
    }

    openTerminal() {
        if (this.modal) {
            this.modal.classList.remove('hide');
            this.loadApiKeys();
            
            // Set default mode to create
            this.currentAction = 'create';
            const input = document.getElementById('terminalInput');
            if (input) {
                input.placeholder = 'Enter API key name...';
                // Focus after animation completes
                setTimeout(() => {
                    input.focus();
                }, 2000);
            }
            this.showStatus('$ keyGen.init() -> Enter identifier and execute sequence', 'info');
            
            // Start the always-running spinner
            this.startAlwaysSpinner();
            
            // Reset loading animation
            const container = this.modal.querySelector('.terminal-container');
            const loadingOverlay = this.modal.querySelector('.loading-overlay');
            
            if (container && loadingOverlay) {
                // Reset classes and styles
                container.classList.remove('terminal-loading');
                container.classList.add('terminal-loading');
                loadingOverlay.style.opacity = '1';
                loadingOverlay.style.pointerEvents = 'auto';
                
                // Restart animations
                container.style.animation = 'none';
                loadingOverlay.style.animation = 'none';
                
                setTimeout(() => {
                    container.style.animation = 'terminalSlideIn 1s ease-out 0.5s forwards';
                    loadingOverlay.style.animation = 'loadingFadeOut 2s ease-out 1.5s forwards';
                }, 10);
            }
        }
    }

    closeTerminal() {
        if (this.modal) {
            this.modal.classList.add('hide');
            this.currentAction = null;
            this.clearInput();
            this.isPersistentStatus = false;
            
            // Stop the always-running spinner
            if (this.spinnerInterval) {
                clearInterval(this.spinnerInterval);
                this.spinnerInterval = null;
            }
            
            this.hideStatus();
        }
    }

    handleMenuAction(action) {
        this.currentAction = action;
        const input = document.getElementById('terminalInput');
        
        // Clear any previous status when switching actions (force clear even persistent ones)
        this.isPersistentStatus = false;
        this.hideStatus();
        
        switch (action) {
        case 'create':
            if (input) {
                input.placeholder = 'Enter API key name...';
                input.focus();
            }
            this.showStatus('$ keyGen.create() -> Awaiting key designation... Execute to generate', 'info');
            break;
        case 'permissions':
            this.showStatus('Feature not implemented: ./keyGen.sh --permissions', 'info');
            break;
        }
    }

    async executeCommand() {
        const input = document.getElementById('terminalInput');
        const keyName = input?.value.trim();

        if (!keyName) {
            this.showStatus('Please enter a key name', 'error');
            return;
        }

        switch (this.currentAction) {
        case 'create':
            await this.createApiKey(keyName);
            break;
        default:
            this.showStatus('Please select an action first', 'error');
        }
    }

    async createApiKey(name) {
        try {
            this.showScriptExecution(name);
            
            const response = await window.apiCall('/api/keys', {
                method: 'POST',
                body: JSON.stringify({ name })
            });

            if (!response || !response.ok) {
                if (!response) {
                    throw new Error('Authentication required - please log in again');
                }
                const error = await response.json();
                throw new Error(error.message || 'Failed to create API key');
            }

            const result = await response.json();
            
            // Show the full key with copy button (stays until navigated away)
            this.showNewApiKey(result.key, result.name);
            this.clearInput();
            this.loadApiKeys();
            
        } catch (error) {
            this.showStatus(`✗ Script failed: ${error.message}`, 'error');
        }
    }

    async revokeApiKey(keyId) {
        try {
            this.showStatus('Revoking API key...', 'info');
            
            const response = await window.apiCall(`/api/keys/${encodeURIComponent(keyId)}`, {
                method: 'DELETE'
            });

            if (!response || !response.ok) {
                if (!response) {
                    throw new Error('Authentication required - please log in again');
                }
                const error = await response.json();
                throw new Error(error.message || 'Failed to revoke API key');
            }

            const result = await response.json();
            this.showStatus(`[SUCCESS] API key '${result.name}' revoked`, 'success');
            this.clearInput();
            this.loadApiKeys();
            
        } catch (error) {
            this.showStatus(`[ERROR] ${error.message}`, 'error');
        }
    }

    async loadApiKeys() {
        try {
            const response = await window.apiCall('/api/keys');

            if (!response || !response.ok) {
                if (!response) {
                    throw new Error('Authentication required - please log in again');
                }
                throw new Error('Failed to load API keys');
            }

            this.apiKeys = await response.json();
            this.renderApiKeys();
            
        } catch (error) {
            this.showStatus(`[ERROR] ${error.message}`, 'error');
        }
    }

    renderApiKeys() {
        const container = document.getElementById('apiKeyList');
        if (!container) return;

        if (this.apiKeys.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: var(--text-color); opacity: 0.6; padding: 20px;">No API keys found</div>';
            return;
        }

        container.innerHTML = this.apiKeys.map(key => {
            const createdDate = new Date(key.created).toLocaleString();
            return `
                <div class="api-key-item">
                    <div class="api-key-info">
                        <div class="api-key-name">${this.escapeHtml(key.name)}</div>
                        <div class="api-key-value">nsk_${'*'.repeat(32)}${key.keyHash ? key.keyHash.slice(-4) : '****'}</div>
                        <div class="api-key-timestamp">Created: ${createdDate}</div>
                    </div>
                    <div class="api-key-actions">
                        <button class="action-btn btn-delete" onclick="terminalManager.confirmDelete('${this.escapeHtml(key.keyId)}', '${this.escapeHtml(key.name)}')">DELETE</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    async confirmDelete(keyId, keyName) {
        if (confirm(`Are you sure you want to delete the API key '${keyName}'?`)) {
            await this.revokeApiKey(keyId);
        }
    }

    startAlwaysSpinner() {
        const indicator = document.getElementById('runningIndicator');
        if (indicator) {
            const dots = indicator.querySelectorAll('.dot');
            const glowClasses = ['glow-cyan', 'glow-blue', 'glow-cyan', 'glow-blue'];
            let currentDot = 0;
            
            this.spinnerInterval = setInterval(() => {
                // Clear all glows
                dots.forEach(dot => {
                    dot.classList.remove('glow-cyan', 'glow-blue');
                });
                
                // Add glow to current dot
                if (dots[currentDot]) {
                    dots[currentDot].classList.add(glowClasses[currentDot]);
                }
                
                currentDot = (currentDot + 1) % dots.length;
            }, 800);
        }
    }

    showScriptExecution(_keyName) {
        // Animation is always running, no need to start/stop
    }

    hideScriptExecution() {
        // Animation is always running, no need to start/stop
    }

    showNewApiKey(apiKey, _keyName) {
        const statusLine = document.getElementById('statusLine');
        if (!statusLine) return;


        // Clear any existing timers that might hide this
        if (this.statusTimer) {
            clearTimeout(this.statusTimer);
            this.statusTimer = null;
        }

        statusLine.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>✓ Key generated successfully: ${this.escapeHtml(apiKey)}</span>
                <button onclick="terminalManager.copyToClipboard('${apiKey}')" class="action-btn" style="border-color: var(--interactive-highlight); color: var(--interactive-highlight); margin-left: 10px;">COPY</button>
            </div>
        `;
        statusLine.className = 'status-line status-success';
        statusLine.classList.remove('hide');
        
        // Mark this as a persistent message
        this.isPersistentStatus = true;
    }

    showTemporaryMessage(message, type = 'info') {
        // Create a temporary notification that doesn't replace the main status
        const tempNotification = document.createElement('div');
        tempNotification.textContent = message;
        tempNotification.className = `status-line status-${type === 'info' ? 'success' : type}`;
        tempNotification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1001;
            padding: 10px 15px;
            border-radius: 4px;
            font-size: 12px;
            font-family: 'Courier New', monospace;
            max-width: 300px;
        `;
        
        document.body.appendChild(tempNotification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (tempNotification.parentNode) {
                tempNotification.parentNode.removeChild(tempNotification);
            }
        }, 3000);
    }

    showStatus(message, type = 'info') {
        const statusLine = document.getElementById('statusLine');
        if (!statusLine) return;

        // Clear any existing timer
        if (this.statusTimer) {
            clearTimeout(this.statusTimer);
            this.statusTimer = null;
        }

        statusLine.textContent = message;
        statusLine.className = `status-line status-${type === 'info' ? 'success' : type}`;
        statusLine.classList.remove('hide');
        
        // Mark as non-persistent
        this.isPersistentStatus = false;

        // Auto-hide after 5 seconds for non-error messages
        if (type !== 'error') {
            this.statusTimer = setTimeout(() => this.hideStatus(), 5000);
        }
    }

    hideStatus() {
        // Don't hide if this is a persistent status (like API key display)
        if (this.isPersistentStatus) {
            return;
        }
        
        const statusLine = document.getElementById('statusLine');
        if (statusLine) {
            statusLine.classList.add('hide');
        }
    }

    clearInput() {
        const input = document.getElementById('terminalInput');
        if (input) {
            input.value = '';
        }
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            // Show temporary feedback without replacing the API key display
            this.showTemporaryMessage('API key copied to clipboard!', 'success');
        } catch (_error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showTemporaryMessage('API key copied to clipboard!', 'success');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create global instance
const terminalManager = new TerminalManager();

// Make it globally accessible for onclick handlers
window.terminalManager = terminalManager;

export default terminalManager;
// Enhanced NeoSynth Neural Authentication System

class LoginManager {
    constructor() {
        this.API_URL = '/api';
        this.currentStep = 1;
        this.authData = {
            username: '',
            deviceFingerprint: '',
            deviceTrusted: false,
            selectedAuthMethod: null
        };
        this.rainInstance = null;
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeDigitalRain();
            this.generateDeviceFingerprint();
            this.checkForTempCodeRequest();
            this.checkProvisionLinkVisibility();
            this.setupEventListeners();
            this.setupDevelopmentTools();
        });
    }

    setupEventListeners() {
        // Handle Enter key in form fields
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const target = e.target;
                
                // Handle specific 2FA input fields
                if (target.id === 'totpCode') {
                    e.preventDefault();
                    this.authenticateWithTOTP();
                    return;
                } else if (target.id === 'authCode') {
                    e.preventDefault();
                    this.authenticateWithCode();
                    return;
                }
                
                // General form handling for other inputs
                const activeStep = document.querySelector('.step.active');
                if (!activeStep) return;
                
                const primaryButton = activeStep.querySelector('.neural-button:not(.secondary):not(.danger)');
                if (primaryButton && !primaryButton.disabled) {
                    primaryButton.click();
                }
            }
        });
    }

    // Digital Rain Implementation
    async initializeDigitalRain() {
        const container = document.getElementById('digitalRain');
        if (!container) return;

        // Try to use existing digital rain module
        try {
            const { digitalRain } = await import('./modules/effects/index.js');
            if (digitalRain && digitalRain.init) {
                this.rainInstance = digitalRain.init(container);
                return;
            }
        } catch (_error) {
            console.log('Digital rain module not available, using fallback');
        }

        // Fallback implementation
        this.initializeFallbackRain();
    }

    initializeFallbackRain() {
        const container = document.getElementById('digitalRain');
        if (!container) return;

        const settings = {
            columnSpacing: 60,
            minColumns: 5,
            minRainLength: 5,
            maxRainLength: 15,
            newRainInterval: 2000
        };

        const createRainColumn = (index, totalColumns) => {
            const rain = document.createElement('div');
            rain.className = 'digit-rain';
            
            const columnWidth = window.innerWidth / totalColumns;
            const leftPosition = (index * columnWidth) + (Math.random() * (columnWidth * 0.8));
            
            rain.style.left = `${Math.max(0, leftPosition)}px`;
            rain.style.animationDuration = `${5 + Math.random() * 15}s`;
            rain.style.animationDelay = `${Math.random() * 2}s`;
            
            rain.innerHTML = this.generateRainContent(settings);
            container.appendChild(rain);
        };

        const createInitialRain = () => {
            const width = window.innerWidth;
            const numberOfColumns = Math.max(
                Math.floor(width / settings.columnSpacing), 
                settings.minColumns
            );
            
            for (let i = 0; i < numberOfColumns; i++) {
                createRainColumn(i, numberOfColumns);
            }
        };

        const generateNewRain = () => {
            const rain = document.createElement('div');
            rain.className = 'digit-rain';
            rain.style.left = `${Math.random() * window.innerWidth}px`;
            rain.style.animationDuration = `${5 + Math.random() * 15}s`;
            rain.innerHTML = this.generateRainContent(settings);
            
            container.appendChild(rain);
            
            const duration = parseFloat(rain.style.animationDuration) * 1000;
            setTimeout(() => {
                if (rain.parentNode) {
                    rain.parentNode.removeChild(rain);
                }
            }, duration + 1000);
        };

        createInitialRain();
        setInterval(generateNewRain, settings.newRainInterval);
    }

    generateRainContent(settings) {
        let content = '';
        const rainLength = settings.minRainLength + Math.random() * (settings.maxRainLength - settings.minRainLength);
        
        for (let j = 0; j < rainLength; j++) {
            content += Math.random() > 0.5 ? '1' : '0';
            if (j < rainLength - 1) content += '<br>';
        }
        
        return content;
    }

    // Device fingerprinting for trusted device recognition
    generateDeviceFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('Neural fingerprint', 2, 2);
            
            const fingerprint = [
                navigator.userAgent,
                navigator.language,
                `${screen.width}x${screen.height}`,
                new Date().getTimezoneOffset(),
                canvas.toDataURL()
            ].join('|');
            
            // Simple hash function
            let hash = 0;
            for (let i = 0; i < fingerprint.length; i++) {
                const char = fingerprint.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            
            this.authData.deviceFingerprint = Math.abs(hash).toString(16);
        } catch (error) {
            console.error('Error generating device fingerprint:', error);
            // Fallback fingerprint
            this.authData.deviceFingerprint = 'fallback-' + Date.now().toString(16);
        }
    }

    // Check if this is a temp code generation request
    checkForTempCodeRequest() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('action') === 'tempcode') {
            // Skip to temp code generation step if user is already logged in
            const userId = localStorage.getItem('neosynthUserId');
            const deviceToken = localStorage.getItem('neosynthDeviceToken');
            
            if (userId && deviceToken) {
                this.showStep(3);
                this.updateStatusIndicator('TEMP_CODE_MODE');
            }
        }
    }

    // Step navigation
    showStep(stepNumber) {
        // Hide all steps completely
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active');
            step.style.display = 'none';
        });

        // Show target step
        const targetStep = document.getElementById(`step${stepNumber}`);
        if (targetStep) {
            targetStep.classList.add('active');
            targetStep.style.display = 'block';
            this.currentStep = stepNumber;
        }
    }

    updateStatusIndicator(status) {
        const indicator = document.getElementById('statusIndicator');
        if (!indicator) return;
        
        const statusMap = {
            'READY': 'READY',
            'AUTHENTICATING': 'AUTHENTICATING',
            'DEVICE_CHECK': 'SCANNING_DEVICE',
            'AUTH_REQUIRED': 'AUTH_REQUIRED',
            'TEMP_CODE_MODE': 'TEMP_CODE_GEN',
            'SUCCESS': 'ACCESS_GRANTED'
        };
        
        indicator.textContent = statusMap[status] || status;
    }

    showStatus(message, type = 'info') {
        const statusDiv = document.getElementById('statusMessage');
        if (!statusDiv) return;

        // Clear any existing content and reset all classes
        statusDiv.textContent = '';
        statusDiv.className = 'status-message';
        statusDiv.style.display = 'block';

        // Set new message content
        statusDiv.textContent = message;

        switch(type) {
        case 'success':
            statusDiv.classList.add('status-success');
            break;
        case 'error':
            statusDiv.classList.add('status-error');
            break;
        case 'warning':
            statusDiv.classList.add('status-warning');
            break;
        default:
            statusDiv.style.display = 'none';
            return;
        }

        // Auto-hide after 5 seconds unless it's a success message
        if (type !== 'success') {
            setTimeout(() => {
                if (statusDiv) {
                    statusDiv.style.display = 'none';
                    statusDiv.textContent = '';
                }
            }, 5000);
        }
    }


    // Input validation helpers (minimal client-side validation for security)
    validateUsername(username) {
        // Only basic presence validation - don't reveal requirements
        if (!username || username.trim().length === 0) {
            return 'Neural identity required';
        }
        return null;
    }

    validatePassword(password) {
        // Only basic presence validation - don't reveal requirements
        if (!password || password.length === 0) {
            return 'Neural access key required';
        }
        return null;
    }

    sanitizeInput(input) {
        return input.trim().replace(/[<>"'&]/g, '');
    }

    // Step 1: Validate username and password
    async validateCredentials() {
        const usernameElement = document.getElementById('username');
        const passwordElement = document.getElementById('password');
        
        if (!usernameElement || !passwordElement) {
            this.showStatus('Login form elements not found', 'error');
            return;
        }
        
        const username = this.sanitizeInput(usernameElement.value);
        const password = passwordElement.value;
        
        // Validate inputs
        const usernameError = this.validateUsername(username);
        if (usernameError) {
            this.showStatus(usernameError, 'error');
            usernameElement.focus();
            return;
        }
        
        const passwordError = this.validatePassword(password);
        if (passwordError) {
            this.showStatus(passwordError, 'error');
            passwordElement.focus();
            return;
        }
        
        this.updateStatusIndicator('AUTHENTICATING');
        this.authData.username = username;
        
        // Rate limiting check
        if (this.isRateLimited()) {
            this.showStatus('Too many login attempts. Please wait before trying again.', 'warning');
            return;
        }
        
        try {
            // Disable form during request
            this.setFormDisabled(true);

            // Start the two-step authentication flow
            await this.performStep1Authentication();

        } catch (error) {
            console.error('Authentication error:', error);
            this.showStatus('Neural link connection failed. Please try again.', 'error');
            this.recordLoginAttempt(true);
            this.updateStatusIndicator('READY');
            // Clear any 2FA elements that might be showing
            this.clear2FAElements();
        } finally {
            this.setFormDisabled(false);
        }
    }

    // Step 2: Setup second factor authentication
    setupSecondFactor() {
        this.updateStatusIndicator('AUTH_REQUIRED');
        
        if (this.authData.deviceTrusted) {
            // Trusted device - skip 2FA, go straight to success
            this.showStatus('Trusted neural node recognized. Completing neural link...', 'success');
            // Auto-complete login for trusted devices
            setTimeout(() => {
                this.performLogin('trusted', null);
            }, 1000);
            return;
        } else {
            // Show device warning and auth options for new devices
            const trustedSection = document.getElementById('deviceTrustedSection');
            const untrustedSection = document.getElementById('deviceNotTrustedSection');
            if (trustedSection) trustedSection.style.display = 'none';
            if (untrustedSection) untrustedSection.style.display = 'block';
            this.showStatus('Unknown neural node detected. Enhanced verification required.', 'warning');
        }
        
        this.showStep(2);
        
        // Focus on TOTP input if trusted device
        if (this.authData.deviceTrusted) {
            const totpInput = document.getElementById('totpCode');
            if (totpInput) totpInput.focus();
        }
    }

    // Authenticate with TOTP (trusted devices)
    async authenticateWithTOTP() {
        const totpInput = document.getElementById('totpCode');
        if (!totpInput) return;
        
        const totpCode = totpInput.value.trim();
        
        if (!totpCode || totpCode.length !== 6) {
            this.showStatus('6-digit neural authentication code required', 'error');
            return;
        }
        
        await this.performLogin('totp', totpCode);
    }

    // Show auth options for new devices
    showAuthOptions() {
        const trustedSection = document.getElementById('deviceTrustedSection');
        const untrustedSection = document.getElementById('deviceNotTrustedSection');
        if (trustedSection) trustedSection.style.display = 'none';
        if (untrustedSection) untrustedSection.style.display = 'block';
    }

    // Select authentication method
    selectAuthMethod(method, event) {
        this.authData.selectedAuthMethod = method;
        
        // Update UI
        document.querySelectorAll('.auth-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        if (event && event.target) {
            const authOption = event.target.closest('.auth-option');
            if (authOption) authOption.classList.add('selected');
        }
        
        // Show form
        const untrustedSection = document.getElementById('deviceNotTrustedSection');
        const methodForm = document.getElementById('authMethodForm');
        if (untrustedSection) untrustedSection.style.display = 'none';
        if (methodForm) methodForm.style.display = 'block';
        
        // Update form based on method
        const label = document.getElementById('authMethodLabel');
        const input = document.getElementById('authCode');
        
        if (label && input) {
            switch(method) {
            case 'totp':
                label.textContent = 'Neural Authentication Code';
                input.placeholder = '123456';
                input.maxLength = 6;
                break;
            case 'tempCode':
                label.textContent = 'Device Authorization Code';
                input.placeholder = 'ABC123';
                input.maxLength = 6;
                break;
            case 'backup':
                label.textContent = 'Emergency Access Code';
                input.placeholder = 'XXXX-XXXX';
                input.maxLength = 9;
                break;
            }
            
            input.focus();
        }
    }

    // Back to auth options
    backToAuthOptions() {
        const methodForm = document.getElementById('authMethodForm');
        const untrustedSection = document.getElementById('deviceNotTrustedSection');
        if (methodForm) methodForm.style.display = 'none';
        if (untrustedSection) untrustedSection.style.display = 'block';
        this.authData.selectedAuthMethod = null;
    }

    // Authenticate with selected method
    async authenticateWithCode() {
        const codeInput = document.getElementById('authCode');
        if (!codeInput) return;
        
        const code = codeInput.value.trim();
        
        if (!code) {
            this.showStatus('Neural authentication code required', 'error');
            return;
        }
        
        await this.performLogin(this.authData.selectedAuthMethod, code);
    }

    // Perform login with specified method
    async performLogin(method, code) {
        this.updateStatusIndicator('AUTHENTICATING');

        try {
            // Check if this is initial password verification or 2FA step
            if (method === 'password' || !this.authData.stepToken) {
                // Step 1: Password verification
                return await this.performStep1Authentication();
            } else {
                // Step 2: 2FA verification
                return await this.performStep2Authentication(method, code);
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showStatus('Login failed. Please try again.', 'error');
            // Clear 2FA input fields on general login error
            const totpInput = document.getElementById('totpCode');
            const authCodeInput = document.getElementById('authCode');
            if (totpInput) totpInput.value = '';
            if (authCodeInput) authCodeInput.value = '';
        }
    }

    async performStep1Authentication() {
        const passwordInput = document.getElementById('password');
        if (!passwordInput) {
            this.showStatus('Password field not found', 'error');
            return;
        }

        const requestBody = {
            username: this.authData.username,
            password: passwordInput.value,
            deviceFingerprint: this.authData.deviceFingerprint
        };

        const response = await fetch(`${this.API_URL}/auth/auth-step1`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (response.ok) {
            if (data.requiresStep2) {
                // Store step token and show 2FA options
                this.authData.stepToken = data.stepToken;
                this.authData.availableMethods = data.availableMethods;
                this.showStep2Interface(data.availableMethods);
                this.showStatus('Neural access key verified. Please complete 2FA.', 'success');
            } else {
                // Trusted device - login complete
                this.handleLoginSuccess(data);
            }
        } else {
            this.showStatus(data.message || 'Neural access key verification failed', 'error');
        }
    }

    async performStep2Authentication(method, code) {
        if (!this.authData.stepToken) {
            this.showStatus('Neural authentication session expired. Please restart link.', 'error');
            this.restartLogin();
            return;
        }

        const requestBody = {
            stepToken: this.authData.stepToken
        };

        // Add appropriate 2FA field
        switch(method) {
        case 'totp':
            requestBody.totpToken = code;
            break;
        case 'tempCode':
            requestBody.tempCode = code;
            break;
        case 'backup':
            requestBody.backupCode = code;
            break;
        default:
            this.showStatus('Invalid neural authentication method', 'error');
            return;
        }

        const response = await fetch(`${this.API_URL}/auth/auth-step2`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (response.ok) {
            this.handleLoginSuccess(data);
        } else {
            this.showStatus(data.message || 'Neural authentication failed', 'error');
            this.updateStatusIndicator('AUTH_REQUIRED');

            // Clear 2FA input fields on failed authentication
            const totpInput = document.getElementById('totpCode');
            const authCodeInput = document.getElementById('authCode');
            if (totpInput) totpInput.value = '';
            if (authCodeInput) authCodeInput.value = '';
        }
    }

    // Handle successful login completion
    handleLoginSuccess(data) {
        this.recordLoginAttempt(false);
        this.completeLogin(data);
    }

    // Show Step 2 (2FA) interface
    showStep2Interface(availableMethods) {
        // Clear any existing status messages to prevent stacking
        const statusDiv = document.getElementById('statusMessage');
        if (statusDiv) {
            statusDiv.textContent = '';
            statusDiv.className = 'status-message';
        }

        // Hide Step 1 (username/password)
        const step1 = document.querySelector('#step1, .step[id="step1"]');
        if (step1) step1.style.display = 'none';

        // Show Step 2 (2FA)
        const step2 = document.querySelector('#step2, .step[id="step2"]');
        if (step2) step2.style.display = 'block';

        // Show appropriate 2FA interface based on available methods
        if (availableMethods.includes('totp')) {
            // Show TOTP interface (deviceTrustedSection shows TOTP by default)
            const trustedSection = document.getElementById('deviceTrustedSection');
            const untrustedSection = document.getElementById('deviceNotTrustedSection');

            if (trustedSection) trustedSection.style.display = 'block';
            if (untrustedSection) untrustedSection.style.display = 'none';

            // Focus the TOTP input
            const totpInput = document.getElementById('totpCode');
            if (totpInput) {
                totpInput.focus();
                totpInput.value = ''; // Clear any previous value
            }
        } else {
            // No TOTP available, show other options
            this.showAuthOptions();
        }

        // Update step indicator
        this.currentStep = 2;
    }

    // Restart login process (clear step tokens, etc.)
    restartLogin() {
        this.authData.stepToken = null;
        this.authData.availableMethods = null;
        this.updateStatusIndicator('READY');
        this.currentStep = 1;

        // Clear 2FA elements
        this.clear2FAElements();

        // Show Step 1, hide Step 2
        const step1 = document.querySelector('#step1, .step[id="step1"]');
        const step2 = document.querySelector('#step2, .step[id="step2"]');
        if (step1) step1.style.display = 'block';
        if (step2) step2.style.display = 'none';
    }

    // Complete login process
    completeLogin(data) {
        this.updateStatusIndicator('SUCCESS');

        try {
            // Validate response data
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid login response data');
            }

            // Store session data securely (session token now in httpOnly cookie)
            if (data.user && data.user.userId) {
                const sanitizedUserId = this.sanitizeInput(data.user.userId);
                localStorage.setItem('neosynthUserId', sanitizedUserId);
                console.log('Stored userId in localStorage:', sanitizedUserId);
            } else {
                console.error('No userId in login response data:', data);
                this.showStatus('Neural link authentication failed. Please try again.', 'error');
                return;
            }

            if (data.deviceToken) {
                localStorage.setItem('neosynthDeviceToken', data.deviceToken);
                console.log('Stored deviceToken in localStorage');
            }
            // Session token is now stored in httpOnly cookie by the server

            // Clear login attempts on success
            localStorage.removeItem('loginAttempts');

            // Clear sensitive form data
            this.clearSensitiveData();

            this.showStep(4);

            // Clear any previous status messages to prevent stacking
            const statusDiv = document.getElementById('statusMessage');
            if (statusDiv) {
                statusDiv.textContent = '';
                statusDiv.className = 'status-message';
            }

            // Show welcome message
            const welcomeMessage = data.user && data.user.userId ?
                `Neural link established. Welcome back, ${this.sanitizeInput(data.user.userId)}!` :
                'Neural link established. Welcome back!';
            this.showStatus(welcomeMessage, 'success');


            // Create continue button first (before auto-redirect)
            setTimeout(() => {
                const step4 = document.getElementById('step4');
                if (step4) {
                    // Remove any existing continue button to prevent duplicates
                    const existingBtn = step4.querySelector('.continue-button');
                    if (existingBtn) {
                        existingBtn.remove();
                    }

                    const continueBtn = document.createElement('button');
                    continueBtn.textContent = 'CONTINUE TO APPLICATION';
                    continueBtn.className = 'neural-button continue-button';
                    continueBtn.onclick = () => {
                        clearTimeout(redirectTimer);
                        this.performRedirect();
                    };
                    step4.appendChild(continueBtn);
                }
            }, 1200);

            // Auto-redirect with 2.5-second delay
            const redirectTimer = setTimeout(() => {
                this.performRedirect();
            }, 2500);

        } catch (error) {
            console.error('Login completion error:', error);
            this.showStatus('Login completed but there was an issue. Please refresh the page.', 'warning');
        }
    }

    // Perform redirect with proper validation
    performRedirect() {
        try {
            // Ensure localStorage values are set before redirect
            const userId = localStorage.getItem('neosynthUserId');
            if (!userId) {
                console.error('No userId found in localStorage after login');
                this.showStatus('Neural link authentication failed. Please try again.', 'error');
                return;
            }

            console.log('Redirecting with userId:', userId);

            // Force a small delay to ensure all localStorage operations complete
            setTimeout(() => {
                const currentPath = window.location.pathname;
                if (currentPath === '/login' || currentPath === '/login.html') {
                    // Secure redirect to root - no user input involved
                    window.location.assign('/');
                } else {
                    // If we're already on the main app, just reload to refresh auth state
                    window.location.reload();
                }
            }, 100);

        } catch (error) {
            console.error('Redirect failed:', error);
            // Fallback: reload current page
            window.location.reload();
        }
    }

    // Generate temp code for device authorization
    async generateTempCode() {
        const userId = localStorage.getItem('neosynthUserId');
        const deviceToken = localStorage.getItem('neosynthDeviceToken');
        
        if (!userId || !deviceToken) {
            this.showStatus('Neural profile not found. Please login first.', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.API_URL}/auth/generate-temp-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: userId,
                    deviceToken: deviceToken
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                const tempCodeDisplay = document.getElementById('tempCodeDisplay');
                if (tempCodeDisplay) {
                    tempCodeDisplay.textContent = data.tempCode;
                }
                this.showStatus('Authorization code generated successfully', 'success');
                
                // Auto-refresh after expiration
                setTimeout(() => {
                    if (tempCodeDisplay) {
                        tempCodeDisplay.textContent = '------';
                    }
                    this.showStatus('Code expired. Generate a new one if needed.', 'warning');
                }, 10 * 60 * 1000); // 10 minutes
            } else {
                this.showStatus(data.message || 'Failed to generate authorization code', 'error');
            }
            
        } catch (error) {
            console.error('Temp code generation error:', error);
            this.showStatus('Failed to generate authorization code', 'error');
        }
    }

    // Check if provision link should be visible
    checkProvisionLinkVisibility() {
        const urlParams = new URLSearchParams(window.location.search);
        const isFromFirstTimeSetup = urlParams.get('fromFirstTimeSetup') === 'true';
        const registerLink = document.querySelector('.register-link');

        if (registerLink && isFromFirstTimeSetup) {
            registerLink.style.display = 'none';
        }
    }

    // Back to main login
    backToLogin() {
        window.location.href = '/login';
    }
    
    // Rate limiting helpers
    recordLoginAttempt(failed) {
        const key = 'loginAttempts';
        const now = Date.now();
        const attempts = JSON.parse(localStorage.getItem(key) || '[]');
        
        // Clean old attempts (older than 15 minutes)
        const recentAttempts = attempts.filter(attempt => now - attempt.timestamp < 15 * 60 * 1000);
        
        if (failed) {
            recentAttempts.push({ timestamp: now, failed: true });
        }
        
        localStorage.setItem(key, JSON.stringify(recentAttempts));
    }
    
    isRateLimited() {
        const key = 'loginAttempts';
        const now = Date.now();
        const attempts = JSON.parse(localStorage.getItem(key) || '[]');
        
        // Count failed attempts in last 15 minutes
        const recentFailedAttempts = attempts.filter(attempt => 
            attempt.failed && now - attempt.timestamp < 15 * 60 * 1000
        );
        
        return recentFailedAttempts.length >= 5; // Max 5 failed attempts
    }
    
    // Form state management
    setFormDisabled(disabled) {
        const inputs = document.querySelectorAll('input, button');
        inputs.forEach(input => {
            input.disabled = disabled;
        });
    }
    
    // Security helpers
    clearSensitiveData() {
        // Clear any sensitive data from memory
        if (this.authData.password) {
            this.authData.password = null;
        }

        // Clear password fields
        const passwordInputs = document.querySelectorAll('input[type="password"], input[id*="password"]');
        passwordInputs.forEach(input => {
            if (input.value) {
                input.value = '';
            }
        });

        // Clear 2FA elements
        this.clear2FAElements();
    }

    // Clear 2FA specific elements and data
    clear2FAElements() {
        // Clear 2FA input fields
        const totpInput = document.getElementById('totpCode');
        if (totpInput) {
            totpInput.value = '';
        }

        const authCodeInput = document.getElementById('authCode');
        if (authCodeInput) {
            authCodeInput.value = '';
        }

        // Clear auth data related to 2FA
        this.authData.stepToken = null;
        this.authData.availableMethods = null;
        this.authData.selectedAuthMethod = null;

        // Hide Step 2 completely (overrides any inline styles from showStep2Interface)
        const step2 = document.querySelector('#step2, .step[id="step2"]');
        if (step2) {
            step2.style.display = 'none';
            step2.classList.remove('active');
        }

        // Hide 2FA interface sections
        const deviceNotTrustedSection = document.getElementById('deviceNotTrustedSection');
        const deviceTrustedSection = document.getElementById('deviceTrustedSection');
        const authMethodForm = document.getElementById('authMethodForm');
        if (deviceNotTrustedSection) {
            deviceNotTrustedSection.style.display = 'none';
        }
        if (deviceTrustedSection) {
            deviceTrustedSection.style.display = 'none';
        }
        if (authMethodForm) {
            authMethodForm.style.display = 'none';
        }

        // Clear any auth option selections
        document.querySelectorAll('.auth-option').forEach(option => {
            option.classList.remove('selected');
        });
    }
    
    // Development tools (localhost only)
    setupDevelopmentTools() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            this.createThemeSelector();
        }
    }
    
    createThemeSelector() {
        // Create theme selector container
        const themeSelector = document.createElement('div');
        themeSelector.className = 'theme-selector';
        themeSelector.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
            background: rgba(0, 0, 0, 0.8);
            padding: 10px;
            border-radius: 5px;
            border: 1px solid var(--interactive-highlight);
        `;
        
        // Create label
        const label = document.createElement('label');
        label.textContent = 'Local Themes:';
        label.htmlFor = 'theme-select';
        label.style.cssText = `
            color: var(--interactive-highlight);
            font-size: 0.9rem;
        `;
        
        // Create select dropdown
        const select = document.createElement('select');
        select.id = 'theme-select';
        select.style.cssText = `
            background: var(--darker-bg, rgba(0, 0, 0, 0.8));
            border: 1px solid var(--secondary-base);
            color: var(--text-color, #ffffff);
            padding: 5px;
            border-radius: 3px;
            font-family: 'Share Tech Mono', monospace;
        `;
        
        // Add theme options
        const themes = [
            { value: '', text: 'Default' },
            { value: 'vapor', text: 'Vapor' },
            { value: 'noir', text: 'Noir' },
            { value: 'mint', text: 'Mint' },
            { value: 'laser', text: 'Laser' }
        ];
        
        themes.forEach(theme => {
            const option = document.createElement('option');
            option.value = theme.value;
            option.textContent = theme.text;
            select.appendChild(option);
        });
        
        // Add change event listener
        select.addEventListener('change', (e) => {
            window.changeTheme(e.target.value);
        });
        
        // Assemble and add to page
        themeSelector.appendChild(label);
        themeSelector.appendChild(select);
        document.body.appendChild(themeSelector);
    }
}

// Create and export the login manager instance
const loginManager = new LoginManager();

// Theme changing function
window.changeTheme = (themeName) => {
    // Remove existing theme classes
    document.body.classList.remove(
        'theme-vapor', 'theme-noir', 'theme-mint', 'theme-laser'
    );
    
    // Add new theme class if specified
    if (themeName) {
        document.body.classList.add(`theme-${themeName}`);
        
        // Load the theme CSS file
        const existingThemeLink = document.getElementById('current-theme');
        if (existingThemeLink) {
            existingThemeLink.remove();
        }
        
        const themeLink = document.createElement('link');
        themeLink.id = 'current-theme';
        themeLink.rel = 'stylesheet';
        themeLink.href = `cssCustom/themes/${themeName}.css`;
        document.head.appendChild(themeLink);
    }
};

// Global functions for HTML onclick handlers
window.validateCredentials = () => loginManager.validateCredentials();
window.authenticateWithTOTP = () => loginManager.authenticateWithTOTP();
window.showAuthOptions = () => loginManager.showAuthOptions();
window.selectAuthMethod = (method) => {
    // Get the event from the global context
    const event = window.event || arguments.callee.caller.arguments[0];
    loginManager.selectAuthMethod(method, event);
};
window.backToAuthOptions = () => loginManager.backToAuthOptions();
window.authenticateWithCode = () => loginManager.authenticateWithCode();
window.generateTempCode = () => loginManager.generateTempCode();
window.backToLogin = () => loginManager.backToLogin();

// Export for module usage
export { loginManager };
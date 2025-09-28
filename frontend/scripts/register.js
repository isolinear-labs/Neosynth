// Registration system for NeoSynth Neural Authentication
const API_URL = '/api';

// Registration state
let currentStep = 1;
const registrationData = {
    username: '',
    password: '',
    totpSecret: '',
    backupCodes: [],
    deviceFingerprint: ''
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeDigitalRain();
    generateDeviceFingerprint();
    checkFirstTimeSetup();
});

// Check if this is first-time setup and update UI accordingly
async function checkFirstTimeSetup() {
    const urlParams = new URLSearchParams(window.location.search);
    const isFirstTimeSetup = urlParams.get('firstTimeSetup') === 'true';

    // Hide provision link during any registration flow
    const registerLink = document.querySelector('.register-link');
    if (registerLink) {
        registerLink.style.display = 'none';
    }

    if (isFirstTimeSetup) {
        // Update page title and messaging for first-time setup
        const title = document.querySelector('.terminal-header h1');
        const subtitle = document.querySelector('.terminal-description');

        if (title) {
            title.textContent = 'NEURAL ADMIN CREATION';
        }

        if (subtitle) {
            subtitle.innerHTML = `
                <div style="color: var(--interactive-highlight); margin-bottom: 10px;">
                    FIRST-TIME SYSTEM SETUP
                </div>
                Creating initial administrator account with maximum security protocols.
                This account will have full system access and administrative privileges.
            `;
        }

        // Add visual indicator
        const statusIndicator = document.createElement('div');
        statusIndicator.className = 'first-time-indicator';
        statusIndicator.innerHTML = `
            <div style="
                background: rgba(1, 255, 195, 0.1);
                border: 1px solid var(--interactive-highlight);
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
                text-align: center;
                color: var(--interactive-highlight);
                font-size: 0.9rem;
                text-transform: uppercase;
                letter-spacing: 1px;
            ">
                ADMIN PRIVILEGES WILL BE AUTOMATICALLY GRANTED
            </div>
        `;

        const form = document.querySelector('.terminal-form');
        if (form) {
            form.insertBefore(statusIndicator, form.firstChild);
        }
    }
}

// Digital Rain Implementation (simplified version)
function initializeDigitalRain() {
    const container = document.getElementById('digitalRain');
    const settings = {
        columnSpacing: 60,
        minColumns: 5,
        minRainLength: 5,
        maxRainLength: 15,
        newRainInterval: 2000
    };

    function createInitialRain() {
        const width = window.innerWidth;
        const numberOfColumns = Math.max(
            Math.floor(width / settings.columnSpacing), 
            settings.minColumns
        );
        
        for (let i = 0; i < numberOfColumns; i++) {
            createRainColumn(i, numberOfColumns);
        }
    }

    function createRainColumn(index, totalColumns) {
        const rain = document.createElement('div');
        rain.className = 'digit-rain';
        
        const columnWidth = window.innerWidth / totalColumns;
        const leftPosition = (index * columnWidth) + (Math.random() * (columnWidth * 0.8));
        
        rain.style.left = `${Math.max(0, leftPosition)}px`;
        rain.style.animationDuration = `${5 + Math.random() * 15}s`;
        rain.style.animationDelay = `${Math.random() * 2}s`;
        
        rain.innerHTML = generateRainContent();
        container.appendChild(rain);
    }

    function generateRainContent() {
        let content = '';
        const rainLength = settings.minRainLength + Math.random() * (settings.maxRainLength - settings.minRainLength);
        
        for (let j = 0; j < rainLength; j++) {
            content += Math.random() > 0.5 ? '1' : '0';
            if (j < rainLength - 1) content += '<br>';
        }
        
        return content;
    }

    function generateNewRain() {
        const rain = document.createElement('div');
        rain.className = 'digit-rain';
        rain.style.left = `${Math.random() * window.innerWidth}px`;
        rain.style.animationDuration = `${5 + Math.random() * 15}s`;
        rain.innerHTML = generateRainContent();
        
        container.appendChild(rain);
        
        const duration = parseFloat(rain.style.animationDuration) * 1000;
        setTimeout(() => {
            if (rain.parentNode) {
                rain.parentNode.removeChild(rain);
            }
        }, duration + 1000);
    }

    createInitialRain();
    setInterval(generateNewRain, settings.newRainInterval);
}

// Device fingerprinting for trusted device recognition
function generateDeviceFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Neural fingerprint', 2, 2);
    
    const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
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
    
    registrationData.deviceFingerprint = Math.abs(hash).toString(16);
    
    // Display device info
    const deviceInfo = `${navigator.platform} • ${navigator.userAgent.split(' ')[0]} • ID: ${registrationData.deviceFingerprint.substring(0, 8)}`;
    const deviceInfoElement = document.getElementById('deviceInfo');
    if (deviceInfoElement) {
        deviceInfoElement.textContent = deviceInfo;
    }
}

// Step navigation
function nextStep() {
    document.getElementById(`step${currentStep}`).classList.remove('active');
    currentStep++;
    document.getElementById(`step${currentStep}`).classList.add('active');
}

function showStatus(message, isError = false) {
    // Create or update status message
    let statusDiv = document.querySelector('.status-message');
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.className = 'status-message';
        document.querySelector('.step.active').appendChild(statusDiv);
    }
    
    statusDiv.textContent = message;
    statusDiv.style.color = isError ? '#ff0000' : '#00ff00';
    statusDiv.style.textAlign = 'center';
    statusDiv.style.margin = '10px 0';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (statusDiv.parentNode) {
            statusDiv.remove();
        }
    }, 5000);
}

// Step 1: Validate basic registration info
function validateBasicInfo() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Basic validation
    if (!username || !password || !confirmPassword) {
        showStatus('All fields are required', true);
        return;
    }
    
    if (username.length < 3) {
        showStatus('Username must be at least 3 characters', true);
        return;
    }
    
    if (password.length < 8) {
        showStatus('Password must be at least 8 characters', true);
        return;
    }
    
    if (password !== confirmPassword) {
        showStatus('Passwords do not match', true);
        return;
    }
    
    // Store data and move to TOTP setup
    registrationData.username = username;
    registrationData.password = password;
    
    setupTOTP();
}

// Step 2: Setup TOTP
async function setupTOTP() {
    try {
        // Generate TOTP secret on backend
        const response = await fetch(`${API_URL}/auth/setup-totp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: registrationData.username
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to setup TOTP');
        }
        
        const data = await response.json();
        registrationData.totpSecret = data.secret;
        
        // Display QR code
        document.getElementById('qrCode').innerHTML = `<img src="${data.qrCodeUrl}" alt="QR Code" style="max-width: 200px;">`;
        document.getElementById('secretKey').textContent = data.secret;
        
        nextStep();
        
    } catch (error) {
        console.error('TOTP setup error:', error);
        showStatus('Failed to setup neural authentication. Please try again.', true);
    }
}

// Step 2: Validate TOTP code
async function validateTOTP() {
    const totpCode = document.getElementById('totpCode').value.trim();
    
    if (!totpCode || totpCode.length !== 6) {
        showStatus('Please enter a 6-digit code', true);
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/verify-totp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                secret: registrationData.totpSecret,
                token: totpCode
            })
        });
        
        if (!response.ok) {
            throw new Error('Invalid TOTP code');
        }
        
        generateBackupCodes();
        
    } catch (error) {
        console.error('TOTP validation error:', error);
        showStatus('Invalid authentication code. Please try again.', true);
    }
}

// Step 3: Generate backup codes
function generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
        const code = Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + 
                    Math.random().toString(36).substring(2, 6).toUpperCase();
        codes.push(code);
    }
    
    registrationData.backupCodes = codes;
    
    const backupCodesContainer = document.getElementById('backupCodes');
    backupCodesContainer.innerHTML = codes.map(code => 
        `<div class="backup-code">${code}</div>`
    ).join('');
    
    nextStep();
}

// Download backup codes
function downloadBackupCodes() {
    const content = `NeoSynth Neural System - Emergency Access Codes
Generated: ${new Date().toISOString()}
Username: ${registrationData.username}

IMPORTANT: Keep these codes secure. Each can only be used once.

${registrationData.backupCodes.join('\n')}

Store these codes in a safe location separate from your device.`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neosynth-backup-codes-${registrationData.username}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Enable the complete registration button after download
    const completeBtn = document.getElementById('completeRegistrationBtn');
    if (completeBtn) {
        completeBtn.disabled = false;
        completeBtn.textContent = 'Complete Neural Registration ✓';
    }
    
    showStatus('Backup codes downloaded successfully');
}

// Complete registration
async function completeRegistration() {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: registrationData.username,
                password: registrationData.password,
                totpSecret: registrationData.totpSecret,
                backupCodes: registrationData.backupCodes,
                deviceFingerprint: registrationData.deviceFingerprint,
                deviceInfo: navigator.userAgent
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Registration failed');
        }
        
        const result = await response.json();
        
        // Store user data (session token now in httpOnly cookie)
        localStorage.setItem('neosynthUserId', result.userId);
        localStorage.setItem('neosynthDeviceToken', result.deviceToken);
        // Session token is now stored in httpOnly cookie by the server
        
        nextStep();
        
    } catch (error) {
        console.error('Registration error:', error);
        showStatus(error.message || 'Registration failed. Please try again.', true);
    }
}

// Redirect to login/main app
function redirectToLogin() {
    window.location.href = '/';
}

// Handle Enter key in form fields
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const activeStep = document.querySelector('.step.active');
        const button = activeStep.querySelector('.neural-button:not(.secondary)');
        if (button && !button.disabled) {
            button.click();
        }
    }
});
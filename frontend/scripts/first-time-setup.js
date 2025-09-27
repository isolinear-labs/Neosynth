// First-time setup page JavaScript

class FirstTimeSetup {
    constructor() {
        this.currentStep = 'welcome';
        this.setupData = {};
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkSetupStatus();
        this.initializeDigitalRain();
    }

    bindEvents() {
        // Welcome section buttons
        const beginSetupBtn = document.getElementById('beginSetupBtn');
        const enterSystemBtn = document.getElementById('enterSystemBtn');

        if (beginSetupBtn) {
            beginSetupBtn.addEventListener('click', () => this.beginSetup());
        }


        if (enterSystemBtn) {
            enterSystemBtn.addEventListener('click', () => this.enterSystem());
        }
    }

    async checkSetupStatus() {
        try {
            const response = await fetch('/api/auth/first-time-setup');
            const data = await response.json();

            if (!data.requiresSetup) {
                // Setup already completed, redirect to login
                this.showMessage('System already initialized. Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
                return;
            }

            // Update UI based on setup status
            this.updateSetupStatus(data);
        } catch (error) {
            console.error('Failed to check setup status:', error);
            this.showMessage('Failed to connect to server. Please check your connection.', 'error');
        }
    }

    updateSetupStatus(data) {
        const statusEl = document.getElementById('setupStatus');
        if (statusEl) {
            if (data.willCreateAdmin) {
                statusEl.innerHTML = `
                    <span class="status-indicator"></span>
                    Administrator Account Required
                `;
            } else if (data.autoAdminDisabled) {
                statusEl.innerHTML = `
                    <span class="status-indicator"></span>
                    Standard Account Setup (Admin Disabled)
                `;
            } else {
                statusEl.innerHTML = `
                    <span class="status-indicator"></span>
                    System Configuration Required
                `;
            }
        }
    }

    beginSetup() {
        this.showSection('adminSection');
        this.startAdminCreation();
    }


    startAdminCreation() {
        // For now, redirect to the existing registration flow
        // In a full implementation, this would show an inline form
        this.showMessage('Redirecting to secure registration...', 'success');
        setTimeout(() => {
            window.location.href = '/register?firstTimeSetup=true';
        }, 1500);
    }

    completeSetup() {
        this.showSection('completeSection');
        this.updateProgress(100);
    }

    enterSystem() {
        this.showMessage('Entering NeoSynth Neural System...', 'success');
        setTimeout(() => {
            window.location.href = '/';
        }, 1500);
    }

    showSection(sectionId) {
        // Hide all sections
        const sections = document.querySelectorAll('.setup-section');
        sections.forEach(section => section.classList.remove('active'));

        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        this.currentStep = sectionId;
    }

    updateProgress(percentage) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }

        if (progressText) {
            if (percentage <= 33) {
                progressText.textContent = 'Step 1 of 3: Account Details';
            } else if (percentage <= 66) {
                progressText.textContent = 'Step 2 of 3: Security Setup';
            } else {
                progressText.textContent = 'Step 3 of 3: Verification';
            }
        }
    }

    showMessage(message, type = 'success') {
        const statusMessage = document.getElementById('statusMessage');
        if (statusMessage) {
            statusMessage.textContent = message;
            statusMessage.className = `status-message ${type} show`;

            // Auto-hide after 5 seconds
            setTimeout(() => {
                statusMessage.classList.remove('show');
            }, 5000);
        }
    }

    initializeDigitalRain() {
        // Initialize digital rain effect if the script is available
        if (typeof initDigitalRain === 'function') {
            initDigitalRain();
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FirstTimeSetup();
});

// Fallback digital rain if module not available
if (typeof initDigitalRain === 'undefined') {
    function initDigitalRain() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const container = document.getElementById('digitalRain');

        if (!container) return;

        container.appendChild(canvas);

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const matrix = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%+-/~{[|`]}";
        const characters = matrix.split("");

        const fontSize = 10;
        const columns = canvas.width / fontSize;
        const drops = [];

        for (let x = 0; x < columns; x++) {
            drops[x] = 1;
        }

        function draw() {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#05d9e8';
            ctx.font = fontSize + 'px Courier New';

            for (let i = 0; i < drops.length; i++) {
                const text = characters[Math.floor(Math.random() * characters.length)];
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        }

        setInterval(draw, 35);

        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });
    }

    // Initialize digital rain
    document.addEventListener('DOMContentLoaded', initDigitalRain);
}
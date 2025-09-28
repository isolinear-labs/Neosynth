/**
 * Custom Theme Selector Component
 * Handles the interactive dropdown UI for theme selection
 */
export class ThemeSelector {
    constructor() {
        this.themeCurrentBtn = null;
        this.themeOptions = null;
        this.currentThemeName = null;
        this.isDropdownOpen = false;
        this.onThemeChangeCallback = null;
        this.currentTheme = 'default';
    }

    /**
	 * Initialize the theme selector
	 * @param {Function} onThemeChange - Callback when theme is selected
	 */
    init(onThemeChange) {
        this.onThemeChangeCallback = onThemeChange;
		
        // Setup DOM elements
        this.setupElements();
		
        // Setup event handlers
        this.setupEventHandlers();
		
        // Setup outside click handler
        this.setupOutsideClickHandler();
		
        console.log('Theme selector initialized');
    }

    /**
	 * Setup DOM element references
	 */
    setupElements() {
        this.themeCurrentBtn = document.getElementById('themeCurrentBtn');
        this.themeOptions = document.getElementById('themeOptions');
        this.currentThemeName = document.getElementById('currentThemeName');
		
        if (!this.themeCurrentBtn || !this.themeOptions || !this.currentThemeName) {
            console.error('Theme selector elements not found in DOM');
            throw new Error('Required theme selector elements missing from DOM');
        }
    }

    /**
	 * Setup event handlers for the dropdown
	 */
    setupEventHandlers() {
        // Dropdown toggle
        this.themeCurrentBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });

        // Theme option selection
        const themeOptionElements = this.themeOptions.querySelectorAll('.theme-option');
        themeOptionElements.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const themeName = option.dataset.theme;
                this.selectTheme(themeName);
            });
        });
    }

    /**
	 * Setup click outside and keyboard handlers
	 */
    setupOutsideClickHandler() {
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.theme-selector-wrapper') && this.isDropdownOpen) {
                this.closeDropdown();
            }
        });
		
        // Close dropdown on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isDropdownOpen) {
                this.closeDropdown();
            }
        });
    }

    /**
	 * Toggle dropdown open/close
	 */
    toggleDropdown() {
        if (this.isDropdownOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    /**
	 * Open the dropdown
	 */
    openDropdown() {
        this.themeCurrentBtn.classList.add('open');
        this.themeOptions.classList.add('show');
        this.isDropdownOpen = true;
		
        // Add subtle animation delay for better UX
        setTimeout(() => {
            this.themeOptions.style.pointerEvents = 'auto';
        }, 100);
    }

    /**
	 * Close the dropdown
	 */
    closeDropdown() {
        this.themeCurrentBtn.classList.remove('open');
        this.themeOptions.classList.remove('show');
        this.themeOptions.style.pointerEvents = 'none';
        this.isDropdownOpen = false;
    }

    /**
	 * Select a theme from dropdown
	 * @param {string} themeName - Theme to select
	 */
    selectTheme(themeName) {
        if (!this.isValidTheme(themeName)) {
            console.error('Invalid theme name:', themeName);
            return;
        }

        // Update current theme
        this.currentTheme = themeName;
		
        // Update active state in dropdown
        this.updateActiveThemeOption(themeName);
		
        // Update display
        this.updateCurrentThemeDisplay();
		
        // Notify theme manager
        if (this.onThemeChangeCallback) {
            this.onThemeChangeCallback(themeName);
        }
		
        // Close dropdown with slight delay for visual feedback
        setTimeout(() => {
            this.closeDropdown();
        }, 150);
    }

    /**
	 * Update which theme option is marked as active
	 * @param {string} themeName - Active theme name
	 */
    updateActiveThemeOption(themeName) {
        const themeOptionElements = this.themeOptions.querySelectorAll('.theme-option');
		
        themeOptionElements.forEach(option => {
            if (option.dataset.theme === themeName) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    }

    /**
	 * Update the current theme display
	 */
    updateCurrentThemeDisplay() {
        const themeDisplayName = this.getThemeDisplayName(this.currentTheme);
        if (this.currentThemeName) {
            this.currentThemeName.textContent = themeDisplayName;
        }
    }

    /**
	 * Set current theme (called from theme manager)
	 * @param {string} themeName - Theme name to set as current
	 */
    setCurrentTheme(themeName) {
        if (!this.isValidTheme(themeName)) {
            console.error('Invalid theme name:', themeName);
            return;
        }

        this.currentTheme = themeName;
        this.updateCurrentThemeDisplay();
        this.updateActiveThemeOption(themeName);
    }

    /**
	 * Get current theme
	 * @returns {string} - Current theme name
	 */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
	 * Check if theme name is valid
	 * @param {string} themeName - Theme name to validate
	 * @returns {boolean} - True if valid
	 */
    isValidTheme(themeName) {
        const validThemes = [
            'default',
            'vapor',
            'quantum',
            'noir',
            'mint',
            'laser',
            'toxic'
        ];
        return validThemes.includes(themeName);
    }

    /**
	 * Get display name for theme
	 * @param {string} themeName - Theme internal name
	 * @returns {string} - Display name
	 */
    getThemeDisplayName(themeName) {
        const displayNames = {
            'default': 'Default',
            'vapor': 'Vapor Dream',
            'quantum': 'Quantum Flux',
            'noir': 'Neon Noir',
            'mint': 'Vapor Mint',
            'laser': 'Laser Grid',
            'toxic': 'Toxic Waste'
        };
        return displayNames[themeName] || themeName;
    }

    /**
	 * Get all available themes with metadata
	 * @returns {Array} - Array of theme objects
	 */
    getAvailableThemes() {
        return [
            { 
                id: 'default', 
                name: 'Default',
                description: 'Classic NeoSynth blue/pink theme'
            },
            { 
                id: 'vapor', 
                name: 'Vapor Dream',
                description: 'Soft purple/pink aesthetic with dreamy vibes'
            },
            { 
                id: 'quantum', 
                name: 'Quantum Flux',
                description: 'High-tech purple/cyan/lime energy'
            },
            { 
                id: 'noir', 
                name: 'Neon Noir',
                description: 'High contrast white/red/black film noir'
            },
            { 
                id: 'mint', 
                name: 'Vapor Mint',
                description: 'Fresh mint/pink/purple retro-futuristic'
            },
            { 
                id: 'laser', 
                name: 'Laser Grid',
                description: 'Hot pink/electric blue retro gaming'
            },
            { 
                id: 'toxic', 
                name: 'Toxic Waste',
                description: 'Radioactive green/yellow hazardous energy'
            }
        ];
    }

    /**
	 * Add theme change animation effect
	 */
    animateThemeChange() {
        // Add a subtle pulse effect to the current theme display
        if (this.currentThemeName) {
            this.currentThemeName.style.animation = 'themePulse 0.6s ease';
			
            setTimeout(() => {
                this.currentThemeName.style.animation = '';
            }, 600);
        }
		
        // Add pulse animation CSS if not present
        if (!document.getElementById('theme-selector-animations')) {
            const style = document.createElement('style');
            style.id = 'theme-selector-animations';
            style.textContent = `
				@keyframes themePulse {
					0% { 
						transform: scale(1);
						text-shadow: 0 0 8px var(--neon-cyan);
					}
					50% { 
						transform: scale(1.05);
						text-shadow: 0 0 15px var(--neon-cyan), 0 0 25px var(--neon-yellow);
					}
					100% { 
						transform: scale(1);
						text-shadow: 0 0 8px var(--neon-cyan);
					}
				}
			`;
            document.head.appendChild(style);
        }
    }

    /**
	 * Force close dropdown (useful for cleanup)
	 */
    forceClose() {
        if (this.isDropdownOpen) {
            this.closeDropdown();
        }
    }

    /**
	 * Destroy the theme selector (cleanup)
	 */
    destroy() {
        // Remove event listeners would go here if needed
        this.forceClose();
		
        // Clear references
        this.themeCurrentBtn = null;
        this.themeOptions = null;
        this.currentThemeName = null;
        this.onThemeChangeCallback = null;
    }
}
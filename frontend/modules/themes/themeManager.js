// frontend/modules/themes/themeManager.js

import debug from '../debugLogger/debugLogger.js';
import { digitalRainManager } from '../effects/index.js';

class MintPixelEffect {
    constructor(footerElement) {
        this.footer = footerElement;
        this.pixels = [];
        this.isActive = false;
        this.interval = null;
        this.regenerateInterval = null;
    }

    init() {
        this.isActive = true;
        this.generatePixels();
		
        // Regenerate pixels every 6 seconds for variety
        this.regenerateInterval = setInterval(() => {
            if (this.isActive) {
                this.generatePixels();
            }
        }, 6000);
    }

    generatePixels() {
        // Clear existing pixels
        this.pixels.forEach(pixel => {
            if (pixel.parentNode) {
                pixel.remove();
            }
        });
        this.pixels = [];

        // Create 8-12 random pixels (more than crystals for pixel effect)
        const numPixels = 8 + Math.floor(Math.random() * 5);
		
        for (let i = 0; i < numPixels; i++) {
            const pixel = document.createElement('div');
            pixel.className = 'mint-pixel';
			
            // Add size variation
            const sizeRandom = Math.random();
            if (sizeRandom > 0.7) {
                pixel.classList.add('large');
            } else if (sizeRandom < 0.3) {
                pixel.classList.add('small');
            }
			
            // Random position - avoid center content area
            let leftPos;
            if (Math.random() > 0.5) {
                leftPos = 5 + Math.random() * 30; // Left side: 5% to 35%
            } else {
                leftPos = 65 + Math.random() * 30; // Right side: 65% to 95%
            }
			
            const bottomPos = 3 + Math.random() * 35; // 3px to 38px from bottom
            const delay = Math.random() * 2.5; // 0-2.5s delay
			
            pixel.style.left = leftPos + '%';
            pixel.style.bottom = bottomPos + 'px';
            pixel.style.animationDelay = delay + 's';
			
            this.footer.appendChild(pixel);
            this.pixels.push(pixel);
        }
    }

    destroy() {
        this.isActive = false;
		
        if (this.regenerateInterval) {
            clearInterval(this.regenerateInterval);
            this.regenerateInterval = null;
        }
		
        this.pixels.forEach(pixel => {
            if (pixel.parentNode) {
                pixel.remove();
            }
        });
        this.pixels = [];
    }
}

export class ThemeManager {
    constructor() {
        this.currentTheme = 'default';
        this.storageKey = 'neosynthTheme';
        this.digitalRainContainer = null;
        this.userId = null;
        this.showStatus = null;
        this.mintPixels = null;
    }

    /**
	 * Initialize the theme manager
	 * @param {string} userId - Current user ID for preferences
	 * @param {Function} showStatus - Status message function
	 */
    init(userId, showStatus) {
        this.userId = userId;
        this.showStatus = showStatus;
        this.digitalRainContainer = document.getElementById('digitalRain');
		
        // Load saved theme
        this.loadSavedTheme();
		
        // Apply initial theme
        this.applyTheme(this.currentTheme);
		
        // Setup dynamic effects
        this.setupDynamicEffects();

        console.log(`Theme manager initialized with theme: ${this.currentTheme}`);
    }

    /**
	 * Set and apply a new theme
	 * @param {string} themeName - Name of the theme to apply
	 */
    setTheme(themeName) {
        if (!themeName) {
            console.error('Theme name is required');
            return false;
        }

        const oldTheme = this.currentTheme;
        this.currentTheme = themeName;

        // Apply theme with transition
        this.applyThemeWithTransition(themeName, oldTheme);

        // Save theme
        this.saveTheme(themeName);

        // Show status message
        if (this.showStatus) {
            const themeDisplayName = this.getThemeDisplayName(themeName);
            this.showStatus(`Theme changed to ${themeDisplayName}`);
        }

        console.log(`Theme changed from ${oldTheme} to ${themeName}`);
        return true;
    }

    /**
	 * Apply theme with smooth transition
	 * @param {string} newTheme - New theme to apply
	 * @param {string} _oldTheme - Previous theme
	 */
    applyThemeWithTransition(newTheme, _oldTheme) {
        // Add transition class
        document.body.classList.add('theme-transitioning');
		
        // Apply the new theme
        this.applyTheme(newTheme);
		
        // Update digital rain color using new manager
        this.updateDigitalRainTheme(newTheme);
		
        // Remove transition class after animation
        setTimeout(() => {
            document.body.classList.remove('theme-transitioning');
        }, 500);
    }

    /**
	 * Apply theme class to body
	 * @param {string} themeName - Theme to apply
	 */
    applyTheme(themeName) {
        // Remove all existing theme classes dynamically
        const classList = Array.from(document.body.classList);
        classList.forEach(className => {
            if (className.startsWith('theme-')) {
                document.body.classList.remove(className);
            }
        });
		
        // Apply new theme class (except for default)
        if (themeName !== 'default') {
            document.body.classList.add(`theme-${themeName}`);
        }
		
        // Update CSS custom properties for dynamic elements
        this.updateThemeProperties(themeName);
    }

    /**
	 * Update CSS custom properties based on theme
	 * @param {string} themeName - Current theme
	 */
    updateThemeProperties(themeName) {
        const root = document.documentElement;
		
        // Theme-specific property updates
        switch (themeName) {
        case 'vapor':
            root.style.setProperty('--theme-filter', 'blur(0.5px) brightness(1.1)');
            break;
        case 'synthwave':
            root.style.setProperty('--theme-filter', 'contrast(1.2) saturate(1.1)');
            break;
        case 'quantum':
            root.style.setProperty('--theme-filter', 'brightness(1.1) saturate(1.2)');
            break;
        case 'noir':
            root.style.setProperty('--theme-filter', 'contrast(1.3) brightness(0.9)');
            break;
        case 'mint':
            root.style.setProperty('--theme-filter', 'brightness(1.1) hue-rotate(5deg)');
            this.initMintCrystals();
            break;
        case 'laser':
            root.style.setProperty('--theme-filter', 'saturate(1.4) brightness(1.2)');
            break;
        case 'toxic':
            root.style.setProperty('--theme-filter', 'brightness(1.2) saturate(1.5)');
            break;
        default:
            root.style.setProperty('--theme-filter', 'none');
            this.cleanupMintCrystals();
        }
        if (themeName !== 'mint') {
            this.cleanupMintCrystals();
        }
    }

    initMintCrystals() {
        // Clean up existing effects first
        this.cleanupMintCrystals();
		
        const footer = document.querySelector('.footer');
        if (footer) {
            this.mintPixels = new MintPixelEffect(footer); // Changed from mintCrystals
            this.mintPixels.init();
            debug.log('Mint pixel effect initialized');
        }
    }

    cleanupMintCrystals() {
        if (this.mintPixels) { // Changed from mintCrystals
            this.mintPixels.destroy();
            this.mintPixels = null;
            debug.log('Mint pixel effect cleaned up');
        }
    }

    /**
	 * Update digital rain to match theme
	 * @param {string} themeName - Current theme
	 */
    updateDigitalRainTheme(themeName) {
        // Use the new rain manager
        if (digitalRainManager && digitalRainManager.updateTheme) {
            digitalRainManager.updateTheme();
            return;
        }
		
        // Fallback to the old method if rain manager is not available
        console.warn('Digital rain manager not available, using fallback method');
		
        if (!this.digitalRainContainer) {
            this.digitalRainContainer = document.getElementById('digitalRain');
        }
		
        if (!this.digitalRainContainer) return;
		
        const rainElements = this.digitalRainContainer.querySelectorAll('.digit-rain');
		
        rainElements.forEach(element => {
            // Remove existing theme classes
            element.classList.remove(
                'rain-vapor', 'rain-synthwave', 'rain-quantum',
                'rain-noir', 'rain-mint', 'rain-laser', 'rain-toxic'
            );
			
            // Add new theme class
            if (themeName !== 'default') {
                element.classList.add(`rain-${themeName}`);
            }
        });
    }

    /**
	 * Setup dynamic effects that respond to themes
	 */
    setupDynamicEffects() {
        // Add transition CSS if not present
        if (!document.getElementById('theme-transitions')) {
            const style = document.createElement('style');
            style.id = 'theme-transitions';
            style.textContent = `
				/* Theme transition effects */
				body.theme-transitioning {
					transition: background 0.5s ease, color 0.3s ease;
				}
				
				body.theme-transitioning *,
				body.theme-transitioning *::before,
				body.theme-transitioning *::after {
					transition: 
						background-color 0.3s ease,
						border-color 0.3s ease,
						box-shadow 0.3s ease,
						text-shadow 0.3s ease,
						color 0.3s ease !important;
				}
				
				/* Enhanced digital rain theme classes */
				.digit-rain.rain-vapor {
					color: #ff71ce;
					text-shadow: 0 0 10px #ff71ce, 0 0 20px #ff71ce;
					animation-duration: 8s;
				}
				
				.digit-rain.rain-synthwave {
					color: #00ffff;
					text-shadow: 0 0 8px #00ffff, 0 0 16px #ff00ff;
					animation-duration: 6s;
				}
				
				.digit-rain.rain-quantum {
					color: #88ff00;
					text-shadow: 0 0 12px #88ff00, 0 0 24px #aa00ff;
					animation-duration: 7s;
				}
				
				.digit-rain.rain-noir {
					color: #ffffff;
					text-shadow: 0 0 15px #ffffff, 0 0 30px #ff0055;
					animation-duration: 7s;
					opacity: 0.6;
				}
				
				.digit-rain.rain-mint {
					color: #00ffaa;
					text-shadow: 0 0 12px #00ffaa, 0 0 24px #ff77aa;
					animation-duration: 9s;
				}
				
				.digit-rain.rain-laser {
					color: #ff0080;
					text-shadow: 0 0 10px #ff0080, 0 0 20px #0080ff;
					animation-duration: 5s;
				}
				
				.digit-rain.rain-toxic {
					color: #39ff14;
					text-shadow: 0 0 15px #39ff14, 0 0 30px #ffff00;
					animation-duration: 4s;
				}
			`;
            document.head.appendChild(style);
        }
    }

    /**
	 * Load saved theme from localStorage
	 */
    loadSavedTheme() {
        try {
            const savedTheme = localStorage.getItem(this.storageKey);
            if (savedTheme) {
                this.currentTheme = savedTheme;
            }
        } catch (error) {
            console.warn('Could not load saved theme:', error);
        }
    }

    /**
	 * Save theme to localStorage
	 * @param {string} themeName - Theme to save
	 */
    saveTheme(themeName) {
        try {
            localStorage.setItem(this.storageKey, themeName);
        } catch (error) {
            console.error('Error saving theme:', error);
        }
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
            'synthwave': 'Synthwave',
            'quantum': 'Quantum Flux',
            'noir': 'Neon Noir',
            'mint': 'Vapor Mint',
            'laser': 'Laser Grid',
            'toxic': 'Toxic Waste'
        };
        return displayNames[themeName] || themeName;
    }

    /**
	 * Get current theme
	 * @returns {string} - Current theme name
	 */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
	 * Create ripple effect for theme changes
	 * @param {string} themeName - Theme to animate to
	 */
    animateThemeChange(themeName) {
        // Create a ripple effect for theme changes
        const ripple = document.createElement('div');
        ripple.style.cssText = `
			position: fixed;
			top: 50%;
			left: 50%;
			width: 0;
			height: 0;
			border-radius: 50%;
			background: radial-gradient(circle, 
				var(--interactive-highlight), 
				var(--primary-accent), 
				transparent
			);
			opacity: 0.3;
			pointer-events: none;
			z-index: 9999;
			transform: translate(-50%, -50%);
			animation: themeRipple 1s ease-out forwards;
		`;
		
        document.body.appendChild(ripple);
		
        // Apply theme after brief delay
        setTimeout(() => {
            this.setTheme(themeName);
        }, 250);
		
        // Remove ripple after animation
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 1000);
		
        // Add ripple animation CSS if not present
        if (!document.getElementById('theme-ripple-animation')) {
            const style = document.createElement('style');
            style.id = 'theme-ripple-animation';
            style.textContent = `
				@keyframes themeRipple {
					0% {
						width: 0;
						height: 0;
						opacity: 0.3;
					}
					50% {
						opacity: 0.6;
					}
					100% {
						width: 200vw;
						height: 200vw;
						opacity: 0;
					}
				}
			`;
            document.head.appendChild(style);
        }
    }
}
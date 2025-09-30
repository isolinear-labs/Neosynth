/**
 * Settings System Module - Updated with Collapsible Theme Selector
 * Handles the full-screen settings panel with various user preferences
 */

import { digitalRainManager as _digitalRainManager } from '../effects/index.js';
import { featureManager } from '../features/index.js';

export class SettingsSystem {
    constructor() {
        this.isOpen = false;
        this.isThemeSelectorOpen = false;
        this.settingsPanel = null;
        this.overlay = null;
        this.mainContent = null;
        this.footer = null;
        this.themeSystem = null;
        this.userId = null;
        this.showStatus = null;
        this.preferences = {
            theme: 'default',
            videoDisplay: true,
            autoSave: true,
            autoSaveTheme: true,
            volume: 100
        };
    }

    /**
	 * Initialize the settings system
	 * @param {Object} options - Configuration options
	 */
    async init(options = {}) {
        this.themeSystem = options.themeSystem;
        this.userId = options.userId;
        this.showStatus = options.showStatus;
		
        this.createSettingsPanel();
        this.setupEventHandlers();
        await this.loadDynamicThemes();
        await this.loadPreferences();
		
        console.log('Settings system initialized');
    }

    /**
	 * Create the settings panel HTML structure
	 */
    createSettingsPanel() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'overlay';
        this.overlay.id = 'settingsOverlay';
		
        // Create settings panel
        this.settingsPanel = document.createElement('div');
        this.settingsPanel.className = 'settings-panel';
        this.settingsPanel.id = 'settingsPanel';
		
        this.settingsPanel.innerHTML = `
			<div class="settings-header">
				<h2>SETTINGS</h2>
				<button class="close-btn" id="settingsCloseBtn">✕</button>
			</div>
			
			<div class="settings-content">
				<div class="settings-group">
					<div class="group-title">Interface & Display</div>
					
					<div class="setting-item">
						<div class="setting-row">
							<div>
								<div class="setting-label">Theme Variant</div>
								<div class="setting-description">Choose your preferred cyberpunk color scheme</div>
							</div>
						</div>
						<div class="theme-selector-wrapper">
							<div class="theme-current" id="themeCurrentBtn">
								<div class="theme-current-info">
									<div class="theme-current-label">THEME</div>
									<div class="theme-current-name" id="currentThemeName">Default</div>
								</div>
								<div class="theme-dropdown-arrow">▼</div>
							</div>
							<div class="theme-options-container" id="themeOptionsContainer">
								<div class="theme-grid" id="settingsThemeGrid">
									<div class="theme-card active" data-theme="default">
										<div class="theme-info">
											<div class="theme-name">Default</div>
											<div class="theme-desc">Classic NeoSynth blue/pink theme</div>
										</div>
									</div>
									<div class="theme-card" data-theme="vapor">
										<div class="theme-info">
											<div class="theme-name">Vapor Dream</div>
											<div class="theme-desc">Soft purple/pink aesthetic with dreamy vibes</div>
										</div>
									</div>
									<div class="theme-card" data-theme="noir">
										<div class="theme-info">
											<div class="theme-name">Neon Noir</div>
											<div class="theme-desc">High contrast white/red/black film noir</div>
										</div>
									</div>
									<div class="theme-card" data-theme="mint">
										<div class="theme-info">
											<div class="theme-name">Vapor Mint</div>
											<div class="theme-desc">Fresh mint/pink/purple retro-futuristic</div>
										</div>
									</div>
									<div class="theme-card" data-theme="laser">
										<div class="theme-info">
											<div class="theme-name">Laser Grid</div>
											<div class="theme-desc">Hot pink/electric blue retro gaming</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>



				</div>

				<div class="settings-group">
					<div class="group-title">Playback Behavior</div>
					
					<div class="setting-item">
						<div class="setting-row">
							<div>
								<div class="setting-label">Show Video Content</div>
								<div class="setting-description">Display video files visually (when off, only audio plays)</div>
							</div>
							<div class="toggle-switch active" id="videoDisplayToggle">
								<div class="toggle-indicator toggle-off">OFF</div>
								<div class="toggle-indicator toggle-on">ON</div>
							</div>
						</div>
					</div>


				</div>

				<div class="settings-group" id="experimentalFeaturesGroup" style="display: none;">
					<div class="group-title">Experimental Features</div>
					
					<div class="setting-item">
						<div class="setting-row">
							<div>
								<div class="setting-label">Experimental Themes</div>
								<div class="setting-description">Enable access to experimental theme variants (admin only)</div>
							</div>
							<div class="experimental-feature-status" id="experimentalThemesStatus">
								<span class="status-text">Not Available</span>
							</div>
						</div>
					</div>
				</div>

				<div class="settings-group">
					<div class="group-title">Data & Privacy</div>
					
					<div class="setting-item" style="display: none;">
						<div class="setting-row">
							<div>
								<div class="setting-label">Auto-save Playlists</div>
								<div class="setting-description">Automatically save playlist changes</div>
							</div>
							<div class="toggle-switch active" id="autoSaveToggle">
								<div class="toggle-indicator toggle-off">OFF</div>
								<div class="toggle-indicator toggle-on">ON</div>
							</div>
						</div>
					</div>

					<div class="setting-item">
						<div class="setting-row">
							<div>
								<div class="setting-label">Auto-save Theme</div>
								<div class="setting-description">Automatically save theme changes to profile</div>
							</div>
							<div class="toggle-switch active" id="autoSaveThemeToggle">
								<div class="toggle-indicator toggle-off">OFF</div>
								<div class="toggle-indicator toggle-on">ON</div>
							</div>
						</div>
					</div>

					<div class="setting-item">
						<div class="setting-row">
							<div>
								<div class="setting-label">Play History</div>
								<div class="setting-description">Clear all play count metrics and listening history</div>
							</div>
							<button class="action-btn danger" id="resetPlayHistoryBtn">Clear Play History</button>
						</div>
					</div>

				</div>
			</div>

			<div class="settings-actions">
				<button class="action-btn" id="saveSettingsBtn">Save Changes</button>
				<button class="action-btn danger" id="resetSettingsBtn">Reset to Defaults</button>
			</div>
		`;
		
        // Add the CSS for the collapsible theme selector
        this.addCollapsibleThemeSelectorCSS();
		
        // Append to body
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.settingsPanel);
		
        // Get main content and footer references
        this.mainContent = document.querySelector('.container');
        this.footer = document.querySelector('.footer');
    }

    /**
	 * Add CSS for the collapsible theme selector
	 */
    addCollapsibleThemeSelectorCSS() {
        if (document.getElementById('settings-collapsible-theme-css')) return;
		
        const style = document.createElement('style');
        style.id = 'settings-collapsible-theme-css';
        style.textContent = `
			.theme-selector-wrapper {
				margin-top: 15px;
				position: relative;
				z-index: 10;
				overflow: visible;
			}
			
			.theme-current {
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding: 15px 20px;
				background: rgba(0, 0, 0, 0.6);
				backdrop-filter: blur(10px);
				border: 2px solid var(--interactive-highlight);
				border-radius: 8px;
				cursor: pointer;
				transition: all 0.3s ease;
				user-select: none;
				clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);
			}
			
			.theme-current:hover {
				background: rgba(0, 0, 0, 0.8);
				border-color: var(--primary-accent);
				box-shadow: 0 0 20px rgba(5, 217, 232, 0.4);
				transform: translateY(-2px);
			}
			
			.theme-current.open {
				border-bottom-left-radius: 0;
				border-bottom-right-radius: 0;
				border-bottom: none;
				box-shadow: 0 0 25px rgba(5, 217, 232, 0.6);
				clip-path: polygon(15px 0, 100% 0, 100% 100%, 0 100%, 0 15px);
			}
			
			.theme-current-info {
				display: flex;
				flex-direction: column;
				gap: 4px;
				flex: 1;
			}
			
			.theme-current-label {
				color: var(--interactive-highlight);
				font-size: 0.7rem;
				text-transform: uppercase;
				letter-spacing: 2px;
				font-weight: bold;
				text-shadow: 0 0 8px var(--interactive-highlight);
				line-height: 1;
			}
			
			.theme-current-name {
				color: var(--warning-accent);
				font-weight: bold;
				font-size: 1.1rem;
				line-height: 1.2;
				text-shadow: 0 0 10px var(--warning-accent);
				text-transform: uppercase;
				letter-spacing: 1px;
				transition: all 0.3s ease;
			}
			
			.theme-dropdown-arrow {
				color: var(--interactive-highlight);
				font-size: 1rem;
				transition: transform 0.3s ease, color 0.3s ease;
				margin-left: 15px;
				text-shadow: 0 0 8px var(--interactive-highlight);
			}
			
			.theme-current.open .theme-dropdown-arrow {
				transform: rotate(180deg);
				color: var(--primary-accent);
				text-shadow: 0 0 8px var(--primary-accent);
			}
			
			.theme-options-container {
				position: absolute;
				top: 100%;
				left: 0;
				right: 0;
				background: rgba(0, 0, 0, 0.95);
				backdrop-filter: blur(15px);
				border: 2px solid var(--interactive-highlight);
				border-top: none;
				border-radius: 0 0 8px 8px;
				z-index: 1000;
				max-height: 0;
				overflow: hidden;
				transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
				opacity: 0;
				transform: translateY(-10px);
				box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
				clip-path: polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%);
			}
			
			.theme-options-container.show {
				max-height: 400px;
				opacity: 1;
				transform: translateY(0);
			}
			
			.theme-grid {
				display: grid;
				grid-template-columns: 1fr;
				gap: 0;
				max-height: 380px;
				overflow-y: auto;
				padding: 8px;
				scrollbar-width: thin;
				scrollbar-color: var(--interactive-highlight) rgba(13, 2, 33, 0.4);
			}
			
			.theme-grid::-webkit-scrollbar {
				width: 6px;
			}
			
			.theme-grid::-webkit-scrollbar-track {
				background: rgba(13, 2, 33, 0.4);
			}
			
			.theme-grid::-webkit-scrollbar-thumb {
				background: var(--interactive-highlight);
				border-radius: 3px;
			}
			
			.theme-grid::-webkit-scrollbar-thumb:hover {
				background: var(--primary-accent);
			}
			
			.theme-card {
				display: flex;
				align-items: center;
				padding: 12px 15px;
				background: rgba(26, 0, 51, 0.6);
				border: 1px solid rgba(0, 255, 255, 0.3);
				border-radius: 6px;
				cursor: pointer;
				transition: all 0.3s ease;
				position: relative;
				overflow: hidden;
				margin-bottom: 6px;
			}
			
			.theme-card:last-child {
				margin-bottom: 0;
			}
			
			.theme-card:hover {
				border-color: var(--interactive-highlight);
				background: rgba(26, 0, 51, 0.8);
				transform: translateX(5px);
				box-shadow: 0 4px 15px rgba(0, 255, 255, 0.4);
			}
			
			.theme-card.active {
				border-color: var(--warning-accent);
				background: rgba(255, 255, 0, 0.15);
				box-shadow: 0 0 15px rgba(255, 255, 0, 0.5);
			}
			
			.theme-card.active::before {
				content: '✓';
				position: absolute;
				top: 50%;
				right: 15px;
				transform: translateY(-50%);
				color: var(--warning-accent);
				font-weight: bold;
				font-size: 14px;
				text-shadow: 0 0 10px var(--warning-accent);
			}
			
			.theme-info {
				flex: 1;
				min-width: 0;
			}
			
			.theme-name {
				font-weight: bold;
				font-size: 0.9rem;
				color: #ffffff;
				margin-bottom: 4px;
				text-transform: uppercase;
				letter-spacing: 0.5px;
				text-shadow: 0 0 8px rgba(0, 255, 255, 0.6);
			}
			
			.theme-desc {
				font-size: 0.75rem;
				color: rgba(255, 255, 255, 0.9);
				line-height: 1.3;
				text-shadow: 0 0 4px rgba(0, 255, 255, 0.4);
			}
			
			/* Theme-specific hover effects */
			.theme-card[data-theme="vapor"]:hover:not(.active) {
				border-color: #ff71ce;
				box-shadow: 0 4px 15px rgba(255, 113, 206, 0.3);
			}
			
			.theme-card[data-theme="quantum"]:hover:not(.active) {
				border-color: #aa00ff;
				box-shadow: 0 4px 15px rgba(170, 0, 255, 0.3);
			}
			
			.theme-card[data-theme="noir"]:hover:not(.active) {
				border-color: #ffffff;
				box-shadow: 0 4px 15px rgba(255, 255, 255, 0.3);
			}
			
			.theme-card[data-theme="mint"]:hover:not(.active) {
				border-color: #00ffaa;
				box-shadow: 0 4px 15px rgba(0, 255, 170, 0.3);
			}
			
			.theme-card[data-theme="laser"]:hover:not(.active) {
				border-color: #ff0080;
				box-shadow: 0 4px 15px rgba(255, 0, 128, 0.3);
			}
			
			.theme-card[data-theme="toxic"]:hover:not(.active) {
				border-color: #39ff14;
				box-shadow: 0 4px 15px rgba(57, 255, 20, 0.3);
			}
			
			/* Mobile responsive */
			@media (max-width: 768px) {
				.theme-current {
					padding: 12px 16px;
				}
				
				.theme-current-label {
					font-size: 0.65rem;
				}
				
				.theme-current-name {
					font-size: 1rem;
				}
				
				.theme-card {
					padding: 10px 12px;
				}
				
				.theme-name {
					font-size: 0.85rem;
				}
				
				.theme-desc {
					font-size: 0.7rem;
				}
				
				.theme-options-container.show {
					max-height: 300px;
				}
			}

			/* Experimental Features Styles */
			.experimental-feature-status {
				display: flex;
				align-items: center;
				gap: 8px;
			}

			.status-text {
				font-size: 0.85rem;
				font-weight: bold;
				text-transform: uppercase;
				letter-spacing: 1px;
				padding: 4px 12px;
				border-radius: 4px;
				border: 1px solid;
			}

			.status-text.enabled {
				color: var(--warning-accent);
				border-color: var(--warning-accent);
				background: rgba(255, 230, 0, 0.1);
				text-shadow: 0 0 8px var(--warning-accent);
			}

			.status-text.disabled {
				color: rgba(255, 255, 255, 0.5);
				border-color: rgba(255, 255, 255, 0.3);
				background: rgba(0, 0, 0, 0.3);
			}
		`;
        document.head.appendChild(style);
    }

    /**
	 * Setup event handlers for the settings panel
	 */
    setupEventHandlers() {
        // Open/close handlers
        this.overlay.addEventListener('click', () => this.close());
		
        const closeBtn = document.getElementById('settingsCloseBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Theme selector handlers
        this.setupThemeSelectorHandlers();

        // Toggle switches
        this.setupToggleHandlers();


        // Action buttons
        const saveBtn = document.getElementById('saveSettingsBtn');
        const resetBtn = document.getElementById('resetSettingsBtn');
        const resetPlayHistoryBtn = document.getElementById('resetPlayHistoryBtn');
		
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSettings());
        }
		
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetSettings());
        }
        
        if (resetPlayHistoryBtn) {
            resetPlayHistoryBtn.addEventListener('click', () => this.resetPlayHistory());
        }

        // Keyboard handlers
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                if (this.isThemeSelectorOpen) {
                    this.closeThemeSelector();
                } else {
                    this.close();
                }
            }
        });

        // Close theme selector when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isThemeSelectorOpen && !e.target.closest('.theme-selector-wrapper')) {
                this.closeThemeSelector();
            }
        });

        // Prevent body scroll when panel is open
        this.settingsPanel.addEventListener('wheel', (e) => {
            e.stopPropagation();
        }, { passive: true });
    }

    /**
	 * Setup handlers for the collapsible theme selector
	 */
    setupThemeSelectorHandlers() {
        const themeCurrentBtn = document.getElementById('themeCurrentBtn');
        const themeCards = document.querySelectorAll('.theme-card');
		
        // Toggle theme selector
        if (themeCurrentBtn) {
            themeCurrentBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleThemeSelector();
            });
        }
		
        // Theme card selection
        themeCards.forEach(card => {
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                const themeName = card.dataset.theme;
                this.selectTheme(themeName);
                this.closeThemeSelector();
            });
        });
    }

    /**
	 * Toggle the theme selector dropdown
	 */
    toggleThemeSelector() {
        if (this.isThemeSelectorOpen) {
            this.closeThemeSelector();
        } else {
            this.openThemeSelector();
        }
    }

    /**
	 * Open the theme selector dropdown
	 */
    openThemeSelector() {
        const themeCurrentBtn = document.getElementById('themeCurrentBtn');
        const themeOptionsContainer = document.getElementById('themeOptionsContainer');
		
        if (themeCurrentBtn) {
            if (themeOptionsContainer) {
                // Calculate position BEFORE moving to body to avoid animation
                const buttonRect = themeCurrentBtn.getBoundingClientRect();
                const settingsRect = this.settingsPanel.getBoundingClientRect();
				
                // Position the dropdown below the button, but keep it within the settings panel area
                let top = buttonRect.bottom + 5;
                let left = buttonRect.left;
                const dropdownWidth = 350;
				
                // Keep it within the settings panel bounds
                if (left + dropdownWidth > settingsRect.right) {
                    left = settingsRect.right - dropdownWidth - 10; // 10px margin from panel edge
                }
				
                // Ensure it doesn't go beyond the left edge of the settings panel
                if (left < settingsRect.left) {
                    left = settingsRect.left + 10;
                }
				
                // Check if dropdown would go off the bottom edge
                if (top + 400 > window.innerHeight) {
                    top = buttonRect.top - 405; // Position above the button instead
                }
				
                // Temporarily disable transitions to prevent animation
                themeOptionsContainer.style.transition = 'none';
				
                // Apply fixed positioning BEFORE moving to body
                themeOptionsContainer.style.position = 'fixed';
                themeOptionsContainer.style.top = `${top}px`;
                themeOptionsContainer.style.left = `${left}px`;
                themeOptionsContainer.style.width = `${dropdownWidth}px`;
                themeOptionsContainer.style.zIndex = '2100';
				
                // Move to body after positioning is set
                document.body.appendChild(themeOptionsContainer);
				
                // Re-enable transitions after a brief delay
                setTimeout(() => {
                    themeOptionsContainer.style.transition = 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                }, 10);
            }
			
            themeCurrentBtn.classList.add('open');
            if (themeOptionsContainer) {
                themeOptionsContainer.classList.add('show');
            }
            this.isThemeSelectorOpen = true;
        }
    }

    /**
	 * Close the theme selector dropdown
	 */
    closeThemeSelector() {
        const themeCurrentBtn = document.getElementById('themeCurrentBtn');
        const themeOptionsContainer = document.getElementById('themeOptionsContainer');
        const themeWrapper = document.querySelector('.theme-selector-wrapper');
		
        if (themeCurrentBtn && themeOptionsContainer) {
            themeCurrentBtn.classList.remove('open');
            themeOptionsContainer.classList.remove('show');
			
            // Move container back to its original location after animation completes
            setTimeout(() => {
                if (themeWrapper && themeOptionsContainer.parentNode === document.body) {
                    // Temporarily disable transitions
                    themeOptionsContainer.style.transition = 'none';
					
                    // Reset positioning styles
                    themeOptionsContainer.style.position = '';
                    themeOptionsContainer.style.top = '';
                    themeOptionsContainer.style.left = '';
                    themeOptionsContainer.style.width = '';
                    themeOptionsContainer.style.zIndex = '';
					
                    // Move back to wrapper
                    themeWrapper.appendChild(themeOptionsContainer);
					
                    // Re-enable transitions
                    setTimeout(() => {
                        themeOptionsContainer.style.transition = 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                    }, 10);
                }
            }, 400); // Wait for close animation to complete
			
            this.isThemeSelectorOpen = false;
        }
    }

    /**
	 * Select a theme from the dropdown
	 * @param {string} themeName - Theme to select
	 */
    selectTheme(themeName) {
        // Update active state
        document.querySelectorAll('.theme-card').forEach(card => {
            card.classList.remove('active');
        });
		
        const selectedCard = document.querySelector(`[data-theme="${themeName}"]`);
        if (selectedCard) {
            selectedCard.classList.add('active');
        }
		
        // Update current theme display
        this.updateCurrentThemeDisplay(themeName);
		
        // Update preferences
        this.preferences.theme = themeName;
		
        // Apply theme
        this.handleThemeChange(themeName);
    }

    /**
	 * Update the current theme display button
	 * @param {string} themeName - Current theme name
	 */
    updateCurrentThemeDisplay(themeName) {
        const currentThemeName = document.getElementById('currentThemeName');
        if (currentThemeName) {
            // Try to get display name from the theme card
            const themeCard = document.querySelector(`[data-theme="${themeName}"]`);
            if (themeCard) {
                const themeNameElement = themeCard.querySelector('.theme-name');
                if (themeNameElement) {
                    currentThemeName.textContent = themeNameElement.textContent;
                    return;
                }
            }
            
            // Fallback to hardcoded names for backwards compatibility
            const themeDisplayNames = {
                'default': 'Default',
                'vapor': 'Vapor Dream',
                'synthwave': 'Synthwave',
                'quantum': 'Quantum Flux',
                'noir': 'Neon Noir',
                'mint': 'Vapor Mint',
                'laser': 'Laser Grid',
                'toxic': 'Toxic Waste',
                'hologram': 'Hologram',
                'matrix': 'Matrix Code'
            };
            currentThemeName.textContent = themeDisplayNames[themeName] || themeName;
        }
    }

    /**
	 * Handle theme change from dropdown
	 * @param {string} themeName - Selected theme
	 */
    handleThemeChange(themeName) {
        if (this.themeSystem && this.themeSystem.setTheme) {
            // Check if auto-save theme is enabled
            const shouldAutoSave = this.preferences.autoSaveTheme;
            this.themeSystem.setTheme(themeName, shouldAutoSave);
        }
    }

    /**
	 * Setup handlers for all toggle switches
	 */
    setupToggleHandlers() {
        const toggles = [
            { id: 'videoDisplayToggle', pref: 'videoDisplay' },
            { id: 'autoSaveToggle', pref: 'autoSave' },
            { id: 'autoSaveThemeToggle', pref: 'autoSaveTheme' }
        ];

        toggles.forEach(({ id, pref }) => {
            const toggle = document.getElementById(id);
            if (toggle) {
                toggle.addEventListener('click', () => {
                    this.toggleSetting(toggle, pref);
                });
            }
        });
    }

    /**
	 * Toggle a setting switch
	 * @param {HTMLElement} element - Toggle element
	 * @param {string} preference - Preference key
	 */
    toggleSetting(element, preference) {
        element.classList.toggle('active');
        this.preferences[preference] = element.classList.contains('active');
		
        // Apply setting immediately
        this.applySettingChange(preference, this.preferences[preference]);
    }

    /**
	 * Apply setting changes immediately
	 * @param {string} setting - Setting key
	 * @param {*} value - Setting value
	 */
    applySettingChange(setting, value) {
        switch (setting) {
        case 'videoDisplay':
            this.handleVideoDisplayToggle(value);
            break;
        // Add other immediate effects as needed
        }
    }

    /**
     * Handle video display toggle changes
     * @param {boolean} showVideo - Whether to show video content
     */
    handleVideoDisplayToggle(showVideo) {
        const videoContainer = document.getElementById('videoContainer');
        const videoPlayer = document.getElementById('videoPlayer');
        
        if (videoContainer && videoPlayer) {
            // Check if a video is currently playing
            if (videoPlayer.src && !videoPlayer.paused) {
                // There's a video file currently playing
                if (showVideo) {
                    // Show video if it has video content
                    if (videoPlayer.videoWidth > 0 && videoPlayer.videoHeight > 0) {
                        videoContainer.classList.remove('hide');
                    }
                } else {
                    // Hide video (audio only mode)
                    videoContainer.classList.add('hide');
                }
            }
        }
    }




    /**
	 * Update master volume
	 * @param {number} volume - Volume level (0-100)
	 */
    updateMasterVolume(volume) {
        // This would integrate with the main app's volume control
        const volumeSlider = document.getElementById('volumeSlider');
        if (volumeSlider) {
            volumeSlider.value = volume;
            // Trigger volume update in main app
            const changeEvent = new Event('input');
            volumeSlider.dispatchEvent(changeEvent);
        }
    }

    /**
	 * Open the settings panel
	 */
    open() {
        this.isOpen = true;
        this.settingsPanel.classList.add('open');
        this.overlay.classList.add('active');
		
        if (this.mainContent) {
            this.mainContent.classList.add('settings-open');
        }
        if (this.footer) {
            this.footer.classList.add('settings-open');
        }
		
        document.body.style.overflow = 'hidden';
		
        // Update settings display to current values
        this.updateSettingsDisplay();
    }

    /**
	 * Close the settings panel
	 */
    close() {
        this.isOpen = false;
        this.isThemeSelectorOpen = false; // Close theme selector too
		
        this.settingsPanel.classList.remove('open');
        this.overlay.classList.remove('active');
		
        // Close theme selector
        this.closeThemeSelector();
		
        if (this.mainContent) {
            this.mainContent.classList.remove('settings-open');
        }
        if (this.footer) {
            this.footer.classList.remove('settings-open');
        }
		
        document.body.style.overflow = '';
    }

    /**
	 * Load themes dynamically from API
	 */
    async loadDynamicThemes() {
        if (!this.themeSystem) return;
        
        try {
            const themes = await this.themeSystem.getAvailableThemes();
            this.populateThemeGrid(themes);
        } catch (error) {
            console.error('Error loading dynamic themes:', error);
            // Fallback to existing hardcoded themes
        }
    }

    /**
     * Populate theme grid with available themes
     * @param {Array} themes - Array of theme objects
     */
    populateThemeGrid(themes) {
        const themeGrid = document.getElementById('settingsThemeGrid');
        if (!themeGrid) return;
        
        // Clear existing content
        themeGrid.innerHTML = '';
        
        // Get current theme to mark as active
        const currentTheme = this.themeSystem?.getCurrentTheme() || this.preferences.theme || 'default';

        // Create theme cards
        themes.forEach((theme, _index) => {
            const themeCard = document.createElement('div');
            themeCard.className = `theme-card${theme.id === currentTheme ? ' active' : ''}`;
            themeCard.dataset.theme = theme.id;
            
            themeCard.innerHTML = `
                <div class="theme-info">
                    <div class="theme-name">${theme.name}</div>
                    <div class="theme-desc">${theme.description}</div>
                </div>
            `;
            
            // Add click event listener for theme selection
            themeCard.addEventListener('click', (e) => {
                e.stopPropagation();
                const themeName = themeCard.dataset.theme;
                this.selectTheme(themeName);
                this.closeThemeSelector();
            });
            
            themeGrid.appendChild(themeCard);
        });
        
        // Update current theme display in dropdown button
        this.updateCurrentThemeDisplay(currentTheme);
        
        console.log(`Populated ${themes.length} themes in settings UI with click handlers`);
    }

    /**
	 * Update experimental features display
	 */
    updateExperimentalFeaturesDisplay() {
        const experimentalGroup = document.getElementById('experimentalFeaturesGroup');
        const experimentalThemesStatus = document.getElementById('experimentalThemesStatus');
        
        if (!experimentalGroup || !experimentalThemesStatus) return;
        
        // Check if any experimental features are available
        const hasExperimentalFeatures = featureManager.isInitialized ? featureManager.isEnabled('experimental_themes') : false;
        
        if (hasExperimentalFeatures) {
            experimentalGroup.style.display = 'block';

            // Update experimental themes status
            const statusText = experimentalThemesStatus.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = 'Enabled';
                statusText.className = 'status-text enabled';
            }
        } else {
            // Hide the entire experimental section if no features are available
            experimentalGroup.style.display = 'none';
        }
    }

    /**
	 * Update settings display to match current preferences
	 */
    updateSettingsDisplay() {
        // Update theme cards and current theme display
        document.querySelectorAll('.theme-card').forEach(card => {
            card.classList.remove('active');
        });
		
        const currentTheme = this.themeSystem ? this.themeSystem.getCurrentTheme() : 'default';
        const activeCard = document.querySelector(`[data-theme="${currentTheme}"]`);
        if (activeCard) {
            activeCard.classList.add('active');
        }
		
        // Update current theme display
        this.updateCurrentThemeDisplay(currentTheme);

        // Update toggle switches
        const toggles = [
            { id: 'videoDisplayToggle', pref: 'videoDisplay' },
            { id: 'autoSaveToggle', pref: 'autoSave' },
            { id: 'autoSaveThemeToggle', pref: 'autoSaveTheme' }
        ];

        toggles.forEach(({ id, pref }) => {
            const toggle = document.getElementById(id);
            if (toggle) {
                if (this.preferences[pref]) {
                    toggle.classList.add('active');
                } else {
                    toggle.classList.remove('active');
                }
            }
        });

        // Update volume slider
        const volumeSlider = document.getElementById('masterVolumeSlider');
        if (volumeSlider) {
            volumeSlider.value = this.preferences.volume;
        }

        // Update experimental features display
        this.updateExperimentalFeaturesDisplay();
    }

    /**
	 * Save all settings
	 */
    async saveSettings() {
        try {
            // Settings are now runtime-only (no localStorage persistence)
            
            // Save to server if user is logged in
            if (this.userId) {
                const response = await fetch(`/api/users/${this.userId}/preferences`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.preferences)
                });
                
                if (!response.ok) {
                    throw new Error('Failed to save preferences to server');
                }
            }
			
            if (this.showStatus) {
                this.showStatus('Settings saved successfully');
            }
			
        } catch (error) {
            console.error('Error saving settings:', error);
            if (this.showStatus) {
                this.showStatus('Error saving settings', true);
            }
        }
    }

    /**
	 * Reset settings to defaults
	 */
    resetSettings() {
        if (!confirm('Reset all settings to defaults?')) {
            return;
        }

        // Reset preferences to defaults
        this.preferences = {
            theme: 'default',
            videoDisplay: true,
            autoSave: true,
            autoSaveTheme: true,
            volume: 100
        };

        // Apply defaults
        this.updateSettingsDisplay();
        this.applyAllSettings();
		
        // Reset theme
        if (this.themeSystem) {
            this.themeSystem.setTheme('default');
        }

        if (this.showStatus) {
            this.showStatus('Settings reset to defaults');
        }
    }

    /**
     * Reset play history
     */
    async resetPlayHistory() {
        if (!confirm('Clear all play history? This will permanently delete all play counts and listening metrics.')) {
            return;
        }

        try {
            if (window.shuffleManager) {
                const success = await window.shuffleManager.clearPlayHistory();
                if (success) {
                    if (this.showStatus) {
                        this.showStatus('Play history cleared successfully');
                    }
                } else {
                    if (this.showStatus) {
                        this.showStatus('Failed to clear play history', true);
                    }
                }
            } else {
                console.error('Shuffle manager not available');
                if (this.showStatus) {
                    this.showStatus('Shuffle manager not available', true);
                }
            }
        } catch (error) {
            console.error('Error clearing play history:', error);
            if (this.showStatus) {
                this.showStatus('Error clearing play history', true);
            }
        }
    }

    /**
	 * Load preferences from storage
	 */
    async loadPreferences() {
        // Load user preferences from server if logged in
        if (this.userId) {
            try {
                const response = await fetch(`/api/users/${this.userId}/preferences`);
                if (response.ok) {
                    const serverPrefs = await response.json();
                    // Merge with defaults to ensure we have all required preferences
                    this.preferences = { ...this.preferences, ...serverPrefs };
                }
            } catch (error) {
                console.error('Error loading preferences from server:', error);
                // Continue with defaults if server fails
            }
        }
        
        // Apply loaded preferences
        this.applyAllSettings();
    }

    /**
	 * Apply all current settings
	 */
    applyAllSettings() {
        Object.keys(this.preferences).forEach(key => {
            this.applySettingChange(key, this.preferences[key]);
        });
    }

    /**
	 * Get current preferences
	 * @returns {Object} Current preferences
	 */
    getPreferences() {
        return { ...this.preferences };
    }

    /**
	 * Set preferences programmatically
	 * @param {Object} prefs - Preferences to set
	 */
    setPreferences(prefs) {
        this.preferences = { ...this.preferences, ...prefs };
        this.applyAllSettings();
        this.updateSettingsDisplay();
    }

    /**
	 * Check if settings panel is open
	 * @returns {boolean} True if open
	 */
    isSettingsOpen() {
        return this.isOpen;
    }

    /**
	 * Destroy the settings system
	 */
    destroy() {
        if (this.settingsPanel && this.settingsPanel.parentNode) {
            this.settingsPanel.parentNode.removeChild(this.settingsPanel);
        }
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
		
        const themeCSS = document.getElementById('settings-collapsible-theme-css');
        if (themeCSS && themeCSS.parentNode) {
            themeCSS.parentNode.removeChild(themeCSS);
        }
		
        this.isOpen = false;
        this.isThemeSelectorOpen = false;
        this.settingsPanel = null;
        this.overlay = null;
        this.mainContent = null;
        this.footer = null;
    }
}
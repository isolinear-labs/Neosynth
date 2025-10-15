// frontend/modules/effects/digitalRain.js

import debug from '../debugLogger/debugLogger.js';

/**
 * Digital Rain Effect Module for NeoSynth
 * Provides a dynamic, responsive digital rain background effect
 */
export class DigitalRainManager {
    constructor() {
        this.container = null;
        this.rainElements = [];
        this.currentColumns = 0;
        this.rainInterval = null;
        this.resizeTimeout = null;
        this.isInitialized = false;
        this.isVisible = true;
        this.settings = {
            minColumns: 5,
            columnSpacing: 60,
            minRainLength: 5,
            maxRainLength: 15,
            newRainInterval: 2000,
            resizeDebounce: 300,
            orientationDelay: 500
        };
    }

    /**
	 * Initialize the digital rain system
	 * @param {string} containerId - ID of the container element
	 * @param {Object} options - Configuration options
	 */
    init(containerId = 'digitalRain', options = {}) {
        // Merge options with defaults
        this.settings = { ...this.settings, ...options };
		
        this.container = document.getElementById(containerId);
        if (!this.container) {
            debug.warn(`Digital rain container '${containerId}' not found`);
            return false;
        }

        debug.log('Initializing digital rain effect...');

        this.createInitialRain();
        this.setupResizeHandler();
        this.startRainGeneration();
        this.isInitialized = true;

        debug.log(`Digital rain initialized with ${this.currentColumns} columns`);
        return true;
    }

    /**
	 * Create initial rain based on current window size
	 */
    createInitialRain() {
        this.clearAllRain();
        const width = window.innerWidth;
        const numberOfColumns = Math.max(
            Math.floor(width / this.settings.columnSpacing), 
            this.settings.minColumns
        );
		
        for (let i = 0; i < numberOfColumns; i++) {
            this.createRainColumn(i, numberOfColumns);
        }
		
        this.currentColumns = numberOfColumns;
    }

    /**
	 * Create a single rain column
	 * @param {number} index - Column index
	 * @param {number} totalColumns - Total number of columns
	 */
    createRainColumn(index, totalColumns) {
        const rain = document.createElement('div');
        rain.className = 'digit-rain';
        rain.dataset.column = index;
		
        // Calculate position based on column index and total columns
        const columnWidth = window.innerWidth / totalColumns;
        const leftPosition = (index * columnWidth) + (Math.random() * (columnWidth * 0.8));
		
        // Set initial styles
        rain.style.left = `${Math.max(0, leftPosition)}px`;
        rain.style.animationDuration = `${5 + Math.random() * 15}s`;
        rain.style.animationDelay = `${Math.random() * 2}s`;
		
        // Generate rain content
        rain.innerHTML = this.generateRainContent();
		
        // Apply theme-specific styling
        this.applyThemeClass(rain);
		
        this.container.appendChild(rain);
        this.rainElements.push({
            element: rain,
            column: index,
            isStatic: true
        });
    }

    /**
	 * Generate random binary content for rain
	 * @param {number} minLength - Minimum content length
	 * @param {number} maxLength - Maximum content length
	 * @returns {string} Generated HTML content
	 */
    generateRainContent(
        minLength = this.settings.minRainLength, 
        maxLength = this.settings.maxRainLength
    ) {
        let content = '';
        const rainLength = minLength + Math.random() * (maxLength - minLength);
		
        for (let j = 0; j < rainLength; j++) {
            content += Math.random() > 0.5 ? '1' : '0';
            if (j < rainLength - 1) content += '<br>';
        }
		
        return content;
    }

    /**
	 * Apply current theme class to rain element
	 * @param {HTMLElement} rainElement - Rain element to style
	 */
    applyThemeClass(rainElement) {
        const themeClasses = [
            'rain-vapor', 'rain-synthwave', 'rain-quantum',
            'rain-noir', 'rain-mint', 'rain-laser', 'rain-toxic'
        ];
		
        // Remove any existing theme classes
        themeClasses.forEach(cls => rainElement.classList.remove(cls));
		
        // Apply current theme class based on body class
        themeClasses.forEach(cls => {
            const themeName = cls.replace('rain-', '');
            if (document.body.classList.contains(`theme-${themeName}`)) {
                rainElement.classList.add(cls);
            }
        });
    }

    /**
	 * Handle window resize with debouncing
	 */
    setupResizeHandler() {
        const handleResize = () => {
            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
            }
			
            this.resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, this.settings.resizeDebounce);
        };

        const handleOrientationChange = () => {
            setTimeout(() => {
                this.handleResize();
            }, this.settings.orientationDelay);
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleOrientationChange);
		
        // Store references for cleanup
        this._handleResize = handleResize;
        this._handleOrientationChange = handleOrientationChange;
    }

    /**
	 * Handle resize event
	 */
    handleResize() {
        if (!this.isInitialized) return;
		
        const newWidth = window.innerWidth;
        const newColumns = Math.max(
            Math.floor(newWidth / this.settings.columnSpacing), 
            this.settings.minColumns
        );
		
        if (newColumns !== this.currentColumns) {
            debug.log(`Resize: ${this.currentColumns} -> ${newColumns} columns`);
            this.redistributeRain(newColumns);
        } else {
            // Same number of columns, just reposition existing ones
            this.repositionRain();
        }
    }

    /**
	 * Redistribute rain when column count changes
	 * @param {number} newColumns - New number of columns
	 */
    redistributeRain(newColumns) {
        const oldColumns = this.currentColumns;
		
        if (newColumns > oldColumns) {
            // Add new columns
            for (let i = oldColumns; i < newColumns; i++) {
                this.createRainColumn(i, newColumns);
            }
        } else if (newColumns < oldColumns) {
            // Remove excess columns
            const toRemove = this.rainElements.filter(rain => 
                rain.isStatic && rain.column >= newColumns
            );
			
            toRemove.forEach(rain => {
                if (rain.element.parentNode) {
                    rain.element.parentNode.removeChild(rain.element);
                }
            });
			
            this.rainElements = this.rainElements.filter(rain => 
                !rain.isStatic || rain.column < newColumns
            );
        }
		
        // Reposition all remaining columns
        this.repositionRain(newColumns);
        this.currentColumns = newColumns;
    }

    /**
	 * Reposition existing rain columns
	 * @param {number} columns - Number of columns
	 */
    repositionRain(columns = this.currentColumns) {
        const columnWidth = window.innerWidth / columns;
		
        this.rainElements.forEach(rain => {
            if (rain.isStatic && rain.column < columns) {
                const leftPosition = (rain.column * columnWidth) + 
					(Math.random() * (columnWidth * 0.8));
                rain.element.style.left = `${Math.max(0, leftPosition)}px`;
            }
        });
    }

    /**
	 * Start automatic rain generation
	 */
    startRainGeneration() {
        if (this.rainInterval) {
            clearInterval(this.rainInterval);
        }
		
        this.rainInterval = setInterval(() => {
            if (this.isVisible) {
                this.generateNewRain();
            }
        }, this.settings.newRainInterval);
    }

    /**
	 * Generate new rain drops periodically
	 */
    generateNewRain() {
        if (!this.isInitialized || !this.isVisible) return;
		
        const rain = document.createElement('div');
        rain.className = 'digit-rain';
        rain.dataset.temporary = 'true';
		
        // Random position across current width
        rain.style.left = `${Math.random() * window.innerWidth}px`;
        rain.style.animationDuration = `${5 + Math.random() * 15}s`;
		
        // Generate content
        rain.innerHTML = this.generateRainContent(10, 20);
		
        // Apply theme styling
        this.applyThemeClass(rain);
		
        this.container.appendChild(rain);
		
        // Track temporary element
        this.rainElements.push({
            element: rain,
            column: -1,
            isStatic: false
        });
		
        // Remove after animation completes
        const duration = parseFloat(rain.style.animationDuration) * 1000;
        setTimeout(() => {
            this.removeRainElement(rain);
        }, duration + 1000);
    }

    /**
	 * Remove a rain element safely
	 * @param {HTMLElement} element - Element to remove
	 */
    removeRainElement(element) {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
		
        // Remove from tracking array
        this.rainElements = this.rainElements.filter(rain => 
            rain.element !== element
        );
    }

    /**
	 * Update theme classes for all rain elements
	 */
    updateTheme() {
        if (!this.isInitialized) return;
		
        debug.log('Updating digital rain theme...');
		
        // Update all tracked rain elements
        this.rainElements.forEach(rain => {
            this.applyThemeClass(rain.element);
        });
		
        // Update any untracked temporary elements
        const allRainElements = this.container.querySelectorAll('.digit-rain');
        allRainElements.forEach(rain => {
            if (!this.rainElements.find(r => r.element === rain)) {
                this.applyThemeClass(rain);
            }
        });
    }

    /**
	 * Clear all rain elements
	 */
    clearAllRain() {
        // Remove all tracked elements
        this.rainElements.forEach(rain => {
            if (rain.element.parentNode) {
                rain.element.parentNode.removeChild(rain.element);
            }
        });
        this.rainElements = [];
		
        // Clear any untracked elements
        const tempElements = this.container.querySelectorAll('.digit-rain');
        tempElements.forEach(element => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
    }

    /**
	 * Toggle digital rain visibility
	 * @param {boolean} visible - Whether to show rain
	 */
    setVisible(visible) {
        this.isVisible = visible;
        if (this.container) {
            this.container.style.display = visible ? 'block' : 'none';
        }
		
        debug.log(`Digital rain ${visible ? 'enabled' : 'disabled'}`);
    }

    /**
	 * Check if rain is currently visible
	 * @returns {boolean} True if visible
	 */
    isRainVisible() {
        return this.isVisible && this.container && 
			this.container.style.display !== 'none';
    }

    /**
	 * Get current rain statistics
	 * @returns {Object} Current state information
	 */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            isVisible: this.isVisible,
            currentColumns: this.currentColumns,
            staticRainCount: this.rainElements.filter(r => r.isStatic).length,
            temporaryRainCount: this.rainElements.filter(r => !r.isStatic).length,
            totalRainCount: this.rainElements.length,
            containerVisible: this.container ? 
                this.container.style.display !== 'none' : false
        };
    }

    /**
	 * Update configuration settings
	 * @param {Object} newSettings - New settings to apply
	 */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
		
        // Restart with new settings if initialized
        if (this.isInitialized) {
            this.startRainGeneration();
        }
    }

    /**
	 * Pause rain generation
	 */
    pause() {
        if (this.rainInterval) {
            clearInterval(this.rainInterval);
            this.rainInterval = null;
        }
        debug.log('Digital rain paused');
    }

    /**
	 * Resume rain generation
	 */
    resume() {
        if (this.isInitialized && !this.rainInterval) {
            this.startRainGeneration();
            debug.log('Digital rain resumed');
        }
    }

    /**
	 * Cleanup and destroy the rain effect
	 */
    destroy() {
        debug.log('Destroying digital rain effect...');
		
        // Clear intervals and timeouts
        if (this.rainInterval) {
            clearInterval(this.rainInterval);
            this.rainInterval = null;
        }
		
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = null;
        }
		
        // Remove event listeners
        if (this._handleResize) {
            window.removeEventListener('resize', this._handleResize);
        }
        if (this._handleOrientationChange) {
            window.removeEventListener('orientationchange', this._handleOrientationChange);
        }
		
        // Clear all rain elements
        this.clearAllRain();
		
        // Reset state
        this.isInitialized = false;
        this.isVisible = true;
        this.currentColumns = 0;
        this.container = null;
		
        debug.log('Digital rain effect destroyed');
    }
}

// Create and export singleton instance
export const digitalRainManager = new DigitalRainManager();

// Export default for easy importing
export default digitalRainManager;
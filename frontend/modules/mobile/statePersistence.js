export class StatePersistence {
    constructor() {
        this.stateKey = 'neosynthAppState';
        this.playingKey = 'neosynthWasPlaying';
        this.onRestoreCallbacks = [];
        this.isInitialized = false;
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Register a callback to be called when state is restored
    onRestore(callback) {
        this.onRestoreCallbacks.push(callback);
    }

    // Save current app state to localStorage (disabled)
    saveState(_appElements) {
        // Mobile playlist restore feature removed - resume button handles this now
        return;
    }

    // Load saved state from localStorage (disabled)
    loadState() {
        // Mobile playlist restore feature removed - resume button handles this now
        return null;
    }

    // Initialize state persistence with app elements (disabled)
    init(appElements) {
        if (this.isInitialized) return;
		
        this.isInitialized = true;
        this.appElements = appElements;

        // Mobile playlist restore feature removed - resume button handles this now
        return false;
    }

    // Set up event listeners for automatic state saving
    setupEventListeners() {
        // Save state when visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveState(this.appElements);
            }
        });

        // Save state when page is about to unload
        window.addEventListener('beforeunload', () => {
            this.saveState(this.appElements);
        });

        // Save state when app loses focus
        window.addEventListener('blur', () => {
            this.saveState(this.appElements);
        });

        // Set up periodic saving during playback
        this.setupPeriodicSaving();
    }

    // Set up periodic state saving during playback
    setupPeriodicSaving() {
        let stateSaveInterval;
        const startPeriodicSave = () => {
            if (stateSaveInterval) clearInterval(stateSaveInterval);
            stateSaveInterval = setInterval(() => {
                if (this.appElements.isPlaying) {
                    this.saveState(this.appElements);
                }
            }, 5000); // Save every 5 seconds during playback
        };

        const stopPeriodicSave = () => {
            this.saveState(this.appElements);
            if (stateSaveInterval) clearInterval(stateSaveInterval);
        };

        // Audio player events
        if (this.appElements.audioPlayer) {
            this.appElements.audioPlayer.addEventListener('play', startPeriodicSave);
            this.appElements.audioPlayer.addEventListener('pause', stopPeriodicSave);
        }

        // Video player events
        if (this.appElements.videoPlayer) {
            this.appElements.videoPlayer.addEventListener('play', startPeriodicSave);
            this.appElements.videoPlayer.addEventListener('pause', stopPeriodicSave);
        }
    }

    // Restore saved state (disabled)
    restoreState() {
        // Mobile playlist restore feature removed - resume button handles this now
        return false;
    }

    // Method to be called when track changes (disabled)
    onTrackChange() {
        // Mobile playlist restore feature removed - resume button handles this now
        return;
    }

    // Method to be called when playlist changes (disabled)
    onPlaylistChange() {
        // Mobile playlist restore feature removed - resume button handles this now
        return;
    }
}
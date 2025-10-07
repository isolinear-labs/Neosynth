import debug from '../debugLogger/debugLogger.js';
import { AudioInterruptionManager } from './audioInterruption.js';

export class MobileOptimizations {
    constructor() {
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        this.stateSaveInterval = null;
        this.wasPlayingBeforeHidden = false;
        this.lastTouchTime = Date.now();
        this.audioInterruption = new AudioInterruptionManager();
    }
	
    // Static method to check if current device is mobile
    static isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Initialize mobile optimizations
    init(appElements, statePersistence) {
        if (!this.isMobile) {
            debug.log('Not on mobile device - skipping mobile optimizations');
            return;
        }

        this.appElements = appElements;
        this.statePersistence = statePersistence;

        debug.log('Initializing mobile optimizations...');
		
        // Initialize audio interruption handling
        this.audioInterruption.init(appElements);
		
        this.setupServiceWorker();
        this.setupVisibilityHandling();
        this.setupFrequentStateSaving();
        this.setupFocusHandling();
        this.setupTouchTracking();
        this.setupPageUnloadPrevention();
        this.setupIOSSpecificHandling();
        this.wrapPlaybackFunctions();
    }

    // iOS-specific handling
    setupIOSSpecificHandling() {
        if (!this.isIOS) return;

        // Override the native play function with interruption recovery
        const _originalTogglePlayPause = this.appElements.togglePlayPause;
        this.appElements.togglePlayPause = async () => {
            if (this.appElements.isPlaying) {
                // Just pause normally
                if (this.appElements.currentPlayer) {
                    this.appElements.currentPlayer.pause();
                    this.appElements.isPlaying = false;
                    this.appElements.playPauseBtn.textContent = '▶';
                }
            } else {
                // Try to play with interruption recovery
                const success = await this.audioInterruption.playWithInterruptionRecovery();
                if (success) {
                    this.appElements.isPlaying = true;
                    this.appElements.playPauseBtn.textContent = '⏸';
                    if (this.appElements.renderPlaylist) {
                        this.appElements.renderPlaylist();
                    }
                }
            }
        };

        // Add audio context resumption on any user interaction
        const resumeAudioOnInteraction = () => {
            if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
                const AudioContextClass = AudioContext || webkitAudioContext;
                const audioContext = new AudioContextClass();
                if (audioContext.state === 'suspended') {
                    audioContext.resume().catch(err => debug.log('Failed to resume audio context:', err));
                }
            }
        };

        document.addEventListener('touchstart', resumeAudioOnInteraction, { once: true });
        document.addEventListener('click', resumeAudioOnInteraction, { once: true });

        // Periodically check if audio is actually playing on iOS
        setInterval(() => {
            if (this.appElements.isPlaying && !this.audioInterruption.isAudioActuallyPlaying()) {
                debug.log('iOS: Detected audio stopped playing unexpectedly');
                this.audioInterruption.handleAudioInterruption();
            }
        }, 2000);
    }

    // Wrap playback functions to handle interruptions
    wrapPlaybackFunctions() {
        // Wrap playTrack to handle interruptions
        const originalPlayTrack = this.appElements.playTrack;
        this.appElements.playTrack = async (index) => {
            // Reset interruption state when playing a new track
            this.audioInterruption.isInterrupted = false;
            return originalPlayTrack.call(this, index);
        };

        // Wrap play functions to use interruption recovery
        const originalPlayNext = this.appElements.playNext;
        this.appElements.playNext = async () => {
            if (this.audioInterruption.isInterrupted) {
                await this.audioInterruption.checkAndRefreshAudio();
            }
            return originalPlayNext.call(this);
        };

        const originalPlayPrevious = this.appElements.playPrevious;
        this.appElements.playPrevious = async () => {
            if (this.audioInterruption.isInterrupted) {
                await this.audioInterruption.checkAndRefreshAudio();
            }
            return originalPlayPrevious.call(this);
        };
    }

    // Service worker cleanup - unregister all service workers
    // SW was causing cache issues and is not needed (query string cache busting handles updates)
    // Media Session API (lockscreen controls) works without service workers
    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            // Listen for messages from SW (like unregister confirmation)
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'SW_REMOVED') {
                    debug.log('Service worker removed, reloading page for clean state...');
                    // Reload page after SW unregisters to clear any cached state
                    setTimeout(() => window.location.reload(), 500);
                }
            });

            // Unregister all existing service workers
            debug.log('Unregistering all service workers for cache busting...');
            navigator.serviceWorker.getRegistrations().then(registrations => {
                registrations.forEach(reg => {
                    debug.log('Unregistering service worker:', reg.active ? reg.active.scriptURL : 'pending');
                    reg.unregister();
                });
            });
        }
    }

    // Handle page visibility changes on mobile
    setupVisibilityHandling() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.wasPlayingBeforeHidden = this.appElements.isPlaying;
                this.statePersistence.saveState(this.appElements);
            } else {
                // Page is visible again
                if (this.wasPlayingBeforeHidden && this.appElements.currentPlayer && !this.appElements.isPlaying) {
                    // Check if we need to refresh audio after being hidden
                    setTimeout(() => {
                        this.audioInterruption.checkAndRefreshAudio();
                    }, 500);
                }
            }
        });
    }

    // Show hint to resume playback
    showResumeHint() {
        const { playPauseBtn, showStatus } = this.appElements;
		
        if (showStatus) {
            showStatus('Tap play to resume your music', false);
        }
		
        if (playPauseBtn) {
            playPauseBtn.style.transform = 'scale(1.2)';
            playPauseBtn.style.animation = 'glitch 0.5s infinite';
			
            // Clear the animation after a few seconds
            setTimeout(() => {
                playPauseBtn.style.transform = '';
                playPauseBtn.style.animation = '';
            }, 3000);
        }
    }

    // Save state more frequently on mobile
    setupFrequentStateSaving() {
        const startFrequentSaving = () => {
            if (this.stateSaveInterval) clearInterval(this.stateSaveInterval);
            this.stateSaveInterval = setInterval(() => {
                this.statePersistence.saveState(this.appElements);
            }, 2000); // Save every 2 seconds on mobile
        };

        const stopFrequentSaving = () => {
            if (this.stateSaveInterval) {
                clearInterval(this.stateSaveInterval);
                this.stateSaveInterval = null;
            }
        };

        const { audioPlayer, videoPlayer } = this.appElements;

        if (audioPlayer) {
            audioPlayer.addEventListener('play', startFrequentSaving);
            audioPlayer.addEventListener('pause', stopFrequentSaving);
        }

        if (videoPlayer) {
            videoPlayer.addEventListener('play', startFrequentSaving);
            videoPlayer.addEventListener('pause', stopFrequentSaving);
        }
    }

    // Handle app focus/blur events
    setupFocusHandling() {
        window.addEventListener('focus', () => {
            // App gained focus - check if state needs to be restored
            const wasPlaying = localStorage.getItem('neosynthWasPlaying') === 'true';
            if (!this.appElements.isPlaying && wasPlaying && this.appElements.showStatus) {
                this.appElements.showStatus('Welcome back! Tap play to continue', false);
            }
        });

        window.addEventListener('blur', () => {
            // App lost focus - save state immediately
            this.statePersistence.saveState(this.appElements);
        });
    }

    // Track touch events to detect user activity
    setupTouchTracking() {
        document.addEventListener('touchstart', () => {
            this.lastTouchTime = Date.now();
        });

        // Periodically save state if user is still active
        setInterval(() => {
            if (Date.now() - this.lastTouchTime < 30000 && this.appElements.isPlaying) {
                this.statePersistence.saveState(this.appElements);
            }
        }, 10000);
    }

    // Prevent page unloading when media is playing
    setupPageUnloadPrevention() {
        window.addEventListener('beforeunload', (e) => {
            if (this.appElements.isPlaying && this.appElements.currentPlayer) {
                // Save state before the page might unload
                this.statePersistence.saveState(this.appElements);
				
                // Show confirmation dialog on mobile
                const message = 'Audio is currently playing. Are you sure you want to leave?';
                e.returnValue = message;
                return message;
            }
        });
    }

    // Clean up when destroying the instance
    destroy() {
        if (this.stateSaveInterval) {
            clearInterval(this.stateSaveInterval);
            this.stateSaveInterval = null;
        }
    }
}
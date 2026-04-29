import debug from '../debugLogger/debugLogger.js';
import clientLogger from '../clientLogger/clientLogger.js';

export class AudioInterruptionManager {
    constructor() {
        this.isInterrupted = false;
        this.wasPlayingBeforeInterruption = false;
        this.currentTrackUrl = null;
        this.currentTime = 0;
        this.appElements = null;
        this.isHandlingInterruption = false;
    }

    init(appElements) {
        this.appElements = appElements;
        clientLogger.init(appElements);
        this.setupInterruptionHandlers();
        this.setupAudioContextHandling();
        this.setupVisibilityHandling();
    }

    // Handle audio interruptions from other apps
    setupInterruptionHandlers() {
        const { audioPlayer, videoPlayer } = this.appElements;

        // Handle audio context state changes
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            const AudioContextClass = AudioContext || webkitAudioContext;
            const audioContext = new AudioContextClass();
			
            // Handle audio context state changes
            audioContext.addEventListener('statechange', () => {
                console.log('Audio context state changed:', audioContext.state);
                clientLogger.logAudioContextChange(audioContext.state);
                if (audioContext.state === 'suspended') {
                    this.handleAudioInterruption();
                } else if (audioContext.state === 'running') {
                    this.handleAudioResumption();
                }
            });

            // Try to resume audio context if it's suspended
            const resumeAudioContext = () => {
                if (audioContext.state === 'suspended') {
                    audioContext.resume().catch(err => {
                        debug.log('Failed to resume audio context:', err);
                    });
                }
            };

            // Resume on user interaction
            document.addEventListener('touchstart', resumeAudioContext);
            document.addEventListener('click', resumeAudioContext);
        }

        // Handle native audio interruption events
        if (audioPlayer) {
            // Debounce pause/waiting detection - programmatic pauses (e.g. seek) are brief and
            // should not be treated as external interruptions. Only fire if still paused after 800ms.
            audioPlayer.addEventListener('pause', (_e) => {
                if (!this.isHandlingInterruption && this.appElements.isPlaying) {
                    clearTimeout(this._pauseInterruptionTimer);
                    this._pauseInterruptionTimer = setTimeout(() => {
                        if (this.appElements.currentPlayer?.paused && this.appElements.isPlaying && !this.isHandlingInterruption) {
                            debug.log('Audio paused unexpectedly - possible interruption');
                            clientLogger.logAudioInterruption('unexpected_pause');
                            this.handleAudioInterruption();
                        }
                    }, 800);
                }
            });

            // Clear the debounce timer when playback resumes (seek complete)
            audioPlayer.addEventListener('play', () => {
                clearTimeout(this._pauseInterruptionTimer);
            });

            // stalled = browser can't get data - debounce since it can fire during normal
            // track loading/source changes before data arrives
            audioPlayer.addEventListener('stalled', () => {
                if (this.appElements.isPlaying && !this.isInterrupted) {
                    clearTimeout(this._stalledInterruptionTimer);
                    this._stalledInterruptionTimer = setTimeout(() => {
                        if (this.appElements.isPlaying && !this.isInterrupted && !this.isHandlingInterruption) {
                            debug.log('Audio stalled - possible interruption');
                            this.handleAudioInterruption();
                        }
                    }, 3000);
                }
            });

            // suspend fires constantly during normal buffering (browser stops pre-fetching) -
            // it is NOT a reliable indicator of an external interruption, so we ignore it here

            audioPlayer.addEventListener('waiting', () => {
                // Only treat as interruption if we were playing and not mid-seek
                if (this.appElements.isPlaying && !this.isInterrupted) {
                    clearTimeout(this._waitingInterruptionTimer);
                    this._waitingInterruptionTimer = setTimeout(() => {
                        if (this.appElements.isPlaying && !this.isInterrupted && !this.isHandlingInterruption) {
                            debug.log('Audio waiting - possible interruption');
                            this.handleAudioInterruption();
                        }
                    }, 800);
                }
            });

            // Clear all debounce timers when playback actually resumes
            audioPlayer.addEventListener('playing', () => {
                clearTimeout(this._stalledInterruptionTimer);
                clearTimeout(this._waitingInterruptionTimer);
            });

            audioPlayer.addEventListener('error', () => {
                if (audioPlayer.error && !this.appElements.isIntentionalStop) {
                    // Snapshot src immediately — checkAndRefreshAudio() clears it during recovery
                    const failedSrc = audioPlayer.src || this.currentTrackUrl || null;
                    clientLogger.logPlaybackError(audioPlayer.error, failedSrc);
                }
            });
        }

        if (videoPlayer) {
            // Similar handlers for video player
            videoPlayer.addEventListener('pause', (_e) => {
                if (!this.isHandlingInterruption && this.appElements.isPlaying) {
                    clearTimeout(this._videoPauseInterruptionTimer);
                    this._videoPauseInterruptionTimer = setTimeout(() => {
                        if (this.appElements.currentPlayer?.paused && this.appElements.isPlaying && !this.isHandlingInterruption) {
                            debug.log('Video paused unexpectedly - possible interruption');
                            this.handleAudioInterruption();
                        }
                    }, 800);
                }
            });

            videoPlayer.addEventListener('play', () => {
                clearTimeout(this._videoPauseInterruptionTimer);
            });
        }
    }

    // Enhanced audio context handling
    setupAudioContextHandling() {
        // Resume suspended audio context on user interaction so the first tap
        // after a page load or interruption doesn't silently fail.
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            const AudioContextClass = AudioContext || webkitAudioContext;
            const resumeCtx = () => {
                const ctx = new AudioContextClass();
                if (ctx.state === 'suspended') {
                    ctx.resume().catch(err => debug.log('Failed to resume audio context:', err));
                }
            };
            document.addEventListener('touchstart', resumeCtx, { once: true });
            document.addEventListener('click', resumeCtx, { once: true });
        }
        // NOTE: The 1-second polling interval that previously called
        // handleAudioInterruption() when currentPlayer.paused was true has been
        // removed. It produced false positives during normal buffering pauses
        // (now that currentPlayer is a live reference), stomping isPlaying=false
        // while audio was still running and making lock-screen pause require two
        // presses. Genuine interruptions are already handled by the debounced
        // 'pause' event listener in setupInterruptionHandlers().
    }

    // Handle page visibility changes
    setupVisibilityHandling() {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isInterrupted) {
                // Page became visible again - check if we need to refresh audio
                debug.log('Page visible again after interruption');
                setTimeout(() => {
                    this.checkAndRefreshAudio();
                }, 500);
            }
        });
    }

    // Handle audio interruption
    handleAudioInterruption() {
        if (this.isInterrupted) return; // Already handling

        debug.log('Handling audio interruption');
        this.isInterrupted = true;
        this.wasPlayingBeforeInterruption = this.appElements.isPlaying;
		
        if (this.appElements.currentPlayer) {
            this.currentTrackUrl = this.appElements.currentPlayer.src;
            this.currentTime = this.appElements.currentPlayer.currentTime;
        }

        // Update UI to show paused state
        this.appElements.isPlaying = false;
        if (this.appElements.playPauseBtn) {
            this.appElements.playPauseBtn.textContent = '▶';
        }

        // Show status message
        if (this.appElements.showStatus) {
            this.appElements.showStatus('Audio interrupted by another app', false);
        }
    }

    // Handle audio resumption
    handleAudioResumption() {
        if (!this.isInterrupted) return;

        debug.log('Handling audio resumption');
        this.isInterrupted = false;

        // If we were playing before interruption, show resume hint
        if (this.wasPlayingBeforeInterruption) {
            if (this.appElements.showStatus) {
                this.appElements.showStatus('Tap play to resume your music', false);
            }
			
            // Add visual cue to play button
            if (this.appElements.playPauseBtn) {
                this.appElements.playPauseBtn.style.animation = 'pulse 1s infinite';
                setTimeout(() => {
                    this.appElements.playPauseBtn.style.animation = '';
                }, 3000);
            }
        }
    }

    // Check and refresh audio source if needed
    async checkAndRefreshAudio() {
        if (!this.appElements.currentPlayer || !this.currentTrackUrl) return;

        debug.log('Checking audio source validity');
		
        // Try to refresh the audio source
        try {
            this.isHandlingInterruption = true;
			
            // Store current state
            const wasPlaying = this.appElements.isPlaying;
            const savedTime = this.currentTime;
			
            // Reset and reload the source
            this.appElements.currentPlayer.src = '';
            this.appElements.currentPlayer.load();
			
            // Wait a bit, then restore
            setTimeout(async () => {
                try {
                    this.appElements.currentPlayer.src = this.currentTrackUrl;
                    this.appElements.currentPlayer.load();
					
                    // Wait for metadata to load
                    await new Promise((resolve) => {
                        const onLoadedMetadata = () => {
                            this.appElements.currentPlayer.removeEventListener('loadedmetadata', onLoadedMetadata);
                            resolve();
                        };
                        this.appElements.currentPlayer.addEventListener('loadedmetadata', onLoadedMetadata);
                    });
					
                    // Restore position
                    if (savedTime > 0) {
                        this.appElements.currentPlayer.currentTime = savedTime;
                    }
					
                    debug.log('Audio source refreshed successfully');
					
                    // If we were playing, show hint to resume
                    if (wasPlaying && this.appElements.showStatus) {
                        this.appElements.showStatus('Tap play to resume', false);
                    }
					
                } catch (error) {
                    console.error('Error refreshing audio source:', error);
                    if (this.appElements.showStatus) {
                        this.appElements.showStatus('Audio playback error - try selecting the track again', true);
                    }
                } finally {
                    this.isHandlingInterruption = false;
                }
            }, 100);
			
        } catch (error) {
            console.error('Error in checkAndRefreshAudio:', error);
            this.isHandlingInterruption = false;
        }
    }

    // Enhanced play function with interruption recovery
    async playWithInterruptionRecovery() {
        if (!this.appElements.currentPlayer) return false;

        try {
            // If we were interrupted, try to recover first
            if (this.isInterrupted) {
                await this.checkAndRefreshAudio();
                this.isInterrupted = false;
            }

            // Ensure audio context is resumed
            if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
                const AudioContextClass = AudioContext || webkitAudioContext;
                const audioContext = new AudioContextClass();
                if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                }
            }

            // Try to play
            await this.appElements.currentPlayer.play();
            return true;
			
        } catch (error) {
            console.error('Playback failed, attempting recovery:', error);
			
            // Try to refresh the source and play again
            await this.checkAndRefreshAudio();
			
            try {
                await this.appElements.currentPlayer.play();
                return true;
            } catch (retryError) {
                console.error('Retry failed:', retryError);
                if (this.appElements.showStatus) {
                    this.appElements.showStatus('Playback failed - try selecting the track again', true);
                }
                return false;
            }
        }
    }

    // Method to check if audio is actually playing
    isAudioActuallyPlaying() {
        if (!this.appElements.currentPlayer) return false;
		
        // Check multiple indicators
        const playerNotPaused = !this.appElements.currentPlayer.paused;
        const hasCurrentTime = this.appElements.currentPlayer.currentTime > 0;
        const readyState = this.appElements.currentPlayer.readyState >= 2; // HAVE_CURRENT_DATA
		
        return playerNotPaused && (hasCurrentTime || readyState);
    }
}
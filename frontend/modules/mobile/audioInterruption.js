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
                        console.log('Failed to resume audio context:', err);
                    });
                }
            };

            // Resume on user interaction
            document.addEventListener('touchstart', resumeAudioContext);
            document.addEventListener('click', resumeAudioContext);
        }

        // Handle media session interruptions
        if ('mediaSession' in navigator) {
            // These events help detect when another app takes control
            navigator.mediaSession.setActionHandler('pause', () => {
                console.log('Media session pause detected');
                this.handleAudioInterruption();
                if (this.appElements.togglePlayPause) {
                    this.appElements.togglePlayPause();
                }
            });
        }

        // Handle native audio interruption events
        if (audioPlayer) {
            audioPlayer.addEventListener('pause', (e) => {
                // Check if this pause was programmatic or due to interruption
                if (!this.isHandlingInterruption && this.appElements.isPlaying) {
                    console.log('Audio paused unexpectedly - possible interruption');
                    this.handleAudioInterruption();
                }
            });

            audioPlayer.addEventListener('stalled', () => {
                console.log('Audio stalled - possible interruption');
                this.handleAudioInterruption();
            });

            audioPlayer.addEventListener('suspend', () => {
                console.log('Audio suspended - possible interruption');
                this.handleAudioInterruption();
            });

            audioPlayer.addEventListener('waiting', () => {
                // Only treat as interruption if we were playing
                if (this.appElements.isPlaying && !this.isInterrupted) {
                    console.log('Audio waiting - possible interruption');
                    this.handleAudioInterruption();
                }
            });
        }

        if (videoPlayer) {
            // Similar handlers for video player
            videoPlayer.addEventListener('pause', (e) => {
                if (!this.isHandlingInterruption && this.appElements.isPlaying) {
                    console.log('Video paused unexpectedly - possible interruption');
                    this.handleAudioInterruption();
                }
            });
        }
    }

    // Enhanced audio context handling
    setupAudioContextHandling() {
        // Create a global audio context monitor
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            const AudioContextClass = AudioContext || webkitAudioContext;
			
            // Create a monitor that checks audio context state
            setInterval(() => {
                if (this.appElements.currentPlayer && this.appElements.isPlaying) {
                    // Check if audio is actually playing
                    if (this.appElements.currentPlayer.paused && !this.isInterrupted) {
                        console.log('Detected audio is paused while state says playing');
                        this.handleAudioInterruption();
                    }
                }
            }, 1000);
        }
    }

    // Handle page visibility changes
    setupVisibilityHandling() {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isInterrupted) {
                // Page became visible again - check if we need to refresh audio
                console.log('Page visible again after interruption');
                setTimeout(() => {
                    this.checkAndRefreshAudio();
                }, 500);
            }
        });
    }

    // Handle audio interruption
    handleAudioInterruption() {
        if (this.isInterrupted) return; // Already handling

        console.log('Handling audio interruption');
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

        console.log('Handling audio resumption');
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

        console.log('Checking audio source validity');
		
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
					
                    console.log('Audio source refreshed successfully');
					
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
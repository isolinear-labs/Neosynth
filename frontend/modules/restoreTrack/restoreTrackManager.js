// Restore Track Manager - Expandable button for resuming last played track
const debug = window.debugLogger || { log: () => {}, info: () => {} };

class RestoreTrackManager {
    constructor() {
        this.container = null;
        this.panel = null;
        this.tab = null;
        this.resumeData = null;
        this.isExpanded = false;
        this.apiCall = null;
        this.userId = null;
        this.appCallbacks = null;
        this.init();
    }

    init() {
        this.createResumeButton();
        this.setupEventListeners();
    }

    // Initialize with app dependencies
    setup(dependencies) {
        this.apiCall = dependencies.apiCall;
        this.userId = dependencies.userId;
        this.appCallbacks = dependencies.appCallbacks;
        
        // Load initial resume data
        this.loadResumeData();
    }

    createResumeButton() {
        // Create neon text button for content control box
        this.container = document.createElement('div');
        this.container.className = 'neon-resume-container';
        this.container.id = 'resumeContainer';
        this.container.innerHTML = `
            <button class="neon-resume-btn" onclick="event.preventDefault(); event.stopPropagation(); restoreTrackManager.resumePlayback()">
                <span class="neon-text">RESUME</span>
                <span class="neon-subtitle">♫ Last Session</span>
            </button>
        `;

        // Insert into content control box after loading data
        this.insertIntoContentBox();
    }

    insertIntoContentBox() {
        // Find the playlist items container
        const playlistItems = document.getElementById('playlistItems');
        if (playlistItems) {
            // Find the "No tracks added yet..." message
            const noItemsMessage = playlistItems.querySelector('.no-items-message');
            if (noItemsMessage) {
                // Insert the resume button after the no-items message
                playlistItems.insertBefore(this.container, noItemsMessage.nextSibling);
            } else {
                // Fallback: insert at the beginning
                playlistItems.insertBefore(this.container, playlistItems.firstChild);
            }
        }
    }

    setupEventListeners() {
        // Simple button - no complex interactions needed
        // Click handling is done via onclick in the HTML
    }

    async loadResumeData() {
        if (!this.apiCall || !this.userId) {
            this.showNoTrack();
            return;
        }

        try {
            const response = await this.apiCall(`/api/nowplaying/${this.userId}`);
            
            if (!response || !response.ok) {
                this.showNoTrack();
                return;
            }

            const data = await response.json();
            this.resumeData = data;

            if (data && data.trackUrl && data.trackName) {
                this.showTrackData(data);
            } else {
                this.showNoTrack();
            }
        } catch (error) {
            console.error('Error loading resume data:', error);
            this.showNoTrack();
        }
    }

    showTrackData(data) {
        // Store the resume data
        this.resumeData = data;
        
        // Update button subtitle with track info
        const subtitle = this.container.querySelector('.neon-subtitle');
        if (subtitle) {
            const position = this.formatTime(data.position || 0);
            const duration = this.formatTime(data.duration || 0);
            const timeDisplay = duration > 0 ? `${position}/${duration}` : position;
            subtitle.textContent = `♫ ${data.trackName} (${timeDisplay})`;
        }
        
        // Only show button if playlist is empty
        this.updateButtonVisibility();
    }

    showNoTrack() {
        // Hide the button when no track data
        this.container.style.display = 'none';
    }

    updateButtonVisibility() {
        // Only show resume button when playlist is empty AND we have resume data
        const playlistItems = document.getElementById('playlistItems');
        const noItemsMessage = playlistItems?.querySelector('.no-items-message');
        
        if (this.resumeData && noItemsMessage && !noItemsMessage.classList.contains('hide')) {
            // Playlist is empty and we have resume data - show button
            this.container.style.display = 'block';
        } else {
            // Playlist has tracks or no resume data - hide button
            this.container.style.display = 'none';
        }
    }

    async resumePlayback() {
        if (!this.resumeData || !this.appCallbacks) {
            console.error('No resume data or app callbacks available');
            return;
        }

        try {
            // If we have a playlist ID, restore the full playlist
            if (this.resumeData.playListId && this.appCallbacks.loadPlaylistData) {
                const playlistResponse = await this.apiCall(`/api/playlists/detail/${this.resumeData.playListId}`);
                
                if (playlistResponse && playlistResponse.ok) {
                    const playlistData = await playlistResponse.json();
                    
                    // Load the full playlist
                    this.appCallbacks.loadPlaylistData(playlistData.name, playlistData.tracks, playlistData._id);
                    
                    // Find the track index by URL
                    const trackIndex = playlistData.tracks.findIndex(track => track.url === this.resumeData.trackUrl);
                    
                    if (trackIndex >= 0 && this.appCallbacks.playTrack) {
                        // Wait a moment for stopPlayback() to complete, then play the track
                        setTimeout(() => {
                            // Play the track - it will auto-start
                            this.appCallbacks.playTrack(trackIndex);

                            // Wait for player to initialize and start playing
                            const waitForPlayerAndSeek = () => {
                                const player = this.appCallbacks.getCurrentPlayer();
                                if (!player) {
                                    setTimeout(waitForPlayerAndSeek, 50);
                                    return;
                                }

                                // Wait for the media to be ready before seeking
                                const seekToPosition = () => {
                                    if (player.readyState >= 2) { // HAVE_CURRENT_DATA or higher
                                        // Pause first to avoid the "operation aborted" error
                                        player.pause();

                                        // Then seek to saved position
                                        if (typeof this.resumeData.position === 'number') {
                                            player.currentTime = this.resumeData.position;
                                        }

                                        // Apply volume multiplier after resuming
                                        if (window.volumeMultiplierManager && window.volumeMultiplierManager.isInitialized) {
                                            window.volumeMultiplierManager.onTrackChange();
                                        }

                                        // Resume playback
                                        player.play().catch(e => debug.log('Play interrupted:', e));
                                    } else {
                                        // Wait for loadeddata event
                                        const onLoadedData = () => {
                                            player.pause();

                                            if (typeof this.resumeData.position === 'number') {
                                                player.currentTime = this.resumeData.position;
                                            }

                                            // Apply volume multiplier after resuming
                                            if (window.volumeMultiplierManager && window.volumeMultiplierManager.isInitialized) {
                                                window.volumeMultiplierManager.onTrackChange();
                                            }

                                            player.play().catch(e => debug.log('Play interrupted:', e));
                                            player.removeEventListener('loadeddata', onLoadedData);
                                        };
                                        player.addEventListener('loadeddata', onLoadedData);
                                    }
                                };

                                seekToPosition();
                            };

                            waitForPlayerAndSeek();
                        }, 300);
                    } else {
                        // Track not found in playlist, fall back to single track
                        await this.fallbackToSingleTrack();
                    }
                } else {
                    // Playlist not found, fall back to single track
                    await this.fallbackToSingleTrack();
                }
            } else {
                // No playlist ID, just play the single track
                await this.fallbackToSingleTrack();
            }

            // Hide the button after resuming (will reappear when new track is played)
            this.container.style.display = 'none';

        } catch (error) {
            console.error('Error resuming playback:', error);
            // Fall back to single track on any error
            await this.fallbackToSingleTrack();
        }
    }

    async fallbackToSingleTrack() {
        // Fallback: just add the single track
        if (this.appCallbacks.addTrack) {
            const success = await this.appCallbacks.addTrack(this.resumeData.trackUrl);

            if (success && this.appCallbacks.getCurrentPlayer) {
                // Wait for player to initialize and start playing
                const waitForPlayerAndSeek = () => {
                    const player = this.appCallbacks.getCurrentPlayer();
                    if (!player) {
                        setTimeout(waitForPlayerAndSeek, 50);
                        return;
                    }

                    // Wait for the media to be ready before seeking
                    const seekToPosition = () => {
                        if (player.readyState >= 2) { // HAVE_CURRENT_DATA or higher
                            // Pause first to avoid the "operation aborted" error
                            player.pause();

                            // Then seek to saved position
                            if (typeof this.resumeData.position === 'number') {
                                player.currentTime = this.resumeData.position;
                            }

                            // Apply volume multiplier after resuming
                            if (window.volumeMultiplierManager && window.volumeMultiplierManager.isInitialized) {
                                window.volumeMultiplierManager.onTrackChange();
                            }

                            // Resume playback
                            player.play().catch(e => debug.log('Play interrupted:', e));
                        } else {
                            // Wait for loadeddata event
                            const onLoadedData = () => {
                                player.pause();

                                if (typeof this.resumeData.position === 'number') {
                                    player.currentTime = this.resumeData.position;
                                }

                                // Apply volume multiplier after resuming
                                if (window.volumeMultiplierManager && window.volumeMultiplierManager.isInitialized) {
                                    window.volumeMultiplierManager.onTrackChange();
                                }

                                player.play().catch(e => debug.log('Play interrupted:', e));
                                player.removeEventListener('loadeddata', onLoadedData);
                            };
                            player.addEventListener('loadeddata', onLoadedData);
                        }
                    };

                    seekToPosition();
                };

                waitForPlayerAndSeek();
            }
        }
    }

    // Update resume data when user plays new tracks
    updateResumeData(trackData) {
        this.resumeData = trackData;
        if (trackData && trackData.trackUrl && trackData.trackName) {
            this.showTrackData(trackData);
        } else {
            this.showNoTrack();
        }
    }

    // Call this when playlist changes to update button visibility
    onPlaylistChange() {
        this.updateButtonVisibility();
    }

    // Utility functions
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    getTimeAgo(dateString) {
        if (!dateString) return 'Unknown';
        
        const now = new Date();
        const past = new Date(dateString);
        const diffMs = now - past;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor(diffMs / (1000 * 60));

        if (diffHours >= 24) {
            const days = Math.floor(diffHours / 24);
            return `${days}d ago`;
        } else if (diffHours > 0) {
            return `${diffHours}h ago`;
        } else if (diffMins > 0) {
            return `${diffMins}m ago`;
        } else {
            return 'Just now';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Cleanup
    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}

// Create global instance
const restoreTrackManager = new RestoreTrackManager();

// Make it globally accessible
window.restoreTrackManager = restoreTrackManager;

export default restoreTrackManager;
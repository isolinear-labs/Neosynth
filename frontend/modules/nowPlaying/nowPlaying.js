/**
 * NowPlaying handles saving and loading the current playback state
 * to/from the server
 */
export class NowPlaying {
    constructor() {
        this.userId = localStorage.getItem('neosynthUserId');
        this.saveInterval = null;
        this.lastSaveTime = 0;
        this.saveThrottleMs = 10000; // Don't save more than once every 10 seconds
    }

    /**
	 * Initialize the manager with app elements
	 * @param {Object} appElements - App elements and state references
	 */
    init(appElements) {
        this.appElements = appElements;
		
        // Set up periodic saving if playing
        this.setupPeriodicSaving();
		
        // Set up save on unload
        window.addEventListener('beforeunload', () => {
            this.saveNowPlaying();
        });
    }

    /**
	 * Set up periodic saving during playback
	 */
    setupPeriodicSaving() {
        // Clear existing interval if any
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
        }
		
        // Set up new interval - save every 30 seconds during playback
        this.saveInterval = setInterval(() => {
            if (this.appElements.isPlaying) {
                this.saveNowPlaying();
            }
        }, 30000);
    }

    /**
	 * Save current track state to the server
	 */
    async saveNowPlaying() {
    //console.log("saveNowPlaying called");
    
        // Skip if no user ID or no current track
        if (!this.userId || this.appElements.currentTrackIndex < 0) {
            console.log('Skipping save - no userID or current track', 
                { userId: this.userId, currentTrackIndex: this.appElements.currentTrackIndex });
            return;
        }
		
        // Throttle saves to avoid too many requests
        const now = Date.now();
        if (now - this.lastSaveTime < this.saveThrottleMs) {
            console.log('Skipping save - throttled');
            return;
        }
		
        // Extract required data
        const { 
            currentPlayer, 
            currentTrackIndex, 
            nowPlayingName, 
            playlist, 
            isPlaying 
        } = this.appElements;
		
        // Get current playlist ID if available
        const playListId = playlist.playlistId || null;
		
        // Create state object
        const state = {
            playListId,
            trackUrl: currentPlayer?.src || null,
            trackName: nowPlayingName?.textContent || playlist[currentTrackIndex]?.name || 'Unknown Track',
            position: currentPlayer?.currentTime || 0,
            isPlaying
        };
		
        try {
            //console.log("Sending nowplaying fetch request to:", `/api/nowplaying/${this.userId}`);
            const response = await window.apiCall(`/api/nowplaying/${this.userId}`, {
                method: 'PUT',
                body: JSON.stringify(state)
            });
			
            if (response && response.ok) {
                this.lastSaveTime = now;
                //console.log('Now playing state saved');
                
                // Notify restore track manager of updated data
                if (window.restoreTrackManager) {
                    window.restoreTrackManager.updateResumeData(state);
                }
            } else if (response) {
                console.error('Failed to save now playing state:', 
                    await response.text(), 
                    response.status, 
                    response.statusText);
            }
            // If response is null, session expired and user was redirected
        } catch (error) {
            console.error('Error saving now playing state:', error);
        }
    }

    /**
	 * Trigger now playing save on track change
	 */
    onTrackChange() {
        //console.log("onTrackChange called");
        this.saveNowPlaying();
    }

    /**
	 * Trigger now playing save on play/pause
	 */
    onPlayPauseToggle() {
        //console.log("onPlayPauseToggle called");
        this.saveNowPlaying();
    }

    /**
	 * Load now playing state from server and apply it
	 */
    async loadNowPlaying() {
        if (!this.userId) {
            return false;
        }
		
        try {
            const response = await window.apiCall(`/api/nowplaying/${this.userId}`);
            if (!response || !response.ok) {
                return false;
            }
			
            const state = await response.json();
			
            // If we have a valid state with a track URL
            if (state && state.trackUrl) {
                // If we have a playListId, try to load that playlist first
                if (state.playListId) {
                    // You'll need a function to load a playlist by ID
                    await this.loadPlaylistById(state.playListId);
                }
				
                // If the track isn't in the current playlist, add it
                const trackIndex = this.findTrackInPlaylist(state.trackUrl);
                if (trackIndex === -1) {
                    // Add track to playlist
                    this.appElements.addTrack(state.trackUrl);
                    // Get the new index (should be the last item added)
                    const newIndex = this.appElements.playlist.length - 1;
                    // Play this track
                    this.appElements.playTrack(newIndex);
                } else {
                    // Track is already in playlist, play it
                    this.appElements.playTrack(trackIndex);
                }
				
                // Set the current time
                if (this.appElements.currentPlayer && state.position > 0) {
                    this.appElements.currentPlayer.currentTime = state.position;
                }
				
                // Set the playing state (toggle if needed)
                if (state.isPlaying !== this.appElements.isPlaying) {
                    this.appElements.togglePlayPause();
                }
				
                return true;
            }
			
            return false;
        } catch (error) {
            console.error('Error loading now playing state:', error);
            return false;
        }
    }
	
    /**
	 * Find a track URL in the current playlist
	 * @param {string} trackUrl - The track URL to find
	 * @returns {number} Index in playlist or -1 if not found
	 */
    findTrackInPlaylist(trackUrl) {
        if (!this.appElements.playlist || !trackUrl) {
            return -1;
        }
		
        return this.appElements.playlist.findIndex(track => track.url === trackUrl);
    }
	
    /**
	 * Load a playlist by ID
	 * @param {string} playlistId - The playlist ID to load
	 */
    async loadPlaylistById(playlistId) {
        try {
            const response = await window.apiCall(`/api/playlists/detail/${playlistId}`);
            if (!response || !response.ok) {
                throw new Error('Playlist not found');
            }
			
            const playlist = await response.json();
			
            // This would need to match your app's logic for loading a playlist
            // You might need to adapt this to how your app loads playlists
            if (this.appElements.loadPlaylistData) {
                this.appElements.loadPlaylistData(playlist.name, playlist.tracks);
            }
			
            return true;
        } catch (error) {
            console.error('Error loading playlist:', error);
            return false;
        }
    }
}
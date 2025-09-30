// frontend/modules/playlist/playlistManager.js

/**
 * Playlist Management Module for NeoSynth
 * Handles saving, loading, and managing playlists
 */
export class PlaylistManager {
    constructor() {
        this.API_URL = '/api';
        this.userId = null;
        this.showStatus = null;
        this.appElements = null;
    }

    /**
	 * Initialize the playlist manager
	 * @param {Object} options - Configuration options
	 */
    init(options = {}) {
        this.userId = options.userId;
        this.showStatus = options.showStatus;
        this.appElements = options.appElements;
		
        // Setup DOM elements
        this.playlistNameInput = document.getElementById('playlistNameInput');
        this.saveBtn = document.getElementById('saveBtn');
        this.loadBtn = document.getElementById('loadBtn');
        this.deleteBtn = document.getElementById('deleteBtn');
        this.playlistSelect = document.getElementById('playlistSelect');
		
        this.setupEventListeners();
        this.enhancePlaylistDropdown();
        this.loadSavedPlaylists();
		
        console.log('Playlist manager initialized');
    }

    /**
	 * Setup event listeners for playlist management
	 */
    setupEventListeners() {
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => this.savePlaylist());
        }
		
        if (this.loadBtn) {
            this.loadBtn.addEventListener('click', () => this.loadSelectedPlaylist());
        }
		
        if (this.deleteBtn) {
            this.deleteBtn.addEventListener('click', () => this.deleteSelectedPlaylist());
        }
    }

    /**
	 * Save current playlist
	 */
    async savePlaylist() {
        const playlistName = this.playlistNameInput.value.trim() || `Playlist ${new Date().toLocaleString()}`;
		
        if (!this.appElements.playlist || this.appElements.playlist.length === 0) {
            this.showStatus('Cannot save empty playlist', true);
            return;
        }
		
        // Create playlist data
        const playlistData = {
            name: playlistName,
            userId: this.userId,
            tracks: this.appElements.playlist
        };
		
        try {
            // First, check if a playlist with this name already exists for this user
            const response = await window.apiCall(`${this.API_URL}/playlists/${this.userId}`);
            if (!response || !response.ok) {
                throw new Error('Network response was not ok');
            }
			
            const existingPlaylists = await response.json();
            const existingPlaylist = existingPlaylists.find(p => p.name === playlistName);
			
            if (existingPlaylist) {
                // Update existing playlist
                const updateResponse = await window.apiCall(`${this.API_URL}/playlists/${existingPlaylist._id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(playlistData)
                });
				
                if (!updateResponse || !updateResponse.ok) {
                    throw new Error('Failed to update playlist');
                }
				
                this.showStatus(`Playlist "${playlistName}" updated`);
            } else {
                // Create new playlist
                const createResponse = await window.apiCall(`${this.API_URL}/playlists`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(playlistData)
                });
				
                if (!createResponse || !createResponse.ok) {
                    throw new Error('Failed to create playlist');
                }
				
                this.showStatus(`Playlist "${playlistName}" saved to database`);
            }
			
            // Reload playlists to update the dropdown
            this.loadSavedPlaylists();
			
        } catch (error) {
            console.error('Error saving playlist:', error);
			
            // Fall back to localStorage if API fails
            try {
                const savedPlaylists = JSON.parse(localStorage.getItem('neosynthPlaylists') || '{}');
				
                // Also check local storage for duplicates
                if (savedPlaylists[playlistName]) {
                    // Update existing local playlist
                    savedPlaylists[playlistName] = {
                        name: playlistName,
                        tracks: this.appElements.playlist,
                        created: savedPlaylists[playlistName].created,
                        updated: new Date().toISOString()
                    };
                    this.showStatus(`Playlist "${playlistName}" updated locally (API unavailable)`);
                } else {
                    // Create new local playlist
                    savedPlaylists[playlistName] = {
                        name: playlistName,
                        tracks: this.appElements.playlist,
                        created: new Date().toISOString(),
                        updated: new Date().toISOString()
                    };
                    this.showStatus(`Playlist "${playlistName}" saved locally (API unavailable)`);
                }

                localStorage.setItem('neosynthPlaylists', JSON.stringify(savedPlaylists));
                this.loadSavedPlaylists();
            } catch (_localError) {
                this.showStatus(`Error saving playlist: ${error.message}`, true);
            }
        }
    }

    /**
	 * Load saved playlists into dropdown
	 */
    loadSavedPlaylists() {
        // Clear dropdown except first option
        while (this.playlistSelect.options.length > 1) {
            this.playlistSelect.remove(1);
        }
		
        // Try to load from API first, fall back to localStorage if needed
        window.apiCall(`${this.API_URL}/playlists/${this.userId}`)
            .then(response => {
                if (!response || !response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(playlists => {
                // Sort playlists alphabetically by name
                playlists.sort((a, b) => a.name.localeCompare(b.name));
                
                // Add each playlist to dropdown
                playlists.forEach(playlist => {
                    const option = document.createElement('option');
                    option.value = playlist._id;
                    option.textContent = playlist.name;
                    option.dataset.source = 'api';
                    this.playlistSelect.appendChild(option);
                });
				
                // Disable/enable buttons
                const hasPlaylists = playlists.length > 0;
                this.loadBtn.disabled = !hasPlaylists;
                this.deleteBtn.disabled = !hasPlaylists;

                // Apply cyberpunk styling to dropdown options
                this.applyCyberpunkStyling();
            })
            .catch(error => {
                console.error('Error loading playlists from API, falling back to localStorage:', error);
				
                // Fall back to localStorage
                const savedPlaylists = JSON.parse(localStorage.getItem('neosynthPlaylists') || '{}');
				
                // Sort playlist keys alphabetically by playlist name
                const sortedKeys = Object.keys(savedPlaylists).sort((a, b) => 
                    savedPlaylists[a].name.localeCompare(savedPlaylists[b].name)
                );
                
                // Add each playlist to dropdown
                sortedKeys.forEach(key => {
                    const option = document.createElement('option');
                    option.value = key;
                    option.textContent = savedPlaylists[key].name;
                    option.dataset.source = 'local';
                    this.playlistSelect.appendChild(option);
                });
				
                // Disable/enable buttons
                const hasPlaylists = Object.keys(savedPlaylists).length > 0;
                this.loadBtn.disabled = !hasPlaylists;
                this.deleteBtn.disabled = !hasPlaylists;
				
                // Apply cyberpunk styling to dropdown options
                this.applyCyberpunkStyling();
            });
    }

    /**
	 * Apply cyberpunk styling to dropdown options
	 */
    applyCyberpunkStyling() {
        setTimeout(() => {
            const options = this.playlistSelect.querySelectorAll('option');
            options.forEach((option, index) => {
                if (index > 0 && !option.textContent.startsWith('.')) {
                    option.textContent = `.${option.textContent}`;
                }
            });
			
            // Ensure the first option has the cyberpunk placeholder
            if (this.playlistSelect.options.length > 0) {
                this.playlistSelect.options[0].text = '> Saved_Playlists.sh';
            }
        }, 100);
    }

    /**
	 * Load selected playlist
	 */
    loadSelectedPlaylist() {
        const selectedPlaylist = this.playlistSelect.value;
		
        if (!selectedPlaylist) {
            this.showStatus('Please select a playlist to load', true);
            return;
        }
		
        // Confirm if current playlist is not empty
        if (this.appElements.playlist.length > 0) {
            if (!confirm('Loading a new playlist will replace your current one. Continue?')) {
                return;
            }
        }
		
        // Check the source of the playlist (API or localStorage)
        const source = this.playlistSelect.options[this.playlistSelect.selectedIndex].dataset.source;
		
        if (source === 'api') {
            // Load from API
            window.apiCall(`${this.API_URL}/playlists/detail/${selectedPlaylist}`)
                .then(response => {
                    if (!response || !response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    this.loadPlaylistData(data.name, data.tracks, data._id);
                })
                .catch(error => {
                    this.showStatus(`Error loading playlist: ${error.message}`, true);
                    console.error('Error loading playlist:', error);
                });
        } else {
            // Load from localStorage
            const savedPlaylists = JSON.parse(localStorage.getItem('neosynthPlaylists') || '{}');
			
            if (!savedPlaylists[selectedPlaylist]) {
                this.showStatus('Playlist not found', true);
                return;
            }
			
            this.loadPlaylistData(savedPlaylists[selectedPlaylist].name, savedPlaylists[selectedPlaylist].tracks);
        }
    }

    /**
	 * Helper function to load playlist data
	 * @param {string} name - Playlist name
	 * @param {Array} tracks - Array of tracks
	 * @param {string} playlistId - Optional playlist ID
	 */
    loadPlaylistData(name, tracks, playlistId = null) {
        // Stop current playback
        if (this.appElements.stopPlayback) {
            this.appElements.stopPlayback();
        }
		
        // Update playlist
        this.appElements.playlist.length = 0;
        this.appElements.playlist.push(...tracks);
        this.appElements.playlist.playlistId = playlistId;
        this.appElements.currentTrackIndex = -1;
		
        // Update play history if it exists
        if (this.appElements.updatePlayHistory) {
            this.appElements.updatePlayHistory(this.appElements.currentTrackIndex);
        }
		
        // Update volume multiplier display and apply to player for new playlist
        if (window.volumeMultiplierManager && window.volumeMultiplierManager.isInitialized) {
            window.volumeMultiplierManager.onTrackChange();
        }
		
        // Re-render playlist and update counter
        if (this.appElements.renderPlaylist) {
            this.appElements.renderPlaylist();
        }
        if (this.appElements.updateTrackCounter) {
            this.appElements.updateTrackCounter();
        }
		
        // Start playing if there are tracks
        if (this.appElements.playlist.length > 0) {
            // If shuffle is enabled, choose a random track to start with
            let startIndex = 0;
            if (this.appElements.isShuffleEnabled && this.appElements.shuffleState && 
				this.appElements.shuffleState.value && this.appElements.playlist.length > 1) {
                startIndex = Math.floor(Math.random() * this.appElements.playlist.length);
            }
			
            if (this.appElements.playTrack) {
                this.appElements.playTrack(startIndex);
            }
        }
		
        // Update playlist name input
        this.playlistNameInput.value = name;
        this.showStatus(`Loaded playlist: "${name}"`);
    }

    /**
	 * Delete selected playlist
	 */
    deleteSelectedPlaylist() {
        const selectedPlaylist = this.playlistSelect.value;
		
        if (!selectedPlaylist) {
            this.showStatus('Please select a playlist to delete', true);
            return;
        }
		
        // Get playlist name for confirmation
        const playlistName = this.playlistSelect.options[this.playlistSelect.selectedIndex].textContent.replace(/^\./, '');
		
        // Confirm deletion
        if (!confirm(`Are you sure you want to delete "${playlistName}"?`)) {
            return;
        }
		
        // Check the source of the playlist (API or localStorage)
        const source = this.playlistSelect.options[this.playlistSelect.selectedIndex].dataset.source;
		
        if (source === 'api') {
            // Delete from API
            window.apiCall(`${this.API_URL}/playlists/${selectedPlaylist}`, {
                method: 'DELETE'
            })
                .then(response => {
                    if (!response || !response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(_data => {
                    this.loadSavedPlaylists();
                    this.showStatus(`Deleted playlist "${playlistName}"`);
                })
                .catch(error => {
                    this.showStatus(`Error deleting playlist: ${error.message}`, true);
                    console.error('Error deleting playlist:', error);
                });
        } else {
            // Delete from localStorage
            const savedPlaylists = JSON.parse(localStorage.getItem('neosynthPlaylists') || '{}');
			
            if (!savedPlaylists[selectedPlaylist]) {
                this.showStatus('Playlist not found', true);
                return;
            }
			
            // Delete playlist
            delete savedPlaylists[selectedPlaylist];
			
            // Save changes
            localStorage.setItem('neosynthPlaylists', JSON.stringify(savedPlaylists));
			
            // Update dropdown
            this.loadSavedPlaylists();
			
            this.showStatus(`Deleted playlist: "${playlistName}"`);
        }
    }

    /**
	 * Enhance the playlist dropdown with cyberpunk styling
	 */
    enhancePlaylistDropdown() {
        if (!this.playlistSelect) return;
		
        // Replace the placeholder text
        if (this.playlistSelect.options.length > 0) {
            this.playlistSelect.options[0].text = '> Saved_Playlists.sh';
        }
		
        // Create wrapper if it doesn't exist already
        if (!this.playlistSelect.parentNode.classList.contains('select-wrapper')) {
            const selectWrapper = document.createElement('div');
            selectWrapper.className = 'select-wrapper';
			
            // Insert wrapper before select
            this.playlistSelect.parentNode.insertBefore(selectWrapper, this.playlistSelect);
			
            // Move select inside wrapper
            selectWrapper.appendChild(this.playlistSelect);
        }
    }

    /**
	 * Get the current playlist name from input
	 * @returns {string} Current playlist name
	 */
    getCurrentPlaylistName() {
        return this.playlistNameInput ? this.playlistNameInput.value.trim() : '';
    }

    /**
	 * Set the playlist name in the input
	 * @param {string} name - Playlist name to set
	 */
    setCurrentPlaylistName(name) {
        if (this.playlistNameInput) {
            this.playlistNameInput.value = name;
        }
    }

    /**
	 * Clear the playlist name input
	 */
    clearPlaylistName() {
        if (this.playlistNameInput) {
            this.playlistNameInput.value = '';
        }
    }

    /**
	 * Get available playlists
	 * @returns {Promise<Array>} Array of available playlists
	 */
    async getAvailablePlaylists() {
        try {
            const response = await window.apiCall(`${this.API_URL}/playlists/${this.userId}`);
            if (response && response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error fetching playlists from API:', error);
        }
		
        // Fallback to localStorage
        const savedPlaylists = JSON.parse(localStorage.getItem('neosynthPlaylists') || '{}');
        return Object.values(savedPlaylists);
    }

    /**
	 * Check if a playlist with the given name exists
	 * @param {string} playlistName - Name to check
	 * @returns {Promise<boolean>} True if playlist exists
	 */
    async playlistExists(playlistName) {
        const playlists = await this.getAvailablePlaylists();
        return playlists.some(playlist => playlist.name === playlistName);
    }

    /**
	 * Destroy the playlist manager
	 */
    destroy() {
        // Remove event listeners
        if (this.saveBtn) {
            this.saveBtn.removeEventListener('click', this.savePlaylist);
        }
        if (this.loadBtn) {
            this.loadBtn.removeEventListener('click', this.loadSelectedPlaylist);
        }
        if (this.deleteBtn) {
            this.deleteBtn.removeEventListener('click', this.deleteSelectedPlaylist);
        }
		
        // Clear references
        this.playlistNameInput = null;
        this.saveBtn = null;
        this.loadBtn = null;
        this.deleteBtn = null;
        this.playlistSelect = null;
        this.appElements = null;
		
        console.log('Playlist manager destroyed');
    }
}
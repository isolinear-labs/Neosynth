import { digitalRainManager } from './modules/effects/index.js';
import { featureManager } from './modules/features/index.js';
import { isDirectoryUrl, processDirectoryWithModal } from './modules/directory/index.js';
import DragDrop from './modules/dragDrop/dragDrop.js';
import { initMobile } from './modules/mobile/init.js';
import { NowPlaying } from './modules/nowPlaying/index.js';
import { PlaylistManager } from './modules/playlist/index.js';
import { initPreferences } from './modules/preferences/init.js';
import { restoreTrackManager } from './modules/restoreTrack/index.js';
import settingsIntegration from './modules/settings/index.js';
import { shuffleManager } from './modules/shuffle/index.js';
import { terminalManager } from './modules/terminal/index.js';
import { themeSystem } from './modules/themes/themeSystem.js';
import { sessionCheck } from './modules/sessionCheck/index.js';
import { volumeMultiplierManager } from './modules/volumeMultiplier/index.js';
import { PasswordResetDropdown } from './modules/passwordReset/index.js';
import { SYSTEM_VERSION_DISPLAY } from './constants.js';

// Get user ID (session token now handled by cookies)
const userId = localStorage.getItem('neosynthUserId');

// Global API wrapper with 401 handling
async function apiCall(url, options = {}) {
    const defaultHeaders = {
        'Content-Type': 'application/json'
        // No need for session token header - cookies sent automatically
    };
	
    const requestOptions = {
        ...options,
        credentials: 'same-origin', // Include cookies in requests
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };
	
    try {
        const response = await fetch(url, requestOptions);
		
        if (response.status === 401) {
            // Session expired - logout user
            console.log('Session expired, logging out user');
            localStorage.removeItem('neosynthUserId');
            localStorage.removeItem('neosynthLoginExpiration');
            window.location.href = '/login';
            return null;
        }
		
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
		
        return response;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Make apiCall globally available for modules
window.apiCall = apiCall;

// Check if we have a user ID - server will validate the actual session
if (!userId) {
    // No user ID stored, redirect to login
    localStorage.removeItem('neosynthUserId');
    localStorage.removeItem('neosynthLoginExpiration');
    localStorage.removeItem('neosynthSessionToken');
    window.location.href = '/login';
} else {
    console.log('Using existing user ID:', userId);
	
    // Check if we have a display name for this user - otherwise return 'Unknown'
    const userDisplayName = userId ? 
        userId.charAt(0).toUpperCase() + userId.slice(1) : 
        'Unknown';
	
    // Add logout button and user display to the header
    document.addEventListener('DOMContentLoaded', async function() {
        // Update version display from constants
        const systemVersionElement = document.getElementById('systemVersion');
        if (systemVersionElement) {
            systemVersionElement.textContent = SYSTEM_VERSION_DISPLAY;
        }

        const headerSubtitle = document.querySelector('.subtitle');
		
        // Create user status display
        const userStatus = document.createElement('div');
        userStatus.className = 'user-status';
        userStatus.innerHTML = `
			<span class="user-name">${userDisplayName}</span>
			<button id="prefBtn" class="btn-pref">Save Profile</button>
			<button id="logoutBtn" class="btn-logout">Logout</button>
		`;
		
        // Insert after subtitle
        headerSubtitle.parentNode.insertBefore(userStatus, headerSubtitle.nextSibling);

        // Initialize password reset dropdown
        const passwordResetDropdown = new PasswordResetDropdown();
        passwordResetDropdown.init(userStatus, apiCall);

        // Initialize session check module if feature flag is enabled
        if (featureManager.isEnabled('session_expiration_warning')) {
            sessionCheck.init(userStatus, apiCall, featureManager);
            
            // Check session status and handle daily extensions before app loads
            const sessionValid = await sessionCheck.validateSessionOnStartup((message) => {
                console.log('Status:', message);
            });
            if (!sessionValid) {
                window.location.href = '/login';
                return;
            }
        }

        // Add logout event listener
        document.getElementById('logoutBtn').addEventListener('click', async function() {
            try {
                // Call backend logout to clear session cookie
                await apiCall('/api/auth/logout', { method: 'POST' });
            } catch (error) {
                console.error('Logout API call failed:', error);
            }
			
            // Clear localStorage and redirect
            localStorage.removeItem('neosynthUserId');
            localStorage.removeItem('neosynthLoginExpiration');
            window.location.href = '/login';
        });
    });
}

// App initialization
document.addEventListener('DOMContentLoaded', async function() {
    // DOM Elements
    const addBtn = document.getElementById('addBtn');
    const audioPlayer = document.getElementById('audioPlayer');
    const clearBtn = document.getElementById('clearBtn');
    const currentTime = document.getElementById('currentTime');
    const dropIndicator = document.getElementById('dropIndicator');
    const dropZone = document.getElementById('dropZone');
    const duration = document.getElementById('duration');
    const muteBtn = document.getElementById('muteBtn');
    const nextBtn = document.getElementById('nextBtn');
    const nowPlayingContainer = document.getElementById('nowPlayingContainer');
    const nowPlayingName = document.getElementById('nowPlayingName');
    const playlistItems = document.getElementById('playlistItems');
    const playlistNameInput = document.getElementById('playlistNameInput');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playerStatusIndicator = document.getElementById('playerStatusIndicator');
    const prevBtn = document.getElementById('prevBtn');
    const progressBar = document.getElementById('progressBar');
    const progressContainer = document.getElementById('progressContainer');
    const shuffleBtn = document.getElementById('shuffleBtn');
    const statusMessage = document.getElementById('statusMessage');
    const trackCounter = document.getElementById('trackCounter');
    const urlInput = document.getElementById('urlInput');
    const videoContainer = document.getElementById('videoContainer');
    const videoPlayer = document.getElementById('videoPlayer');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeMultiplier = document.getElementById('volumeMultiplier');
	
    // Manager instances
    const nowPlayingManager = new NowPlaying();
    const playlistManager = new PlaylistManager();


    // App State - Constants
    const HISTORY_MAX_SIZE = 3;
	
    // App State - Player variables
    let currentPlayer = null;
    let currentTrackIndex = -1;
    let isPlaying = false;
    let isShuffleEnabled = false;
    let previousVolume = 1;
    let isIntentionalStop = false;
	
	
    // App State - Playlist variables
    let originalPlaylist = [];
    let playHistory = [];
    let playlist = [];
	
    // Create a reactive shuffle state object
    const shuffleState = {
        _value: false,
        get value() {
            return this._value;
        },
        set value(newValue) {
            this._value = newValue;
            isShuffleEnabled = newValue; // Keep the original variable in sync
        }
    };

    // Initialize
    updateTrackCounter();
    setupDragAndDrop();
    createDigitalRain();
	
    // Initialize theme system
    await themeSystem.init(userId, showStatus);
	
    // Initialize preferences
    const appElements = {
        volumeSlider: volumeSlider,
        updateVolume: updateVolume, 
        isShuffleEnabledRef: shuffleState,  // Use the reactive object
        shuffleBtn: shuffleBtn,
        playerStatusIndicator: playerStatusIndicator,
        themeSystem: themeSystem
    };

    // Initialize playlist manager
    playlistManager.init({
        userId: userId,
        showStatus: showStatus,
        appElements: {
            get playlist() { return playlist; },
            set playlist(value) { 
                playlist.length = 0;
                playlist.push(...value);
            },
            get currentTrackIndex() { return currentTrackIndex; },
            set currentTrackIndex(value) { currentTrackIndex = value; },
            get isShuffleEnabled() { return isShuffleEnabled; },
            shuffleState: shuffleState,
            stopPlayback: stopPlayback,
            renderPlaylist: renderPlaylist,
            updateTrackCounter: updateTrackCounter,
            playTrack: playTrack,
            updatePlayHistory: updatePlayHistory
        }
    });

    // Initialize shuffle manager
    shuffleManager.init({
        userId: userId,
        showStatus: showStatus
    });

    // Make shuffle manager globally available
    window.shuffleManager = shuffleManager;

    // Helper function to load playlist data (for compatibility with nowPlayingManager)
    function loadPlaylistData(name, tracks, playlistId = null) {
        // Use the playlist manager's loadPlaylistData method
        playlistManager.loadPlaylistData(name, tracks, playlistId);
    }

    // Initialize feature manager first (needed by settings system)
    await featureManager.init({ userId });
    
    // Make featureManager available globally for debugging
    window.featureManager = featureManager;

    // Initialize admin panel button (feature flag controlled)
    import('./modules/admin-panel/adminPanelButton.js').then(module => {
        // Module auto-initializes when imported
        console.log('Admin panel button module loaded');
        
        // Make admin panel button available globally for debugging
        window.adminPanelButton = module.adminPanelButton;
    }).catch(error => {
        console.log('Admin panel button module not available:', error.message);
    });

    // Initialize volume multiplier module (feature flag controlled)  
    import('./modules/volumeMultiplier/index.js').then(module => {
        console.log('Volume multiplier module loaded');
        window.volumeMultiplierManager = module.volumeMultiplierManager;
    }).catch(error => {
        console.log('Volume multiplier module not available:', error.message);
    });

    // Initialize settings integration
    await settingsIntegration.init({
        themeSystem: themeSystem,
        appElements: appElements,
        userId: userId,
        showStatus: showStatus
    });

    // Session validation already handled in first DOMContentLoaded handler

    initPreferences(userId, appElements, showStatus);

    // Initialize restore track manager
    restoreTrackManager.setup({
        apiCall: apiCall,
        userId: userId,
        appCallbacks: {
            addTrack: addTrack,
            getCurrentPlayer: () => currentPlayer,
            loadPlaylistData: loadPlaylistData,
            playTrack: playTrack
        }
    });

    /**
	 * Initialize digital rain effect
	 */
    function createDigitalRain() {
        const success = digitalRainManager.init('digitalRain', {
            columnSpacing: 60,		// Space between columns
            minColumns: 5,			// Minimum columns on small screens
            newRainInterval: 2000,	// Interval for new rain drops (ms)
            resizeDebounce: 300		// Debounce time for resize events (ms)
        });
		
        if (success) {
            console.log('Digital rain effect loaded successfully');
        } else {
            console.warn('Failed to initialize digital rain effect');
        }
    }


    // Mobile appScope
    const appScope = {
        // Variables
        get playlist() { return playlist; },
        set playlist(value) { playlist = value; },
        get currentTrackIndex() { return currentTrackIndex; },
        set currentTrackIndex(value) { currentTrackIndex = value; },
        get isPlaying() { return isPlaying; },
        set isPlaying(value) { isPlaying = value; },
        get currentPlayer() { return currentPlayer; },
        set currentPlayer(value) { currentPlayer = value; },
        get originalPlaylist() { return originalPlaylist; },
        set originalPlaylist(value) { originalPlaylist = value; },
        get playHistory() { return playHistory; },
        set playHistory(value) { playHistory = value; },
		
        // Reactive objects
        shuffleState,
		
        // Functions - these are automatically updated as they're referenced
        playTrack,
        playNext,
        playPrevious,
        togglePlayPause,
        stopPlayback,
        addTrack,
        removeTrack,
        renderPlaylist,
        updateTrackCounter,
        updateVolume
    };

    // Helper function for adding individual tracks (extracted from addTrack)
    async function addSingleTrack(url) {
        const fileName = getFileNameFromUrl(url);
		
        // Check if the URL is already in the playlist
        const existingIndex = playlist.findIndex(item => item.url === url);
        if (existingIndex >= 0) {
            return false; // Already exists
        }
		
        playlist.push({
            url: url,
            name: fileName,
            duration: null
        });
		
        return true;
    }

    // Initialize nowPlayingManager Features
    nowPlayingManager.init({
        get playlist() { return playlist; },
        get currentTrackIndex() { return currentTrackIndex; },
        get isPlaying() { return isPlaying; },
        get currentPlayer() { return currentPlayer; },
        nowPlayingName,
        playTrack: playTrack,
        togglePlayPause: togglePlayPause,
        addTrack: addTrack,
        loadPlaylistData: loadPlaylistData
    });

    // Initialize volume multiplier manager with proper app elements
    if (window.volumeMultiplierManager) {
        window.volumeMultiplierManager.init({
            get playlist() { return playlist; },
            get currentTrackIndex() { return currentTrackIndex; },
            get currentPlayer() { return currentPlayer; },
            get volumeSlider() { return volumeSlider; }
        });
    }
	
    /* Disabled for now - we do not want this yet. 
	*
	// Load now playing state
	nowPlayingManager.loadNowPlaying().then(restored => {
		if (restored) {
			showStatus('Resumed your playback session');
		}
	});
	*
	*/

    // Wrap playTrack function to save now playing state
    const originalPlayTrack = playTrack;
    playTrack = function(index) {
        console.log('Wrapped playTrack called with index:', index);
        const result = originalPlayTrack.apply(this, arguments);
        //console.log("Calling nowPlayingManager.onTrackChange()");
        nowPlayingManager.onTrackChange();
        
        // Notify volume multiplier manager of track change
        if (window.volumeMultiplierManager && window.volumeMultiplierManager.isInitialized) {
            window.volumeMultiplierManager.onTrackChange();
        }
        
        return result;
    };
	
    // Wrap togglePlayPause function to save now playing state
    const originalTogglePlayPause = togglePlayPause;
    togglePlayPause = function() {
        console.log('Wrapped togglePlayPause called');
        const result = originalTogglePlayPause.apply(this, arguments);
        //console.log("Calling nowPlayingManager.onPlayPauseToggle()");
        nowPlayingManager.onPlayPauseToggle();
        return result;
    };

    // Initialize mobile features
    initMobile(appScope, showStatus)
        .then(mobileFeatures => {
            // Store reference for cleanup
            window.mobileFeatures = mobileFeatures;
			
            // Wrap functions that need to trigger mobile events
            const wrapFunction = (originalFn, mobileFn) => {
                return function(...args) {
                    const result = originalFn.apply(this, args);
                    mobileFn();
                    return result;
                };
            };
			
            // Wrap functions with mobile event triggers
            playTrack = wrapFunction(playTrack, () => {
                const track = playlist[currentTrackIndex];
                const playlistName = playlistNameInput ? playlistNameInput.value : '';
                mobileFeatures.onTrackChange(track, playlistName);
            });
			
            addTrack = wrapFunction(addTrack, () => {
                mobileFeatures.onPlaylistChange();
            });
			
            removeTrack = wrapFunction(removeTrack, () => {
                mobileFeatures.onPlaylistChange();
            });
			
            stopPlayback = wrapFunction(stopPlayback, () => {
                mobileFeatures.onPlaybackStop();
            });
			
            // Re-setup DragDrop with the new wrapped functions
            DragDrop.init({
                onReorder: (sourceIndex, targetIndex) => {
                    // Update playlist array
                    const itemToMove = playlist.splice(sourceIndex, 1)[0];
                    playlist.splice(targetIndex, 0, itemToMove);
					
                    // Update currentTrackIndex if needed
                    if (currentTrackIndex === sourceIndex) {
                        currentTrackIndex = targetIndex;
                    } else if (currentTrackIndex > sourceIndex && currentTrackIndex <= targetIndex) {
                        currentTrackIndex--;
                    } else if (currentTrackIndex < sourceIndex && currentTrackIndex >= targetIndex) {
                        currentTrackIndex++;
                    }
					
                    // Re-render playlist
                    renderPlaylist();
                    showStatus(`Reordered: ${itemToMove.name}`);
					
                    // Notify mobile features
                    mobileFeatures.onPlaylistChange();
                },
                playlistSelector: '#playlistItems',
                itemSelector: '.playlist-item',
                handleSelector: '.btn-move-item'
            });
			
        })
        .catch(error => {
            console.error('Error initializing mobile features:', error);
            showStatus('Some mobile features may not be available', true);
        });

    // Show status message
    function showStatus(message, isError = false) {
        statusMessage.textContent = message;
        statusMessage.className = 'status-message';
        statusMessage.classList.add(isError ? 'status-error' : 'status-success');
		
        // Auto-hide after 5 seconds
        setTimeout(() => {
            statusMessage.className = 'status-message';
        }, 5000);
    }
	
    // Format time in MM:SS format
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
	
    // Get file name from URL
    function getFileNameFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            let filename = pathname.split('/').pop();
            // Remove query params if any
            filename = filename.split('?')[0];
            // Decode URL encoded characters
            filename = decodeURIComponent(filename);
            // Return filename or default name
            return filename || 'Unknown Track';
        } catch (_error) {
            return 'Unknown Track';
        }
    }
	
    // Check if URL is potentially a valid media file
    function isValidMediaUrl(url) {
        if (!url) return false;
		
        try {
            new URL(url);
        } catch (_e) {
            return false;
        }
		
        return true;
    }
	
    // Extract URL from text
    function extractUrl(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const match = text.match(urlRegex);
		
        if (match && match.length > 0) {
            return match[0];
        }
		
        return text;
    }

    // Add track to playlist
    async function addTrack(url) {
        url = extractUrl(url.trim());
		
        if (!isValidMediaUrl(url)) {
            showStatus('Please enter a valid media URL', true);
            return false;
        }
		
        // Check if this might be a directory URL
        if (isDirectoryUrl(url)) {
            showStatus('Detected directory URL. Scanning for media files...', false);
			
            // Add scanning animation to the input
            urlInput.classList.add('scanning');
			
            try {
                // Use the new modal-based directory processor
                const addedCount = await processDirectoryWithModal(
                    url,
                    addSingleTrack,
                    showStatus
                );
				
                if (addedCount > 0) {
                    renderPlaylist();
                    updateTrackCounter();
					
                    // Start playing if this is the first track
                    if (playlist.length === addedCount) {
                        playTrack(0);
                    }
					
                    // Clear input field
                    urlInput.value = '';
					
                    showStatus(`Added ${addedCount} files from directory`, false);
                } else {
                    showStatus('No files were added', true);
                }
				
                return addedCount > 0;
            } catch (error) {
                console.error('Error processing directory:', error);
                showStatus(error.message, true);
                return false;
            }
        }
		
        // Handle single track (existing logic)
        const fileName = getFileNameFromUrl(url);
		
        // Check if the URL is already in the playlist
        const existingIndex = playlist.findIndex(item => item.url === url);
        if (existingIndex >= 0) {
            showStatus(`"${fileName}" is already in your playlist`, true);
            return false;
        }
		
        playlist.push({
            url: url,
            name: fileName,
            duration: null
        });
		
        renderPlaylist();
        updateTrackCounter();
        showStatus(`Added: ${fileName}`);
		
        // Start playing if this is the first track
        if (playlist.length === 1) {
            playTrack(0);
        }
		
        // Clear input field
        urlInput.value = '';
        return true;
    }
	
    // Update track counter
    function updateTrackCounter() {
        trackCounter.textContent = `${playlist.length} Track${playlist.length !== 1 ? 's' : ''}`;
    }
	
    // Render playlist items
    function renderPlaylist() {
        playlistItems.innerHTML = '';
		
        if (playlist.length === 0) {
            playlistItems.innerHTML = '<div class="no-items-message">No tracks added yet. Paste a URL above or drag & drop links to get started.</div>';
            return;
        }
		
        // Add each track to the display
        playlist.forEach((track, index) => {
            const item = document.createElement('div');
            item.className = `playlist-item ${index === currentTrackIndex ? 'playing' : ''}`;
            item.dataset.index = index;
			
            // Format duration or display placeholder
            const durationDisplay = track.duration ? formatTime(track.duration) : '--:--';
			
            item.innerHTML = `
				<div class="item-left">
					<div class="item-icon">♫</div>
					<div class="item-info">
						<div class="item-name">${track.name}</div>
						<div class="item-duration">${durationDisplay}</div>
					</div>
				</div>
				<div class="item-actions">
					<button class="item-btn btn-play-item">▶</button>
					<button class="item-btn btn-move-item">⇅</button>
					<button class="item-btn btn-remove-item">✕</button>
				</div>
			`;
			
            // Add click event for play button
            item.querySelector('.btn-play-item').addEventListener('click', () => {
                playTrack(index);
            });
			
            // Add click event for remove button
            item.querySelector('.btn-remove-item').addEventListener('click', () => {
                removeTrack(index);
            });
			
            playlistItems.appendChild(item);
        });
		
        // Show player if we have tracks
        if (playlist.length > 0) {
            nowPlayingContainer.classList.remove('hide');
        } else {
            nowPlayingContainer.classList.add('hide');
        }
        DragDrop.refresh();
        
        // Notify restore track manager of playlist changes
        if (window.restoreTrackManager) {
            window.restoreTrackManager.onPlaylistChange();
        }
    }
	
    // Shuffle logic
    // Function to handle toggling shuffle mode
    function toggleShuffle() {
        if (!shuffleState.value) {
            // Enable shuffle
            shuffleState.value = true;
            shuffleBtn.classList.add('active');
            playerStatusIndicator.classList.remove('hide');
            playerStatusIndicator.classList.add('active');
			
            // Reset play history to just the current track
            playHistory = currentTrackIndex >= 0 ? [currentTrackIndex] : [];

            // Store the original playlist
            originalPlaylist = [...playlist];
			
            // Shuffle the playlist (except the current track)
            const currentPlaylist = [...playlist];
            const currentTrackItem = currentPlaylist.splice(currentTrackIndex, 1)[0];
			
            // Fisher-Yates shuffle algorithm
            for (let i = currentPlaylist.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [currentPlaylist[i], currentPlaylist[j]] = [currentPlaylist[j], currentPlaylist[i]];
            }
			
            // Put current track back at current index
            currentPlaylist.splice(currentTrackIndex, 0, currentTrackItem);
			
            // Update playlist
            playlist = currentPlaylist;
			
            // Don't re-render playlist here to avoid confusing the user with the visual order change
        } else {
            // Disable shuffle
            shuffleState.value = false;
            shuffleBtn.classList.remove('active');
            playerStatusIndicator.classList.remove('active');
            playerStatusIndicator.classList.add('hide');
			
            // Reset play history 
            playHistory = currentTrackIndex >= 0 ? [currentTrackIndex] : [];

            // If we have an original playlist, restore it
            if (originalPlaylist.length > 0) {
                // Remember current track
                const currentTrack = playlist[currentTrackIndex];
				
                // Restore playlist
                playlist = [...originalPlaylist];
				
                // Find the index of the current track in the restored playlist
                currentTrackIndex = playlist.findIndex(track => track.url === currentTrack.url);
                if (currentTrackIndex === -1) currentTrackIndex = 0;
            }
        }
        // Re-render playlist to reflect current stat
        renderPlaylist();
    }
	
    // Remove track from playlist
    function removeTrack(index) {
        const trackName = playlist[index].name;
		
        // If removing currently playing track
        if (index === currentTrackIndex) {
            stopPlayback();
            playlist.splice(index, 1);
			
            // If there are still tracks, play the next one
            if (playlist.length > 0) {
                currentTrackIndex = index >= playlist.length ? 0 : index;
                playTrack(currentTrackIndex);
            } else {
                currentTrackIndex = -1;
                nowPlayingContainer.classList.add('hide');
            }
        } else {
            // Adjust currentTrackIndex if we're removing a track before it
            if (index < currentTrackIndex) {
                currentTrackIndex--;
            }
			
            playlist.splice(index, 1);
        }
		
        renderPlaylist();
        updateTrackCounter();
        showStatus(`Removed: ${trackName}`);
    }
	
    // Play a track
    function playTrack(index) {
        if (index < 0 || index >= playlist.length) return;
		
        // Stop current playback
        stopPlayback();
		
        currentTrackIndex = index;
        updatePlayHistory(currentTrackIndex);
        const track = playlist[currentTrackIndex];
		
        // Update now playing info
        nowPlayingName.textContent = track.name;
		
        // Show now playing container
        nowPlayingContainer.classList.remove('hide');
		
        // Check file extension
        const fileExt = track.url.split('.').pop().toLowerCase();
		
        // Setup the appropriate player
        if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(fileExt)) {
            // Audio file
            videoContainer.classList.add('hide');
            audioPlayer.src = track.url;
            currentPlayer = audioPlayer;
        } else {
            // Video or other file - assume it might have video
            videoContainer.classList.add('hide'); // Hide first, then show if it has video
            videoPlayer.src = track.url;
            currentPlayer = videoPlayer;
			
            // Check if it has video content
            videoPlayer.addEventListener('loadedmetadata', function videoCheck() {
                try {
                    if (videoPlayer.videoWidth > 0 && videoPlayer.videoHeight > 0) {
                        // Only show video if the videoDisplay setting is enabled
                        const settings = settingsIntegration.getSettings();
                        if (settings.videoDisplay) {
                            videoContainer.classList.remove('hide');
                        }
                        // If videoDisplay is off, keep the video hidden (audio only)
                    }
                } catch (_e) {
                    // Keep hidden if error
                }
                videoPlayer.removeEventListener('loadedmetadata', videoCheck);
            });
        }
		
        // Set volume
        currentPlayer.volume = volumeSlider.value / 100;
		
        // Start playing
        currentPlayer.play()
            .then(() => {
                isPlaying = true;
                playPauseBtn.textContent = '⏸';
                renderPlaylist();
                
                // Record play in shuffle manager
                shuffleManager.recordPlay(track.url, track.name);
            })
            .catch(error => {
                showStatus(`Error playing track: ${error.message}`, true);
            });
    }
	
    // Stop current playback
    function stopPlayback() {
        isIntentionalStop = true;
        
        if (audioPlayer.src) {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
            audioPlayer.src = '';
        }
		
        if (videoPlayer.src) {
            videoPlayer.pause();
            videoPlayer.currentTime = 0;
            videoPlayer.src = '';
        }
		
        isPlaying = false;
        playPauseBtn.textContent = '▶';
        
        // Reset flag after a brief delay to allow error events to process
        setTimeout(() => {
            isIntentionalStop = false;
        }, 100);
    }
	
    // Play/pause toggle
    function togglePlayPause() {
        if (!currentPlayer || currentTrackIndex < 0) return;
		
        if (isPlaying) {
            currentPlayer.pause();
            isPlaying = false;
            playPauseBtn.textContent = '▶';
        } else {
            currentPlayer.play()
                .then(() => {
                    isPlaying = true;
                    playPauseBtn.textContent = '⏸';
                })
                .catch(error => {
                    showStatus(`Playback error: ${error.message}`, true);
                });
        }
    }
	
    // Play previous track
    function playPrevious() {
        if (playlist.length === 0) return;
		
        let prevIndex = currentTrackIndex - 1;
		
        if (isShuffleEnabled && shuffleState.value) {
            // In shuffle mode, pick a random track (not the current one)
            const availableIndices = Array.from(
                { length: playlist.length }, 
                (_, i) => i
            ).filter(i => i !== currentTrackIndex);
			
            if (availableIndices.length > 0) {
                const randomIndex = Math.floor(Math.random() * availableIndices.length);
                prevIndex = availableIndices[randomIndex];
            } else {
                // If there's only one track, just replay it
                prevIndex = currentTrackIndex;
            }
        } else {
            // Regular sequential play
            if (prevIndex < 0) prevIndex = playlist.length - 1;
        }
		
        playTrack(prevIndex);
    }
	
    // Helper function to maintain play history
    function updatePlayHistory(index) {
        if (index < 0 || index >= playlist.length) return;
	
        // Remove this index if it's already in history to avoid duplicates
        const existingIndex = playHistory.indexOf(index);
        if (existingIndex !== -1) {
            playHistory.splice(existingIndex, 1);
        }
		
        // Add to beginning of history
        playHistory.unshift(index);
		
        // Keep history at maximum size
        if (playHistory.length > HISTORY_MAX_SIZE) {
            playHistory.pop();
        }
    }

    // Helper function to assign weights based on recency
    function _assignWeights(indices) {
        // Default weight for tracks
        const baseWeight = 1.0;
		
        // Create weight array initialized with base weights
        const weights = indices.map(() => baseWeight);
		
        // Reduce weight for recently played tracks
        for (let i = 0; i < indices.length; i++) {
            const trackIndex = indices[i];
			
            // Check if this track exists in history and how recently
            const historyIndex = playHistory.indexOf(trackIndex);
			
            if (historyIndex !== -1) {
                // Reduce weight more for more recently played tracks
                // The most recent track (index 0) gets lowest weight
                const recentlyPlayedPenalty = 0.8 * (HISTORY_MAX_SIZE - historyIndex) / HISTORY_MAX_SIZE;
                weights[i] *= (1 - recentlyPlayedPenalty);
            }
        }
		
        return weights;
    }

    // Clear current playlist
    function clearPlaylist() {
        if (playlist.length === 0) {
            showStatus('Playlist is already empty', true);
            return;
        }
		
        // Confirm clearing
        if (!confirm('Are you sure you want to clear the entire playlist? This cannot be undone.')) {
            return;
        }
		
        // Stop current playback
        stopPlayback();
		
        // Clear playlist array
        playlist.length = 0;
        currentTrackIndex = -1;
		
        // Clear play history
        playHistory.length = 0;
		
        // Reset shuffle state
        if (isShuffleEnabled) {
            toggleShuffle(); // This will disable shuffle and restore original state
        }
		
        // Clear original playlist if exists
        originalPlaylist.length = 0;
		
        // Update UI
        renderPlaylist();
        updateTrackCounter();
        nowPlayingContainer.classList.add('hide');
		
        // Clear playlist name using module
        playlistManager.clearPlaylistName();
		
        showStatus('Playlist cleared successfully');
    }

    // Helper function to select an item based on weights
    function weightedRandomSelection(items, weights) {
        // Calculate sum of all weights
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
		
        // Get a random value between 0 and the sum of weights
        const randomValue = Math.random() * totalWeight;
        let weightSum = 0;
		
        // Find the item that corresponds to this random value
        for (let i = 0; i < items.length; i++) {
            weightSum += weights[i];
            if (randomValue <= weightSum) {
                return items[i];
            }
        }
		
        // Fallback (should rarely happen)
        return items[Math.floor(Math.random() * items.length)];
    }

    // Play next track
    async function playNext() {
        if (playlist.length === 0) return;
		
        let nextIndex = currentTrackIndex + 1;
        // Check the synchronized shuffle state
        if (isShuffleEnabled && shuffleState.value) {
            if (playlist.length > 1) {
                // Get all indices except current track
                const availableIndices = Array.from(
                    { length: playlist.length }, 
                    (_, i) => i
                ).filter(i => i !== currentTrackIndex);
					
                if (availableIndices.length > 0) {
                    // Use the new shuffle manager for intelligent selection
                    nextIndex = await shuffleManager.selectNextTrack(availableIndices, playlist);
                } else {
                    // If no other tracks (unlikely), just replay current
                    nextIndex = currentTrackIndex;
                }
            } else {
                // Only one track in playlist
                nextIndex = currentTrackIndex;
            }
        } else {
            // Regular sequential play
            if (nextIndex >= playlist.length) nextIndex = 0;
        }
		
        playTrack(nextIndex);
    }
	
    // Update progress bar
    function updateProgress() {
        if (!currentPlayer || !currentPlayer.duration || isNaN(currentPlayer.duration)) {
            progressBar.style.width = '0%';
            return;
        }
		
        const percent = (currentPlayer.currentTime / currentPlayer.duration) * 100;
        progressBar.style.width = `${percent}%`;
		
        currentTime.textContent = formatTime(currentPlayer.currentTime);
        duration.textContent = formatTime(currentPlayer.duration);
		
        // Store duration in track object for display
        if (currentTrackIndex >= 0 && !playlist[currentTrackIndex].duration && currentPlayer.duration) {
            playlist[currentTrackIndex].duration = currentPlayer.duration;
            renderPlaylist();
        }
    }
	
    // Seek in track
    function seek(e) {
        if (!currentPlayer || !currentPlayer.duration) return;
		
        const rect = progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        currentPlayer.currentTime = pos * currentPlayer.duration;
    }
	
    // Volume control
    function updateVolume() {
        // Update mute button icon
        if (volumeSlider.value == 0) {
            muteBtn.textContent = '🔇';
        } else if (volumeSlider.value < 50) {
            muteBtn.textContent = '🔉';
        } else {
            muteBtn.textContent = '🔊';
        }
		
        if (volumeSlider.value > 0) {
            previousVolume = volumeSlider.value;
        }

        // Always apply basic volume first
        if (currentPlayer) {
            currentPlayer.volume = volumeSlider.value / 100;
        }

        // Then let volume multiplier override if available and working
        if (window.volumeMultiplierManager && window.volumeMultiplierManager.isInitialized) {
            window.volumeMultiplierManager.onVolumeChange();
        }
    }
	
    function toggleMute() {
        if (volumeSlider.value > 0) {
            // Currently not muted - mute it
            previousVolume = volumeSlider.value;
            volumeSlider.value = 0;
        } else {
            // Currently muted - unmute it
            volumeSlider.value = previousVolume || 100;
        }
        updateVolume();
    }
	
    // Add cleanup on page unload (replace the existing beforeunload handler):
    window.addEventListener('beforeunload', () => {
        // Cleanup drag and drop
        DragDrop.destroy();
		
        // Cleanup digital rain
        digitalRainManager.destroy();
		
        // Cleanup playlist manager
        playlistManager.destroy();
		
        // Cleanup mobile features if they exist
        if (window.mobileFeatures && window.mobileFeatures.destroy) {
            window.mobileFeatures.destroy();
        }
    });

    // Setup drag and drop functionality for adding files
    function setupDragAndDrop() {
        // Prevent default behavior to allow drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });
		
        // Highlight drop zone when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, highlight, false);
        });
		
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, unhighlight, false);
        });
		
        // Handle dropped files/links
        dropZone.addEventListener('drop', handleDrop, false);
		
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
		
        function highlight() {
            dropZone.classList.add('drag-over');
            dropIndicator.textContent = 'Drop to Add';
            dropIndicator.classList.add('warning');
        }
		
        function unhighlight() {
            dropZone.classList.remove('drag-over');
            dropIndicator.textContent = 'Ready';
            dropIndicator.classList.remove('warning');
        }
		
        function handleDrop(e) {
            const dt = e.dataTransfer;
			
            // Check for text data (links)
            if (dt.types.includes('text/plain') || dt.types.includes('text/uri-list')) {
                const text = dt.getData('text/plain') || dt.getData('text/uri-list');
                const urls = text.split('\n').map(url => url.trim()).filter(url => url);
				
                // Process each URL asynchronously
                const processUrls = async () => {
                    let totalAdded = 0;
					
                    for (const url of urls) {
                        const result = await addTrack(url);
                        if (typeof result === 'number') {
                            totalAdded += result; // Directory added multiple tracks
                        } else if (result) {
                            totalAdded += 1; // Single track added
                        }
                    }
					
                    if (totalAdded > 0) {
                        showStatus(`Added ${totalAdded} track${totalAdded !== 1 ? 's' : ''} via drag & drop`);
                    } else {
                        showStatus('No valid media URLs found in the dropped content', true);
                    }
                };
				
                processUrls().catch(error => {
                    console.error('Error processing dropped URLs:', error);
                    showStatus('Error processing dropped content', true);
                });
            }
        }
    }
	
    // Event Listeners
    addBtn.addEventListener('click', () => {
        addTrack(urlInput.value.trim());
    });
	
    clearBtn.addEventListener('click', clearPlaylist);

    urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            addTrack(urlInput.value.trim());
        }
    });

    // Add keyboard shortcut handler to your existing event listeners
    document.addEventListener('keydown', (e) => {
        // Handle settings keyboard shortcuts
        if (settingsIntegration.handleKeyboardShortcuts(e)) {
            return; // Settings handled the shortcut
        }
    });
    // Handle paste event on the entire document (for drag and drop-like functionality)
    document.addEventListener('paste', (e) => {
        // Only process if our input is not focused (otherwise let the normal paste happen)
        if (document.activeElement !== urlInput) {
            const pastedText = e.clipboardData.getData('text/plain');
            if (pastedText) {
                addTrack(pastedText);
            }
        }
    });
	
    playPauseBtn.addEventListener('click', togglePlayPause);
    prevBtn.addEventListener('click', playPrevious);
    nextBtn.addEventListener('click', playNext);
    progressContainer.addEventListener('click', seek);
	
    // Media player event listeners for progress updates
    audioPlayer.addEventListener('timeupdate', updateProgress);
    videoPlayer.addEventListener('timeupdate', updateProgress);
	
    audioPlayer.addEventListener('loadedmetadata', () => {
        if (currentTrackIndex >= 0 && playlist[currentTrackIndex] && 
			!playlist[currentTrackIndex].duration && 
			audioPlayer.duration && 
			audioPlayer.duration !== Infinity) {
            playlist[currentTrackIndex].duration = audioPlayer.duration;
            renderPlaylist();
        }
        updateProgress();
    });
	
    videoPlayer.addEventListener('loadedmetadata', () => {
        if (currentTrackIndex >= 0 && playlist[currentTrackIndex] && 
			!playlist[currentTrackIndex].duration && 
			videoPlayer.duration && 
			videoPlayer.duration !== Infinity) {
            playlist[currentTrackIndex].duration = videoPlayer.duration;
            renderPlaylist();
        }
        updateProgress();
    });
	
    // End of track - play next track
    audioPlayer.addEventListener('ended', playNext);
    videoPlayer.addEventListener('ended', playNext);
	
    // Volume controls
    volumeSlider.addEventListener('input', updateVolume);
    muteBtn.addEventListener('click', toggleMute);
	
    // Check for media errors
    audioPlayer.addEventListener('error', () => {
        if (audioPlayer.error && !isIntentionalStop) {
            showStatus(`Audio error: ${audioPlayer.error.message || 'Unknown error'}`, true);
        }
    });
	
    videoPlayer.addEventListener('error', () => {
        if (videoPlayer.error && !isIntentionalStop) {
            showStatus(`Video error: ${videoPlayer.error.message || 'Unknown error'}`, true);
        }
    });
	
    DragDrop.init({
        onReorder: (sourceIndex, targetIndex) => {
            // Update playlist array
            const itemToMove = playlist.splice(sourceIndex, 1)[0];
            playlist.splice(targetIndex, 0, itemToMove);
			
            // Update currentTrackIndex if needed
            if (currentTrackIndex === sourceIndex) {
                currentTrackIndex = targetIndex;
            } else if (currentTrackIndex > sourceIndex && currentTrackIndex <= targetIndex) {
                currentTrackIndex--;
            } else if (currentTrackIndex < sourceIndex && currentTrackIndex >= targetIndex) {
                currentTrackIndex++;
            }
			
            // Re-render playlist
            renderPlaylist();
            showStatus(`Reordered: ${itemToMove.name}`);
        },
        playlistSelector: '#playlistItems',
        itemSelector: '.playlist-item',
        handleSelector: '.btn-move-item'
    });
	
    // Add shuffle button event listener
    shuffleBtn.addEventListener('click', toggleShuffle);
});
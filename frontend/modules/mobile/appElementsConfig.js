// Create this file as frontend/modules/mobile/appElementsConfig.js

/**
 * Configuration for app elements needed by mobile modules
 * Each element is mapped by its ID or usage type
 */
export const APP_ELEMENTS_CONFIG = {
    // DOM element IDs that need to be retrieved
    domElements: {
        urlInput: 'urlInput',
        playlistItems: 'playlistItems',
        nowPlayingContainer: 'nowPlayingContainer',
        audioPlayer: 'audioPlayer',
        videoPlayer: 'videoPlayer',
        videoContainer: 'videoContainer',
        playPauseBtn: 'playPauseBtn',
        prevBtn: 'prevBtn',
        nextBtn: 'nextBtn',
        progressBar: 'progressBar',
        progressContainer: 'progressContainer',
        currentTime: 'currentTime',
        duration: 'duration',
        nowPlayingName: 'nowPlayingName',
        playlistNameInput: 'playlistNameInput',
        volumeSlider: 'volumeSlider',
        muteBtn: 'muteBtn',
        shuffleBtn: 'shuffleBtn',
        playerStatusIndicator: 'playerStatusIndicator'
    },
	
    // Function names that need to be extracted from the app scope
    functions: [
        'playTrack',
        'playNext',
        'playPrevious',
        'togglePlayPause',
        'stopPlayback',
        'addTrack',
        'removeTrack',
        'renderPlaylist',
        'updateTrackCounter',
        'updateVolume'
    ],
	
    // Variable names that need to be accessed from the app scope
    variables: [
        'playlist',
        'currentTrackIndex',
        'isPlaying',
        'currentPlayer',
        'originalPlaylist',
        'playHistory'
    ],
	
    // Reactive objects that need special handling
    reactiveObjects: [
        'shuffleState'
    ]
};
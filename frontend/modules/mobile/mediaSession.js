import debug from '../debugLogger/debugLogger.js';

export class MediaSessionManager {
    constructor() {
        this.isSupported = 'mediaSession' in navigator;
        this.currentMetadata = null;
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Initialize media session with app elements
    init(appElements) {
        if (!this.isSupported) {
            console.log('Media Session API not supported');
            return;
        }

        this.appElements = appElements;
        this.setupActionHandlers();
        this.setupEventListeners();
    }

    // Set up media session action handlers
    setupActionHandlers() {
        const {
            togglePlayPause,
            playNext,
            playPrevious,
            stopPlayback
        } = this.appElements;


        if (this.isMobile) {
            // Mobile: Use state-aware handlers
            navigator.mediaSession.setActionHandler('play', () => {
                if (togglePlayPause && !this.appElements.isPlaying) {
                    togglePlayPause();
                }
            });

            navigator.mediaSession.setActionHandler('pause', () => {
                if (togglePlayPause && this.appElements.isPlaying) {
                    togglePlayPause();
                }
            });

            // Set seek handlers to forward to next/previous track on mobile
            navigator.mediaSession.setActionHandler('seekbackward', () => {
                if (playPrevious) playPrevious();
            });
            navigator.mediaSession.setActionHandler('seekforward', () => {
                if (playNext) playNext();
            });
        } else {
            // Desktop: Use toggle for both (existing working behavior)
            navigator.mediaSession.setActionHandler('play', () => {
                if (togglePlayPause) togglePlayPause();
            });

            navigator.mediaSession.setActionHandler('pause', () => {
                if (togglePlayPause) togglePlayPause();
            });
        }

        navigator.mediaSession.setActionHandler('nexttrack', () => {
            if (playNext) playNext();
        });

        navigator.mediaSession.setActionHandler('previoustrack', () => {
            if (playPrevious) playPrevious();
        });

        navigator.mediaSession.setActionHandler('stop', () => {
            if (stopPlayback) stopPlayback();
        });
    }

    // Set up event listeners for media session updates
    setupEventListeners() {
        const { audioPlayer, videoPlayer } = this.appElements;

        // Update position state during playback
        const updatePositionState = () => {
            if (this.appElements.currentPlayer && 'setPositionState' in navigator.mediaSession) {
                navigator.mediaSession.setPositionState({
                    duration: this.appElements.currentPlayer.duration || 0,
                    playbackRate: this.appElements.currentPlayer.playbackRate || 1,
                    position: this.appElements.currentPlayer.currentTime || 0
                });
            }
        };

        // Update position state
        if (audioPlayer) {
            audioPlayer.addEventListener('timeupdate', updatePositionState);
        }
        if (videoPlayer) {
            videoPlayer.addEventListener('timeupdate', updatePositionState);
        }

        // Update playback state
        if (audioPlayer) {
            audioPlayer.addEventListener('play', () => {
                navigator.mediaSession.playbackState = 'playing';
            });
            audioPlayer.addEventListener('pause', () => {
                navigator.mediaSession.playbackState = 'paused';
            });
        }

        if (videoPlayer) {
            videoPlayer.addEventListener('play', () => {
                navigator.mediaSession.playbackState = 'playing';
            });
            videoPlayer.addEventListener('pause', () => {
                navigator.mediaSession.playbackState = 'paused';
            });
        }
    }

    // Update media session metadata for current track
    updateMetadata(track, playlistName) {
        if (!this.isSupported || !track) return;

        const metadata = new MediaMetadata({
            title: track.name || 'Unknown Track',
            artist: 'NeoSynth Player',
            album: playlistName || 'My Playlist',
            artwork: [
                { src: '/favicon.png', sizes: '16x16', type: 'image/png' },
                { src: '/favicon.png', sizes: '32x32', type: 'image/png' }
            ]
        });

        navigator.mediaSession.metadata = metadata;
        this.currentMetadata = metadata;
        
        
        // Mobile-specific: Re-establish handlers to prevent grayed out buttons
        if (this.isMobile) {
            const { playNext, playPrevious } = this.appElements;
            
            navigator.mediaSession.setActionHandler('nexttrack', () => {
                if (playNext) playNext();
            });

            navigator.mediaSession.setActionHandler('previoustrack', () => {
                if (playPrevious) playPrevious();
            });
        }
    }

    // Clear media session metadata
    clearMetadata() {
        if (!this.isSupported) return;
        navigator.mediaSession.metadata = null;
        this.currentMetadata = null;
    }
}
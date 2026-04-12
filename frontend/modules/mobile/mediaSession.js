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
    // Uses live this.appElements references so that any function wrapping applied
    // by mobileOptimizations after init is automatically picked up.
    setupActionHandlers() {
        if (this.isMobile) {
            // Mobile: state-aware handlers prevent double-toggle on iOS
            navigator.mediaSession.setActionHandler('play', () => {
                if (this.appElements.togglePlayPause && !this.appElements.isPlaying) {
                    this.appElements.togglePlayPause();
                }
            });

            navigator.mediaSession.setActionHandler('pause', () => {
                if (this.appElements.togglePlayPause && this.appElements.isPlaying) {
                    this.appElements.togglePlayPause();
                }
            });

            // Unregister seek handlers so iOS shows nexttrack/previoustrack instead.
            // iOS will hide next/prev when seek handlers are registered — choose one or the other.
            // To switch to +/-10s seek buttons replace these with:
            //   ('seekbackward', (d) => { const s = d.seekOffset || 10; if (this.appElements.currentPlayer) this.appElements.currentPlayer.currentTime = Math.max(0, this.appElements.currentPlayer.currentTime - s); });
            //   ('seekforward',  (d) => { const s = d.seekOffset || 10; if (this.appElements.currentPlayer) this.appElements.currentPlayer.currentTime = Math.min(this.appElements.currentPlayer.duration || 0, this.appElements.currentPlayer.currentTime + s); });
            navigator.mediaSession.setActionHandler('seekbackward', null);
            navigator.mediaSession.setActionHandler('seekforward', null);
        } else {
            // Desktop: toggle for both (existing working behavior)
            navigator.mediaSession.setActionHandler('play', () => {
                if (this.appElements.togglePlayPause) this.appElements.togglePlayPause();
            });

            navigator.mediaSession.setActionHandler('pause', () => {
                if (this.appElements.togglePlayPause) this.appElements.togglePlayPause();
            });
        }

        navigator.mediaSession.setActionHandler('nexttrack', () => {
            if (this.appElements.playNext) this.appElements.playNext();
        });

        navigator.mediaSession.setActionHandler('previoustrack', () => {
            if (this.appElements.playPrevious) this.appElements.playPrevious();
        });

        navigator.mediaSession.setActionHandler('stop', () => {
            if (this.appElements.stopPlayback) this.appElements.stopPlayback();
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

        // Update position state (desktop only — on mobile, setPositionState causes iOS to
        // render seek controls on the first lock screen notification instead of prev/next)
        if (!this.isMobile) {
            if (audioPlayer) {
                audioPlayer.addEventListener('timeupdate', updatePositionState);
            }
            if (videoPlayer) {
                videoPlayer.addEventListener('timeupdate', updatePositionState);
            }
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

        // Re-establish all handlers on every metadata update — iOS can silently
        // drop registered handlers when metadata changes, causing the lock screen
        // controls to route to another app (e.g. Apple Music) instead.
        // Must happen BEFORE setting metadata so the OS sees the correct handlers
        // when it first renders the lock screen notification.
        if (this.isMobile) {
            this.setupActionHandlers();
        }

        navigator.mediaSession.metadata = metadata;
        this.currentMetadata = metadata;
    }

    // Clear media session metadata
    clearMetadata() {
        if (!this.isSupported) return;
        navigator.mediaSession.metadata = null;
        this.currentMetadata = null;
    }
}
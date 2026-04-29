// @feature-flag: client_error_logging
// @description: Send client-side audio lifecycle events to the backend for debugging
// @category: developer

class ClientLogger {
    constructor() {
        this.appElements = null;
        this.endpoint = '/api/client-log';
        // Lifecycle listeners run on all platforms at module load time
        this._setupLifecycleListeners();
    }

    // Wire in playback context — called from AudioInterruptionManager.init() on mobile,
    // giving richer log output (track, position, isPlaying) when available
    init(appElements) {
        this.appElements = appElements;
    }

    isEnabled() {
        try {
            return window.featureManager?.isEnabled('client_error_logging') ?? false;
        } catch {
            return false;
        }
    }

    _getContext() {
        const ua = navigator.userAgent;
        const isIOS = /iPhone|iPad|iPod/.test(ua);
        const isPWA = navigator.standalone === true;

        let iosVersion = null;
        if (isIOS) {
            const match = ua.match(/OS (\d+)[._](\d+)/);
            if (match) iosVersion = `${match[1]}.${match[2]}`;
        }

        const ctx = {
            timestamp: new Date().toISOString(),
            platform: { userAgent: ua, isIOS, isPWA, iosVersion }
        };

        if (this.appElements) {
            const player = this.appElements.currentPlayer;
            ctx.playback = {
                isPlaying: this.appElements.isPlaying ?? false,
                currentTime: player?.currentTime ?? null,
                duration: player?.duration ?? null,
                // Only send filename, not full URL
                track: player?.src ? decodeURIComponent(player.src.split('/').pop().split('?')[0]) : null
            };
        }

        return ctx;
    }

    send(event, extra = {}) {
        if (!this.isEnabled()) return;

        const payload = { event, ...this._getContext(), ...extra };
        const data = JSON.stringify(payload);

        // sendBeacon is preferred — survives page teardown (iOS suspension, tab kill)
        if (navigator.sendBeacon) {
            const blob = new Blob([data], { type: 'application/json' });
            navigator.sendBeacon(this.endpoint, blob);
        } else {
            fetch(this.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: data,
                keepalive: true
            }).catch(() => {});
        }
    }

    _setupLifecycleListeners() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.send('visibility_hidden');
            } else {
                this.send('visibility_visible');
            }
        });

        // Page Lifecycle API — fires just before the browser freezes/suspends the page (iOS PWA)
        window.addEventListener('freeze', () => {
            this.send('page_freeze');
        });

        // pagehide is more reliable than beforeunload on mobile Safari
        window.addEventListener('pagehide', (e) => {
            this.send('page_hide', { persisted: e.persisted });
        });
    }

    logAudioInterruption(source) {
        this.send('audio_interrupted', { source });
    }

    logAudioContextChange(state) {
        this.send('audio_context_state_change', { audioContextState: state });
    }

    logPlaybackError(mediaError, failedSrc = null) {
        const ERROR_NAMES = {
            1: 'MEDIA_ERR_ABORTED',
            2: 'MEDIA_ERR_NETWORK',
            3: 'MEDIA_ERR_DECODE',
            4: 'MEDIA_ERR_SRC_NOT_SUPPORTED'
        };
        // Strip origin so we log the path only (e.g. /api/tracks/stream/artist/song.mp3)
        let failedUrl = null;
        if (failedSrc) {
            try {
                const url = new URL(failedSrc);
                failedUrl = decodeURIComponent(url.pathname + url.search);
            } catch {
                failedUrl = failedSrc;
            }
        }
        this.send('playback_error', {
            errCode: mediaError?.code ?? null,
            errName: ERROR_NAMES[mediaError?.code] ?? 'UNKNOWN',
            errMessage: mediaError?.message ?? null,
            failedUrl
        });
    }
}

const clientLogger = new ClientLogger();

if (typeof window !== 'undefined') {
    window.clientLogger = clientLogger;
}

export default clientLogger;

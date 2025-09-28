import { StatePersistence } from './statePersistence.js';
import { MediaSessionManager } from './mediaSession.js';
import { MobileOptimizations } from './mobileOptimizations.js';
import { createAppElements, createAppScopeProxy } from './appElementsFactory.js';

/**
 * Initialize all mobile-related features with a simplified API
 * @param {Object} appScope - Object containing all app variables and functions
 * @param {Function} showStatus - Function to show status messages
 */
export async function initMobile(appScope, showStatus) {
    console.log('Initializing mobile features...');
	
    // Create appElements using the factory
    const appElements = createAppElements(appScope);
	
    // Add showStatus to appElements for mobile optimizations
    appElements.showStatus = showStatus;
	
    // Create instances
    const statePersistence = new StatePersistence();
    const mediaSession = new MediaSessionManager();
    const mobileOptimizations = new MobileOptimizations();
	
    // Mobile playlist restore feature removed - resume button handles this now
    // State restoration callback disabled
	
    // Initialize components
    await Promise.all([
        statePersistence.init(appElements),
        mediaSession.init(appElements),
        mobileOptimizations.init(appElements, statePersistence)
    ]);
	
    // Return object with methods that can be called from main app
    return {
        statePersistence,
        mediaSession,
        mobileOptimizations,
        audioInterruption: mobileOptimizations.audioInterruption,
		
        // Methods to be called from main app
        onTrackChange: (track, playlistName) => {
            statePersistence.onTrackChange();
            mediaSession.updateMetadata(track, playlistName);
        },
		
        onPlaylistChange: () => {
            statePersistence.onPlaylistChange();
        },
		
        onPlaybackStop: () => {
            mediaSession.clearMetadata();
        },
		
        // Method to check audio interruption status
        isAudioInterrupted: () => {
            return mobileOptimizations.audioInterruption.isInterrupted;
        }
    };
}

// Mobile playlist restore feature removed - resume button handles this now
// restoreAppState function disabled
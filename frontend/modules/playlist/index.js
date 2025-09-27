// frontend/modules/playlist/index.js

/**
 * Playlist Module - Main Export
 * Handles playlist management functionality
 */

export { PlaylistManager } from './playlistManager.js';

// Future playlist-related modules can be added here:
// export { PlaylistImporter } from './playlistImporter.js';
// export { PlaylistExporter } from './playlistExporter.js';
// export { PlaylistAnalyzer } from './playlistAnalyzer.js';

// Re-export for easy access
import { PlaylistManager } from './playlistManager.js';
export default PlaylistManager;
// frontend/modules/volumeMultiplier/index.js

/**
 * @feature-flag: volume_multiplier
 * @description: Per-track volume multiplier controls for audio normalization
 * @category: ui
 */

import { VolumeMultiplierManager } from './volumeMultiplierManager.js';

// Export the volume multiplier manager
export { VolumeMultiplierManager };

// Create a default instance for easy import
export const volumeMultiplierManager = new VolumeMultiplierManager();

// Note: Initialization is handled by app.js with proper app elements
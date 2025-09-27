// frontend/modules/effects/index.js

/**
 * Effects Module - Main Export
 * Manages visual effects for NeoSynth
 */

export { DigitalRainManager, digitalRainManager } from './digitalRain.js';

// Future effects can be added here:
// export { ParticleSystem } from './particles.js';
// export { GlitchEffect } from './glitch.js';
// export { AudioVisualizer } from './audioVisualizer.js';

// Re-export the singleton for easy access
import digitalRainManager from './digitalRain.js';
export default {
    digitalRain: digitalRainManager
};
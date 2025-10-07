const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Generate MD5 hash of a file for cache busting
 * @param {string} filePath - Absolute path to the file
 * @returns {string} - 8-character hash or 'dev' if file doesn't exist
 */
function generateFileHash(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            console.warn(`[WARN] Asset file not found: ${filePath}`);
            return 'dev';
        }

        const fileBuffer = fs.readFileSync(filePath);
        const hashSum = crypto.createHash('md5');
        hashSum.update(fileBuffer);

        // Return first 8 chars of hash for brevity
        return hashSum.digest('hex').substring(0, 8);
    } catch (error) {
        console.error(`[ERROR] Failed to generate hash for ${filePath}:`, error.message);
        return 'dev';
    }
}

/**
 * Generate composite hash from multiple files
 * @param {string[]} filePaths - Array of absolute file paths
 * @returns {string} - 8-character composite hash
 */
function generateCompositeHash(filePaths) {
    try {
        const hashSum = crypto.createHash('md5');

        for (const filePath of filePaths) {
            if (fs.existsSync(filePath)) {
                const fileBuffer = fs.readFileSync(filePath);
                hashSum.update(fileBuffer);
            } else {
                console.warn(`[WARN] Composite hash: file not found: ${filePath}`);
            }
        }

        return hashSum.digest('hex').substring(0, 8);
    } catch (error) {
        console.error(`[ERROR] Failed to generate composite hash:`, error.message);
        return 'dev';
    }
}

/**
 * Generate hashes for all main static assets
 * @param {string} frontendPath - Path to frontend directory
 * @returns {Object} - Object with asset hashes
 */
function generateAssetHashes(frontendPath) {
    // All CSS files that are imported by main.css (order matters for consistency)
    const allCssFiles = [
        path.join(frontendPath, 'styles/main.css'),
        path.join(frontendPath, 'cssCustom/themes.css'),
        path.join(frontendPath, 'cssCustom/themes/root.css'),
        path.join(frontendPath, 'cssCustom/themes/components.css'),
        path.join(frontendPath, 'cssCustom/themes/misc.css'),
        path.join(frontendPath, 'cssCustom/themes/mobile.css'),
        path.join(frontendPath, 'cssCustom/themes/laser.css'),
        path.join(frontendPath, 'cssCustom/themes/mint.css'),
        path.join(frontendPath, 'cssCustom/themes/noir.css'),
        path.join(frontendPath, 'cssCustom/themes/vapor.css'),
        path.join(frontendPath, 'cssCustom/themes/experimental-cyber-glass.css'),
        path.join(frontendPath, 'cssCustom/themes/experimental-hologram.css'),
        path.join(frontendPath, 'cssCustom/themes/experimental-matrix.css'),
        path.join(frontendPath, 'cssCustom/themes/experimental-toxic.css'),
        path.join(frontendPath, 'cssCustom/advancedControls.css'),
        path.join(frontendPath, 'cssCustom/animations.css'),
        path.join(frontendPath, 'cssCustom/borders.css'),
        path.join(frontendPath, 'cssCustom/footer.css'),
        path.join(frontendPath, 'cssCustom/header.css'),
        path.join(frontendPath, 'cssCustom/player.css'),
        path.join(frontendPath, 'cssCustom/playlist.css'),
        path.join(frontendPath, 'cssCustom/reOrder.css'),
        path.join(frontendPath, 'cssCustom/scrollbar.css'),
        path.join(frontendPath, 'cssCustom/settings.css'),
        path.join(frontendPath, 'cssCustom/terminal.css'),
        path.join(frontendPath, 'cssCustom/session.css'),
        path.join(frontendPath, 'cssCustom/resume.css'),
        path.join(frontendPath, 'modules/themes/themeSelector.css'),
        path.join(frontendPath, 'cssCustom/passwordTerminal.css')
    ];

    const hashes = {
        mainCss: generateCompositeHash(allCssFiles),
        appJs: generateFileHash(path.join(frontendPath, 'app.js'))
    };

    return hashes;
}

module.exports = {
    generateFileHash,
    generateCompositeHash,
    generateAssetHashes
};

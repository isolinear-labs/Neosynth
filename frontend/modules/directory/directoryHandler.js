/**
 * Directory handling module for NeoSynth
 * Supports adding multiple media files from directories
 */

import debug from '../debugLogger/debugLogger.js';

/**
 * Check if a filename is a media file based on extension
 * @param {string} filename - The filename to check
 * @returns {boolean} - True if it's a media file
 */
function isMediaFile(filename) {
    const mediaExtensions = [
        '.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', // Audio
        '.mp4', '.webm', '.mkv', '.avi', '.mov', '.m4v', // Video
        '.opus', '.wma', '.3gp', '.wmv', '.ogv'          // Additional formats
    ];
	
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return mediaExtensions.includes(ext);
}

/**
 * Detect if a URL might be a directory
 * @param {string} url - The URL to check
 * @returns {boolean} - True if it looks like a directory URL
 */
export function isDirectoryUrl(url) {
    try {
        const urlObj = new URL(url);
		
        // Check for common directory URL patterns
        if (urlObj.pathname.endsWith('/')) return true;
		
        // GitHub directory patterns
        if (urlObj.hostname.includes('github.com') && urlObj.pathname.includes('/tree/')) return true;
		
        // Google Drive folder patterns
        if (urlObj.hostname.includes('drive.google.com') && urlObj.pathname.includes('/folders/')) return true;
		
        // OneDrive folder patterns
        if (urlObj.hostname.includes('1drv.ms') || 
			(urlObj.hostname.includes('sharepoint.com') && urlObj.pathname.includes('/_layouts/15/onedrive.aspx'))) return true;
		
        // Dropbox folder patterns
        if (urlObj.hostname.includes('dropbox.com') && urlObj.pathname.includes('/s/')) return true;
		
        // File server patterns (common directory listing indicators)
        if (urlObj.searchParams.has('C') || // Common file server param
			urlObj.searchParams.has('D') ||
			urlObj.pathname.includes('/files/') ||
			urlObj.pathname.includes('/media/') ||
			urlObj.pathname.includes('/public/')) return true;
		
        // Check if URL doesn't have a file extension (could be a directory)
        const pathParts = urlObj.pathname.split('/');
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart && !lastPart.includes('.')) {
            return true;
        }

        return false;
    } catch {
        return false;
    }
}

/**
 * Handle GitHub directories by using the GitHub API
 * @param {string} githubUrl - GitHub tree URL
 * @returns {Promise<string[]>} - Array of media file URLs
 */
async function handleGitHubDirectory(githubUrl) {
    try {
        // Convert GitHub tree URL to API URL
        // Example: https://github.com/user/repo/tree/main/folder -> https://api.github.com/repos/user/repo/contents/folder
        const apiUrl = githubUrl
            .replace('github.com', 'api.github.com/repos')
            .replace('/tree/main/', '/contents/')
            .replace('/tree/master/', '/contents/')
            .replace(/\/tree\/[^\/]+\//, '/contents/')
            .replace(/\?.*$/, ''); // Remove query params
		
        console.log('Fetching GitHub directory:', apiUrl);
		
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }
		
        const contents = await response.json();
        const mediaUrls = [];
		
        // Process each item in the directory
        for (const item of contents) {
            if (item.type === 'file' && isMediaFile(item.name)) {
                mediaUrls.push(item.download_url);
            }
        }
		
        return mediaUrls;
    } catch (error) {
        console.error('GitHub directory error:', error);
        throw new Error(`Unable to scan GitHub directory: ${error.message}`);
    }
}

/**
 * Handle Google Drive folder (requires public sharing)
 * @param {string} _driveUrl - Google Drive folder URL
 * @returns {Promise<string[]>} - Array of media file URLs
 */
async function handleGoogleDriveDirectory(_driveUrl) {
    // Note: This is a simplified implementation
    // Google Drive API access typically requires authentication
    throw new Error('Google Drive directory support requires API access. Please use individual file URLs.');
}

/**
 * Handle generic directories with HTML directory listing
 * @param {string} directoryUrl - Directory URL
 * @returns {Promise<string[]>} - Array of media file URLs
 */
async function handleGenericDirectory(directoryUrl) {
    try {
        // Ensure URL ends with /
        if (!directoryUrl.endsWith('/')) {
            directoryUrl += '/';
        }
		
        console.log('Fetching directory listing:', directoryUrl);
		
        const response = await fetch(directoryUrl, {
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml'
            }
        });
		
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
		
        const html = await response.text();
        const mediaUrls = [];
		
        // Parse HTML for links to media files
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const links = doc.querySelectorAll('a[href]');
		
        links.forEach(link => {
            const href = link.getAttribute('href');
			
            // Skip parent directory links and other non-file links
            if (!href || href === '../' || href === './' || href.startsWith('?')) {
                return;
            }
			
            if (isMediaFile(href)) {
                try {
                    // Resolve relative URLs
                    const absoluteUrl = new URL(href, directoryUrl).href;
                    mediaUrls.push(absoluteUrl);
                } catch (_urlError) {
                    console.warn('Invalid URL found:', href);
                }
            }
        });
		
        return mediaUrls;
    } catch (error) {
        console.error('Generic directory error:', error);
        throw new Error(`Unable to scan directory: ${error.message}`);
    }
}

/**
 * Main directory handling function
 * @param {string} directoryUrl - URL of the directory to scan
 * @param {function} showStatus - Function to show status messages
 * @returns {Promise<string[]>} - Array of media file URLs found
 */
export async function handleDirectoryUrl(directoryUrl, showStatus) {
    try {
        showStatus('Scanning directory for media files...', false);
		
        let mediaUrls = [];
		
        // Try different methods based on the URL type
        if (directoryUrl.includes('github.com') && directoryUrl.includes('/tree/')) {
            mediaUrls = await handleGitHubDirectory(directoryUrl);
        } else if (directoryUrl.includes('drive.google.com') && directoryUrl.includes('/folders/')) {
            mediaUrls = await handleGoogleDriveDirectory(directoryUrl);
        } else {
            // Try generic directory listing
            mediaUrls = await handleGenericDirectory(directoryUrl);
        }
		
        console.log(`Found ${mediaUrls.length} media files in directory`);
        return mediaUrls;
		
    } catch (error) {
        console.error('Error handling directory:', error);
		
        // Provide specific error messages for common issues
        if (error.message.includes('CORS') || error.name === 'TypeError') {
            throw new Error('Directory access blocked by CORS policy. Try copying individual file URLs instead.');
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
            throw new Error('Directory not found or not accessible. Make sure the URL is correct and publicly accessible.');
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
            throw new Error('Directory access forbidden. The directory may be private or require authentication.');
        } else {
            throw new Error(`Failed to scan directory: ${error.message}`);
        }
    }
}

/**
 * Process directory and add tracks to playlist
 * @param {string} directoryUrl - Directory URL to process
 * @param {function} addSingleTrack - Function to add a single track
 * @param {function} showStatus - Function to show status messages
 * @returns {Promise<number>} - Number of tracks added
 */
export async function processDirectoryAndAddTracks(directoryUrl, addSingleTrack, showStatus) {
    try {
        const mediaUrls = await handleDirectoryUrl(directoryUrl, showStatus);
		
        if (mediaUrls.length === 0) {
            showStatus('No media files found in directory', true);
            return 0;
        }
		
        showStatus(`Found ${mediaUrls.length} media files. Adding to playlist...`, false);
		
        // Add all found media files
        let addedCount = 0;
        const addPromises = mediaUrls.map(async (mediaUrl, index) => {
            try {
                // Add a small delay between requests to avoid overwhelming servers
                if (index > 0) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
				
                if (await addSingleTrack(mediaUrl)) {
                    addedCount++;
                    // Update progress
                    if (index % 5 === 0 || index === mediaUrls.length - 1) {
                        showStatus(`Adding tracks... (${addedCount}/${mediaUrls.length})`, false);
                    }
                }
            } catch (error) {
                console.warn(`Failed to add track ${mediaUrl}:`, error);
            }
        });
		
        await Promise.all(addPromises);
		
        showStatus(`Successfully added ${addedCount} tracks from directory`, false);
        return addedCount;
		
    } catch (error) {
        console.error('Error processing directory:', error);
        showStatus(error.message, true);
        return 0;
    }
}
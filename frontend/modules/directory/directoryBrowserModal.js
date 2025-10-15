/**
 * Enhanced directory browser modal for selecting files from directories
 */

import debug from '../debugLogger/debugLogger.js';
import { handleDirectoryUrl } from './directoryHandler.js';

/**
 * Directory Browser Modal Class
 */
class DirectoryBrowserModal {
    constructor() {
        this.modal = null;
        this.allFiles = [];
        this.filteredFiles = [];
        this.selectedFiles = new Set();
        this.currentDirectory = '';
        this.onAddCallback = null;
        this.keyHandler = null;
		
        this.init();
    }

    /**
	 * Initialize the modal and inject it into the DOM
	 */
    init() {
        // Inject CSS if not already present
        this.injectCSS();
		
        // Create modal HTML
        const modalHTML = `
			<div id="directoryBrowserModal" class="modal-overlay">
				<div class="directory-browser">
					<div class="modal-header">
						<h2 class="modal-title">// Directory Browser</h2>
						<div id="directoryPath" class="directory-path">Loading...</div>
					</div>

					<div class="modal-controls">
						<div class="search-container">
							<input 
								type="text" 
								id="fileSearchInput" 
								class="search-input" 
								placeholder="Search files by name..."
							>
						</div>

						<div class="filter-controls">
							<label class="filter-label">Type:</label>
							<select id="fileTypeFilter" class="filter-select">
								<option value="all">All Files</option>
								<option value="audio">Audio Only</option>
								<option value="video">Video Only</option>
							</select>
						</div>

						<div class="bulk-actions">
							<button id="selectAllBtn" class="bulk-btn">Select All</button>
							<button id="selectNoneBtn" class="bulk-btn">Select None</button>
						</div>
					</div>

					<div class="file-list-container">
						<div id="fileListContent">
							<div id="loadingState" class="loading-container">
								<div class="loading-spinner"></div>
								<div class="loading-text">Scanning directory for media files...</div>
							</div>

							<div id="emptyState" class="empty-state" style="display: none;">
								<div class="empty-icon">📁</div>
								<div class="empty-text">No media files found in this directory</div>
							</div>

							<div id="fileList" style="display: none;"></div>
						</div>
					</div>

					<div id="statusBar" class="status-bar" style="display: none;">
						<div>
							<span id="selectedCount" class="selected-count">0</span> 
							<span class="total-count">of <span id="totalCount">0</span> files selected</span>
						</div>
						<div id="filterStatus" class="total-count"></div>
					</div>

					<div class="modal-actions">
						<button id="cancelBtn" class="action-btn btn-cancel">Cancel</button>
						<button id="addSelectedBtn" class="action-btn btn-add" disabled>
							Add Selected Files
						</button>
					</div>
				</div>
			</div>
		`;

        // Create and inject modal
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer.firstElementChild);

        this.modal = document.getElementById('directoryBrowserModal');
    }

    /**
	 * Inject CSS styles for the modal
	 */
    injectCSS() {
        const cssId = 'directory-browser-styles';
        if (document.getElementById(cssId)) return;

        const css = `
			/* Directory Browser Modal Styles */
			.modal-overlay {
				position: fixed;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				background: rgba(13, 2, 33, 0.9);
				backdrop-filter: blur(10px);
				z-index: 2000;
				display: none;
				align-items: center;
				justify-content: center;
			}

			.modal-overlay.show {
				display: flex;
			}

			.directory-browser {
				background: rgba(13, 2, 33, 0.95);
				border: 2px solid var(--interactive-highlight);
				border-radius: 10px;
				width: 90vw;
				max-width: 900px;
				height: 80vh;
				box-shadow: 0 0 30px rgba(1, 255, 195, 0.5);
				display: flex;
				flex-direction: column;
				overflow: hidden;
				position: relative;
			}

			.directory-browser::before {
				content: '';
				position: absolute;
				top: -2px;
				left: -2px;
				right: -2px;
				bottom: -2px;
				background: linear-gradient(90deg, var(--primary-accent), var(--interactive-highlight), var(--tertiary-accent), var(--primary-accent));
				background-size: 400% 100%;
				border-radius: 10px;
				z-index: -1;
				animation: directoryBorderGlow 3s linear infinite;
			}

			@keyframes directoryBorderGlow {
				0% { background-position: 0% 50%; }
				50% { background-position: 100% 50%; }
				100% { background-position: 0% 50%; }
			}

			.modal-header {
				padding: 20px;
				border-bottom: 1px solid var(--interactive-highlight);
				background: rgba(8, 2, 21, 0.8);
			}

			.modal-title {
				font-size: 1.5rem;
				color: var(--interactive-highlight);
				text-shadow: 0 0 10px var(--interactive-highlight);
				text-transform: uppercase;
				margin: 0;
				font-family: 'Courier New', monospace;
			}

			.directory-path {
				color: var(--warning-accent);
				font-size: 0.9rem;
				margin-top: 5px;
				word-break: break-all;
				font-family: 'Courier New', monospace;
			}

			.modal-controls {
				padding: 15px 20px;
				background: rgba(8, 2, 21, 0.6);
				border-bottom: 1px solid rgba(5, 217, 232, 0.3);
				display: flex;
				flex-wrap: wrap;
				gap: 10px;
				align-items: center;
			}

			.search-container {
				flex: 1;
				min-width: 200px;
			}

			.search-input {
				width: 100%;
				padding: 10px 15px;
				background: rgba(8, 2, 21, 0.8);
				border: 1px solid var(--secondary-base);
				border-radius: 5px;
				color: var(--secondary-base);
				font-family: 'Courier New', monospace;
			}

			.search-input:focus {
				outline: none;
				border-color: var(--interactive-highlight);
				box-shadow: 0 0 10px rgba(5, 217, 232, 0.4);
			}

			.search-input::placeholder {
				color: rgba(255, 255, 255, 0.5);
			}

			.filter-controls {
				display: flex;
				gap: 10px;
				align-items: center;
			}

			.filter-label {
				color: var(--tertiary-accent);
				font-size: 0.9rem;
				text-transform: uppercase;
				font-family: 'Courier New', monospace;
			}

			.filter-select {
				padding: 8px 12px;
				background: rgba(8, 2, 21, 0.8);
				border: 1px solid var(--tertiary-accent);
				border-radius: 5px;
				color: var(--tertiary-accent);
				font-family: 'Courier New', monospace;
			}

			.filter-select:focus {
				outline: none;
				border-color: var(--tertiary-accent);
				box-shadow: 0 0 10px rgba(216, 0, 255, 0.4);
			}

			.bulk-actions {
				display: flex;
				gap: 10px;
			}

			.bulk-btn {
				padding: 8px 16px;
				border: 1px solid var(--warning-accent);
				background: rgba(8, 2, 21, 0.8);
				color: var(--warning-accent);
				border-radius: 5px;
				cursor: pointer;
				font-family: 'Courier New', monospace;
				text-transform: uppercase;
				font-size: 0.8rem;
				transition: all 0.3s ease;
			}

			.bulk-btn:hover {
				background: rgba(255, 230, 0, 0.2);
				box-shadow: 0 0 10px rgba(255, 230, 0, 0.5);
			}

			.file-list-container {
				flex: 1;
				overflow-y: auto;
				scrollbar-width: thin;
				scrollbar-color: var(--interactive-highlight) rgba(13, 2, 33, 0.4);
			}

			.file-list-container::-webkit-scrollbar {
				width: 8px;
			}

			.file-list-container::-webkit-scrollbar-track {
				background: rgba(13, 2, 33, 0.4);
			}

			.file-list-container::-webkit-scrollbar-thumb {
				background: var(--interactive-highlight);
				border-radius: 4px;
			}

			.file-item {
				display: flex;
				align-items: center;
				padding: 12px 20px;
				border-bottom: 1px solid rgba(255, 255, 255, 0.1);
				transition: all 0.2s ease;
				cursor: pointer;
			}

			.file-item:hover {
				background: rgba(5, 217, 232, 0.1);
				border-color: var(--interactive-highlight);
			}

			.file-item.selected {
				background: rgba(5, 217, 232, 0.2);
				border-color: var(--interactive-highlight);
				box-shadow: 0 0 10px rgba(5, 217, 232, 0.3);
			}

			.file-checkbox {
				width: 18px;
				height: 18px;
				margin-right: 15px;
				accent-color: var(--interactive-highlight);
			}

			.file-icon {
				width: 24px;
				text-align: center;
				margin-right: 15px;
				font-size: 1.1rem;
			}

			.file-icon.audio { color: var(--success-accent); }
			.file-icon.video { color: var(--tertiary-accent); }

			.file-info {
				flex: 1;
				overflow: hidden;
				font-family: 'Courier New', monospace;
			}

			.file-name {
				color: var(--secondary-base);
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
				font-weight: bold;
			}

			.file-details {
				font-size: 0.8rem;
				color: rgba(255, 255, 255, 0.6);
				margin-top: 2px;
			}

			.file-type {
				color: var(--warning-accent);
			}

			.status-bar {
				padding: 15px 20px;
				background: rgba(8, 2, 21, 0.8);
				border-top: 1px solid rgba(5, 217, 232, 0.3);
				display: flex;
				justify-content: space-between;
				align-items: center;
				font-family: 'Courier New', monospace;
			}

			.selected-count {
				color: var(--interactive-highlight);
				font-weight: bold;
			}

			.total-count {
				color: rgba(255, 255, 255, 0.7);
				font-size: 0.9rem;
			}

			.modal-actions {
				padding: 20px;
				background: rgba(8, 2, 21, 0.8);
				border-top: 1px solid var(--interactive-highlight);
				display: flex;
				gap: 15px;
				justify-content: flex-end;
			}

			.action-btn {
				padding: 12px 20px;
				border-radius: 5px;
				cursor: pointer;
				font-family: 'Courier New', monospace;
				text-transform: uppercase;
				font-weight: bold;
				transition: all 0.3s ease;
			}

			.btn-cancel {
				border: 1px solid var(--primary-accent);
				background: rgba(8, 2, 21, 0.8);
				color: var(--primary-accent);
			}

			.btn-cancel:hover {
				background: rgba(255, 42, 109, 0.2);
				box-shadow: 0 0 10px rgba(255, 42, 109, 0.5);
			}

			.btn-add {
				border: 1px solid var(--interactive-highlight);
				background: rgba(5, 217, 232, 0.2);
				color: var(--interactive-highlight);
			}

			.btn-add:hover {
				background: rgba(5, 217, 232, 0.3);
				box-shadow: 0 0 15px rgba(5, 217, 232, 0.6);
			}

			.btn-add:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}

			.loading-container {
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				padding: 40px;
				color: var(--interactive-highlight);
				font-family: 'Courier New', monospace;
			}

			.loading-spinner {
				width: 40px;
				height: 40px;
				border: 3px solid rgba(5, 217, 232, 0.3);
				border-top: 3px solid var(--interactive-highlight);
				border-radius: 50%;
				animation: spin 1s linear infinite;
				margin-bottom: 20px;
			}

			@keyframes spin {
				0% { transform: rotate(0deg); }
				100% { transform: rotate(360deg); }
			}

			.loading-text {
				text-align: center;
				font-size: 1.1rem;
			}

			.empty-state {
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				padding: 40px;
				color: rgba(255, 255, 255, 0.6);
				text-align: center;
				font-family: 'Courier New', monospace;
			}

			.empty-icon {
				font-size: 3rem;
				color: var(--warning-accent);
				margin-bottom: 20px;
			}

			.empty-text {
				font-size: 1.1rem;
			}

			@media (max-width: 768px) {
				.directory-browser {
					width: 95vw;
					height: 85vh;
				}

				.modal-controls {
					flex-direction: column;
					align-items: stretch;
				}

				.filter-controls,
				.bulk-actions {
					flex-wrap: wrap;
				}

				.modal-actions {
					flex-direction: column;
				}

				.action-btn {
					width: 100%;
					text-align: center;
				}
			}
		`;

        const style = document.createElement('style');
        style.id = cssId;
        style.textContent = css;
        document.head.appendChild(style);
    }

    /**
	 * Open the directory browser modal
	 * @param {string} directoryUrl - URL of the directory to browse
	 * @param {Function} onAdd - Callback function when files are selected
	 * @param {Function} showStatus - Status message function
	 */
    async open(directoryUrl, onAdd, showStatus) {
        this.currentDirectory = directoryUrl;
        this.onAddCallback = onAdd;
        this.selectedFiles.clear();

        // Set directory path
        document.getElementById('directoryPath').textContent = directoryUrl;

        // Show modal and loading state
        this.modal.classList.add('show');
        this.showLoadingState();

        try {
            // Scan directory using existing handler
            const mediaUrls = await handleDirectoryUrl(directoryUrl, showStatus);
			
            // Convert URLs to file objects
            this.allFiles = mediaUrls.map(url => ({
                name: this.getFileNameFromUrl(url),
                url: url,
                type: this.getFileType(url),
                size: null // Size not available from URL
            }));

            this.filteredFiles = [...this.allFiles];

            if (this.allFiles.length === 0) {
                this.showEmptyState();
            } else {
                this.renderFileList();
                this.showFileListState();
            }

        } catch (error) {
            console.error('Error scanning directory:', error);
            showStatus(error.message, true);
            this.showEmptyState();
        }

        // Bind events
        this.bindEvents();
    }

    /**
	 * Close the modal
	 */
    close() {
        this.modal.classList.remove('show');
        this.unbindEvents();
    }

    /**
	 * Show loading state
	 */
    showLoadingState() {
        document.getElementById('loadingState').style.display = 'flex';
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('fileList').style.display = 'none';
        document.getElementById('statusBar').style.display = 'none';
    }

    /**
	 * Show empty state
	 */
    showEmptyState() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('emptyState').style.display = 'flex';
        document.getElementById('fileList').style.display = 'none';
        document.getElementById('statusBar').style.display = 'none';
    }

    /**
	 * Show file list state
	 */
    showFileListState() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('fileList').style.display = 'block';
        document.getElementById('statusBar').style.display = 'flex';
    }

    /**
	 * Render the file list
	 */
    renderFileList() {
        const fileList = document.getElementById('fileList');
        const selectedCount = document.getElementById('selectedCount');
        const totalCount = document.getElementById('totalCount');
        const addButton = document.getElementById('addSelectedBtn');

        // Clear existing list
        fileList.innerHTML = '';

        // Render each file
        this.filteredFiles.forEach((file, index) => {
            const fileItem = this.createFileItem(file, index);
            fileList.appendChild(fileItem);
        });

        // Update counts
        selectedCount.textContent = this.selectedFiles.size;
        totalCount.textContent = this.filteredFiles.length;

        // Update add button state
        addButton.disabled = this.selectedFiles.size === 0;

        // Update filter status
        this.updateFilterStatus();
    }

    /**
	 * Create a file item element
	 * @param {Object} file - File object
	 * @param {number} index - File index
	 * @returns {HTMLElement} File item element
	 */
    createFileItem(file, index) {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.dataset.index = index;

        const isSelected = this.selectedFiles.has(file.url);
        if (isSelected) {
            item.classList.add('selected');
        }

        // Determine file icon and type
        const isAudio = this.getFileType(file.url) === 'audio';
        const icon = isAudio ? '🎵' : '🎬';
        const iconClass = isAudio ? 'audio' : 'video';

        item.innerHTML = `
			<input type="checkbox" class="file-checkbox" ${isSelected ? 'checked' : ''}>
			<div class="file-icon ${iconClass}">${icon}</div>
			<div class="file-info">
				<div class="file-name">${file.name}</div>
				<div class="file-details">
					<span class="file-type">${file.type.toUpperCase()}</span>
					${file.size ? ` • ${file.size}` : ''}
				</div>
			</div>
		`;

        // Add click handlers
        item.addEventListener('click', () => this.toggleFileSelection(file, item));

        const checkbox = item.querySelector('.file-checkbox');
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFileSelection(file, item);
        });

        return item;
    }

    /**
	 * Toggle file selection
	 * @param {Object} file - File object
	 * @param {HTMLElement} itemElement - File item element
	 */
    toggleFileSelection(file, itemElement) {
        const checkbox = itemElement.querySelector('.file-checkbox');

        if (this.selectedFiles.has(file.url)) {
            this.selectedFiles.delete(file.url);
            itemElement.classList.remove('selected');
            checkbox.checked = false;
        } else {
            this.selectedFiles.add(file.url);
            itemElement.classList.add('selected');
            checkbox.checked = true;
        }

        // Update UI
        this.updateSelectionUI();
    }

    /**
	 * Update selection UI
	 */
    updateSelectionUI() {
        const selectedCount = document.getElementById('selectedCount');
        const addButton = document.getElementById('addSelectedBtn');

        selectedCount.textContent = this.selectedFiles.size;
        addButton.disabled = this.selectedFiles.size === 0;
    }

    /**
	 * Filter files based on search and type
	 */
    filterFiles() {
        const searchTerm = document.getElementById('fileSearchInput').value.toLowerCase();
        const typeFilter = document.getElementById('fileTypeFilter').value;

        this.filteredFiles = this.allFiles.filter(file => {
            // Search filter
            const matchesSearch = file.name.toLowerCase().includes(searchTerm);

            // Type filter
            const matchesType = typeFilter === 'all' || file.type === typeFilter;

            return matchesSearch && matchesType;
        });

        // Clear selections for files not in filtered list
        const filteredUrls = new Set(this.filteredFiles.map(f => f.url));
        this.selectedFiles.forEach(url => {
            if (!filteredUrls.has(url)) {
                this.selectedFiles.delete(url);
            }
        });

        this.renderFileList();

        // Show empty state if no files match
        if (this.filteredFiles.length === 0) {
            this.showEmptyState();
        } else {
            this.showFileListState();
        }
    }

    /**
	 * Update filter status display
	 */
    updateFilterStatus() {
        const filterStatus = document.getElementById('filterStatus');
        const searchTerm = document.getElementById('fileSearchInput').value;
        const typeFilter = document.getElementById('fileTypeFilter').value;

        let status = '';
        if (this.filteredFiles.length !== this.allFiles.length) {
            status = `Showing ${this.filteredFiles.length} of ${this.allFiles.length} files`;
            if (searchTerm) status += ` • Search: "${searchTerm}"`;
            if (typeFilter !== 'all') status += ` • Type: ${typeFilter}`;
        }

        filterStatus.textContent = status;
    }

    /**
	 * Select all filtered files
	 */
    selectAll() {
        this.filteredFiles.forEach(file => {
            this.selectedFiles.add(file.url);
        });
        this.renderFileList();
    }

    /**
	 * Deselect all filtered files
	 */
    selectNone() {
        this.filteredFiles.forEach(file => {
            this.selectedFiles.delete(file.url);
        });
        this.renderFileList();
    }

    /**
	 * Add selected files to playlist
	 */
    async addSelectedFiles() {
        const selected = this.allFiles.filter(file => this.selectedFiles.has(file.url));
	
        console.log('Adding selected files:', selected.map(f => f.name));
	
        if (this.onAddCallback) {
            // Add each selected file sequentially to avoid issues
            for (const file of selected) {
                try {
                    await this.onAddCallback(file.url);
                } catch (error) {
                    console.error('Error adding file:', file.name, error);
                }
            }
        }
	
        this.close();
    }

    /**
	 * Get file name from URL
	 * @param {string} url - File URL
	 * @returns {string} File name
	 */
    getFileNameFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            let filename = pathname.split('/').pop();
            filename = filename.split('?')[0];
            filename = decodeURIComponent(filename);
            return filename || 'Unknown File';
        } catch (_error) {
            return 'Unknown File';
        }
    }

    /**
	 * Get file type from URL
	 * @param {string} url - File URL
	 * @returns {string} File type ('audio' or 'video')
	 */
    getFileType(url) {
        const audioExts = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.opus', '.wma'];
        const videoExts = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.m4v', '.3gp', '.wmv', '.ogv'];

        const ext = url.toLowerCase().substring(url.lastIndexOf('.'));

        if (audioExts.includes(ext)) return 'audio';
        if (videoExts.includes(ext)) return 'video';

        // Default to audio for unknown extensions
        return 'audio';
    }

    /**
	 * Bind event listeners
	 */
    bindEvents() {
        // Search and filter
        document.getElementById('fileSearchInput').addEventListener('input', () => this.filterFiles());
        document.getElementById('fileTypeFilter').addEventListener('change', () => this.filterFiles());

        // Bulk actions
        document.getElementById('selectAllBtn').addEventListener('click', () => this.selectAll());
        document.getElementById('selectNoneBtn').addEventListener('click', () => this.selectNone());

        // Modal actions
        document.getElementById('cancelBtn').addEventListener('click', () => this.close());
        document.getElementById('addSelectedBtn').addEventListener('click', () => this.addSelectedFiles());

        // Close on outside click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Keyboard shortcuts
        this.keyHandler = (e) => this.handleKeypress(e);
        document.addEventListener('keydown', this.keyHandler);
    }

    /**
	 * Unbind event listeners
	 */
    unbindEvents() {
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
            this.keyHandler = null;
        }
    }

    /**
	 * Handle keyboard shortcuts
	 * @param {KeyboardEvent} e - Keyboard event
	 */
    handleKeypress(e) {
        if (!this.modal.classList.contains('show')) return;

        switch(e.key) {
        case 'Escape':
            this.close();
            break;
        case 'Enter':
            if (this.selectedFiles.size > 0) {
                this.addSelectedFiles();
            }
            break;
        case 'a':
        case 'A':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                this.selectAll();
            }
            break;
        }
    }
}

// Create and export global instance
const directoryBrowser = new DirectoryBrowserModal();

/**
 * Enhanced directory URL handling with modal selection
 * @param {string} directoryUrl - Directory URL to process
 * @param {Function} addSingleTrack - Function to add a single track
 * @param {Function} showStatus - Function to show status messages
 * @returns {Promise<number>} - Number of tracks added
 */
export async function processDirectoryWithModal(directoryUrl, addSingleTrack, showStatus) {
    return new Promise((resolve) => {
        let addedCount = 0;
		
        // Create wrapper function for adding tracks
        const addTrackWrapper = async (url) => {
            const success = await addSingleTrack(url);
            if (success) addedCount++;
            return success;
        };

        // Open modal with callback
        directoryBrowser.open(directoryUrl, addTrackWrapper, showStatus);
		
        // Listen for modal close to resolve promise
        const originalClose = directoryBrowser.close.bind(directoryBrowser);
        directoryBrowser.close = () => {
            originalClose();
            directoryBrowser.close = originalClose; // Restore original
            resolve(addedCount);
        };
    });
}

export { DirectoryBrowserModal };
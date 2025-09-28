// frontend/modules/dragDrop/dragDrop.js

/**
 * Mobile-friendly drag and drop module for NeoSynth
 * Handles both desktop and mobile interactions for playlist reordering
 */
const DragDrop = (function() {
    // Private module variables
    let options = {};
    let draggedItem = null;
    let dragSourceIndex = null;
    let touchStartY = 0;
    let touchStartX = 0;
    let isDragging = false;
    let dragClone = null;
    let placeholder = null;
    let playlistContainer = null;
    let autoScrollInterval = null;
    let touchStartScrollTop = 0;
	
    // Private methods
	
    /**
	 * Create visual elements for drag feedback
	 */
    function createDragVisuals(item, y) {
        // Get original dimensions and position
        const rect = item.getBoundingClientRect();
		
        // Create clone for visual feedback during drag
        dragClone = item.cloneNode(true);
        dragClone.classList.add('drag-clone');
		
        // Style the clone
        dragClone.style.position = 'fixed';
        dragClone.style.width = `${rect.width}px`;
        dragClone.style.height = `${rect.height}px`;
        dragClone.style.left = `${rect.left}px`;
        dragClone.style.top = `${rect.top}px`;
        dragClone.style.zIndex = '1000';
        dragClone.style.opacity = '0.9';
        dragClone.style.pointerEvents = 'none';
        dragClone.style.boxShadow = '0 10px 20px rgba(5, 217, 232, 0.4)';
        dragClone.style.transition = 'box-shadow 0.2s ease';
		
        // Create placeholder to show drop position
        placeholder = document.createElement('div');
        placeholder.classList.add('playlist-item-placeholder');
        placeholder.style.height = `${rect.height}px`;
        placeholder.style.margin = '10px 0';
        placeholder.style.borderRadius = '5px';
        placeholder.style.borderWidth = '2px';
        placeholder.style.borderStyle = 'dashed';
        placeholder.style.borderColor = 'var(--secondary-base)';
        placeholder.style.backgroundColor = 'rgba(5, 217, 232, 0.1)';
        placeholder.style.animation = 'placeholderPulse 1.5s infinite';
		
        // Insert placeholder and hide original
        item.parentNode.insertBefore(placeholder, item);
        item.style.display = 'none';
		
        // Add clone to body
        document.body.appendChild(dragClone);
		
        // Provide haptic feedback if available
        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(50);
        }
		
        // Apply body scroll lock
        document.body.classList.add('is-dragging');
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
    }
	
    /**
	 * Clean up visual elements when drag ends
	 */
    function cleanupDragVisuals() {
        // Remove the drag clone
        if (dragClone && dragClone.parentNode) {
            dragClone.parentNode.removeChild(dragClone);
        }
		
        // Show the original item
        if (draggedItem) {
            draggedItem.style.display = '';
        }
		
        // Remove the placeholder
        if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.removeChild(placeholder);
        }
		
        // Clean up body styles
        document.body.classList.remove('is-dragging');
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
		
        // Reset variables
        draggedItem = null;
        dragSourceIndex = null;
        dragClone = null;
        placeholder = null;
        isDragging = false;
		
        // Clear any auto-scrolling
        if (autoScrollInterval) {
            clearInterval(autoScrollInterval);
            autoScrollInterval = null;
        }
    }
	
    /**
	 * Move the clone and placeholder during drag
	 */
    function updateDragPosition(clientY) {
        // Move the clone with the pointer
        if (dragClone) {
            const deltaY = clientY - touchStartY;
            dragClone.style.transform = `translateY(${deltaY}px)`;
        }
		
        // Find placeholder position
        const items = Array.from(
            playlistContainer.querySelectorAll(`${options.itemSelector}:not(.dragging)`)
        );
		
        // Find the item we're currently hovering over
        const hoverItem = items.find(item => {
            const rect = item.getBoundingClientRect();
            return clientY < (rect.top + rect.height / 2);
        });
		
        // Move placeholder
        if (placeholder) {
            if (hoverItem) {
                playlistContainer.insertBefore(placeholder, hoverItem);
            } else if (items.length > 0) {
                const lastItem = items[items.length - 1];
                playlistContainer.insertBefore(placeholder, lastItem.nextSibling);
            }
        }
		
        // Handle auto-scrolling when near edges
        handleAutoScroll(clientY);
    }
	
    /**
	 * Auto-scroll when dragging near container edges
	 */
    function handleAutoScroll(clientY) {
        if (!playlistContainer) return;
		
        const containerRect = playlistContainer.getBoundingClientRect();
        const scrollThreshold = Math.min(60, containerRect.height / 4);
		
        // Clear any existing interval
        if (autoScrollInterval) {
            clearInterval(autoScrollInterval);
            autoScrollInterval = null;
        }
		
        // Set up new autoscroll if needed
        if (clientY < containerRect.top + scrollThreshold) {
            // Scroll up - faster when closer to edge
            const scrollSpeed = Math.max(5, 20 * (1 - (clientY - containerRect.top) / scrollThreshold));
            autoScrollInterval = setInterval(() => {
                playlistContainer.scrollTop -= scrollSpeed;
            }, 16); // ~60fps
        } else if (clientY > containerRect.bottom - scrollThreshold) {
            // Scroll down - faster when closer to edge
            const scrollSpeed = Math.max(5, 20 * (1 - (containerRect.bottom - clientY) / scrollThreshold));
            autoScrollInterval = setInterval(() => {
                playlistContainer.scrollTop += scrollSpeed;
            }, 16); // ~60fps
        }
    }
	
    /**
	 * Get the new index based on placeholder position
	 */
    function getNewIndex() {
        if (!placeholder) return -1;
		
        const allItems = Array.from(playlistContainer.children);
        let placeholderIndex = allItems.indexOf(placeholder);
		
        // Account for the hidden original item
        if (placeholderIndex > dragSourceIndex) {
            placeholderIndex -= 1;
        }
		
        return placeholderIndex;
    }
	
    // Touch Event Handlers
	
    /**
	 * Handle touch start on drag handle
	 */
    function handleTouchStart(e) {
        // Only handle drag from the drag handle
        if (!e.target.closest(options.handleSelector)) return;
		
        // Prevent default to avoid any unwanted behaviors
        e.preventDefault();
        e.stopPropagation();
		
        // Get the parent playlist item
        draggedItem = e.target.closest(options.itemSelector);
        if (!draggedItem) return;
		
        // Get source index from data attribute
        dragSourceIndex = parseInt(draggedItem.dataset.index, 10);
        if (isNaN(dragSourceIndex)) return;
		
        // Store initial position
        const touch = e.touches[0];
        touchStartY = touch.clientY;
        touchStartX = touch.clientX;
        touchStartScrollTop = playlistContainer.scrollTop;
		
        // Add dragging class
        draggedItem.classList.add('dragging');
		
        // Start visual drag after a short delay to prevent accidental drags
        setTimeout(() => {
            // Only create visual if still touching (didn't release quickly)
            if (draggedItem && !isDragging) {
                createDragVisuals(draggedItem, touchStartY);
                isDragging = true;
            }
        }, 150);
    }
	
    /**
	 * Handle touch movement
	 */
    function handleTouchMove(e) {
        if (!draggedItem) return;
		
        // Prevent page scrolling
        e.preventDefault();
        e.stopPropagation();
		
        const touch = e.touches[0];
        const currentY = touch.clientY;
        const currentX = touch.clientX;
		
        // If not dragging yet, check if we should start dragging
        if (!isDragging) {
            const deltaY = Math.abs(currentY - touchStartY);
            const deltaX = Math.abs(currentX - touchStartX);
			
            // Start drag if moved more than 10px vertically
            if (deltaY > 10 && deltaY > deltaX) {
                createDragVisuals(draggedItem, touchStartY);
                isDragging = true;
            }
        }
		
        // Update positions if dragging
        if (isDragging) {
            updateDragPosition(currentY);
        }
    }
	
    /**
	 * Handle touch end - finalize drag
	 */
    function handleTouchEnd(e) {
        // If not dragging, it was just a tap - ignore
        if (!draggedItem || !isDragging) {
            // Just clean up the dragging class if needed
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
            }
            draggedItem = null;
            return;
        }
		
        // Prevent default
        e.preventDefault();
        e.stopPropagation();
		
        // Get new index based on placeholder position
        const newIndex = getNewIndex();
		
        // Only reorder if position actually changed
        if (newIndex !== -1 && newIndex !== dragSourceIndex) {
            // Call the onReorder callback
            if (options.onReorder) {
                options.onReorder(dragSourceIndex, newIndex);
            }
        }
		
        // Provide haptic feedback for drop
        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate([30, 30, 30]);
        }
		
        // Clean up
        cleanupDragVisuals();
    }
	
    /**
	 * Handle touch cancel - clean up without reordering
	 */
    function handleTouchCancel() {
        cleanupDragVisuals();
    }
	
    // Mouse Event Handlers (for desktop support)
	
    /**
	 * Handle mouse down on drag handle
	 */
    function handleMouseDown(e) {
        // Only handle drag from the drag handle
        if (!e.target.closest(options.handleSelector)) return;
		
        // Prevent default to avoid text selection
        e.preventDefault();
		
        // Get the parent playlist item
        draggedItem = e.target.closest(options.itemSelector);
        if (!draggedItem) return;
		
        // Get source index
        dragSourceIndex = parseInt(draggedItem.dataset.index, 10);
        if (isNaN(dragSourceIndex)) return;
		
        // Store initial position
        touchStartY = e.clientY;
        touchStartX = e.clientX;
		
        // Add global mouse events
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }
	
    /**
	 * Handle mouse movement
	 */
    function handleMouseMove(e) {
        if (!draggedItem) return;
		
        // If not dragging yet, check if we should start dragging
        if (!isDragging) {
            const deltaY = Math.abs(e.clientY - touchStartY);
            const deltaX = Math.abs(e.clientX - touchStartX);
			
            // Start drag if moved more than 5px vertically
            if (deltaY > 5 && deltaY > deltaX) {
                createDragVisuals(draggedItem, touchStartY);
                isDragging = true;
            }
        }
		
        // Update positions if dragging
        if (isDragging) {
            updateDragPosition(e.clientY);
        }
    }
	
    /**
	 * Handle mouse up - finalize drag
	 */
    function handleMouseUp(e) {
        // Remove global mouse events
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
		
        // If not dragging, it was just a click - ignore
        if (!draggedItem || !isDragging) {
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
            }
            draggedItem = null;
            return;
        }
		
        // Get new index based on placeholder position
        const newIndex = getNewIndex();
		
        // Only reorder if position actually changed
        if (newIndex !== -1 && newIndex !== dragSourceIndex) {
            // Call the onReorder callback
            if (options.onReorder) {
                options.onReorder(dragSourceIndex, newIndex);
            }
        }
		
        // Clean up
        cleanupDragVisuals();
    }
	
    /**
	 * Apply event listeners to all playlist items
	 */
    function applyEventListeners() {
        // Get the playlist container
        playlistContainer = document.querySelector(options.playlistSelector);
        if (!playlistContainer) return;
		
        // Style all drag handles for better mobile UX
        const moveHandles = playlistContainer.querySelectorAll(options.handleSelector);
        moveHandles.forEach(handle => {
            // Enhance handle visuals for mobile
            handle.innerHTML = '⇅';
            handle.style.fontSize = '1.2rem'; // Larger font size
            handle.style.cursor = 'grab'; // Show grab cursor on the handle only
            handle.style.touchAction = 'none';
			
            // Add mobile touch events
            handle.addEventListener('touchstart', handleTouchStart, { passive: false });
            handle.addEventListener('touchmove', handleTouchMove, { passive: false });
            handle.addEventListener('touchend', handleTouchEnd, { passive: false });
            handle.addEventListener('touchcancel', handleTouchCancel, { passive: false });
			
            // Add desktop mouse events
            handle.addEventListener('mousedown', handleMouseDown);

            // Make sure parent item doesn't have grab cursor
            const parentItem = handle.closest(options.itemSelector);
            if (parentItem) {
                parentItem.style.cursor = 'default';
            } 
        });
		
        // Add CSS for animations if not already present
        if (!document.getElementById('dragdrop-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'dragdrop-styles';
            styleEl.textContent = `
			@keyframes placeholderPulse {
				0%, 100% {
					border-color: var(--secondary-base);
					background-color: rgba(5, 217, 232, 0.1);
				}
				50% {
					border-color: var(--warning-accent);
					background-color: rgba(255, 230, 0, 0.1);
				}
			}
			
			body.is-dragging {
				overflow: hidden;
				touch-action: none;
			}
			
			.btn-move-item {
				touch-action: none;
				cursor: grab !important;
				color: var(--warning-accent);
				transition: transform 0.2s ease, color 0.2s ease, text-shadow 0.2s ease;
				/* Hide by default on desktop */
				display: none;
			}
			
			/* Show on hover - desktop only - match your original CSS exactly */
			.playlist-item:hover .btn-move-item {
				display: inline-block;
				transform: scale(1.2);
				color: var(--warning-accent);
				text-shadow: 0 0 8px var(--warning-accent);
			}
			
			/* Match your original CSS for the hover effect on the button itself */
			.btn-move-item:hover {
				color: var(--interactive-highlight) !important;
				transform: scale(1.4) !important;
				text-shadow: 0 0 12px var(--interactive-highlight) !important;
			}
			
			.btn-move-item:active {
				cursor: grabbing !important;
			}
			
			${options.itemSelector} {
				cursor: default !important;
			}
			
			/* Always show on mobile devices */
			@media (max-width: 768px) {
				.btn-move-item {
					padding: 8px;
					font-size: 1.5rem;
					display: inline-block !important;
				}
			}
		`;
            document.head.appendChild(styleEl);
        }
    }
	
    /**
	 * Remove all event listeners
	 */
    function removeEventListeners() {
        if (!playlistContainer) return;
		
        // Remove touch events
        const moveHandles = playlistContainer.querySelectorAll(options.handleSelector);
        moveHandles.forEach(handle => {
            handle.removeEventListener('touchstart', handleTouchStart);
            handle.removeEventListener('touchmove', handleTouchMove);
            handle.removeEventListener('touchend', handleTouchEnd);
            handle.removeEventListener('touchcancel', handleTouchCancel);
			
            // Remove desktop mouse events
            handle.parentElement.removeEventListener('mousedown', handleMouseDown);
        });
		
        // Remove global mouse events just in case
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }
	
    // Public API
    return {
        /**
		 * Initialize drag and drop functionality
		 * @param {Object} opts Configuration options
		 * @param {Function} opts.onReorder Callback function(sourceIndex, targetIndex)
		 * @param {string} opts.playlistSelector CSS selector for playlist container
		 * @param {string} opts.itemSelector CSS selector for playlist items
		 * @param {string} opts.handleSelector CSS selector for drag handles
		 */
        init: function(opts) {
            // Store options with defaults
            options = {
                onReorder: opts.onReorder || function() {},
                playlistSelector: opts.playlistSelector || '#playlistItems',
                itemSelector: opts.itemSelector || '.playlist-item',
                handleSelector: opts.handleSelector || '.btn-move-item'
            };
			
            // Apply event listeners
            applyEventListeners();
			
            // Return API for chaining
            return this;
        },
		
        /**
		 * Refresh drag and drop when playlist items change
		 */
        refresh: function() {
            // Remove old event listeners
            removeEventListeners();
			
            // Add new event listeners
            applyEventListeners();
			
            // Return API for chaining
            return this;
        },
		
        /**
		 * Destroy and clean up drag and drop
		 */
        destroy: function() {
            // Clean up any ongoing drag operation
            cleanupDragVisuals();
			
            // Remove event listeners
            removeEventListeners();
			
            // Remove styles
            const styleEl = document.getElementById('dragdrop-styles');
            if (styleEl) {
                styleEl.parentNode.removeChild(styleEl);
            }
			
            // Return API for chaining
            return this;
        }
    };
})();

export default DragDrop;
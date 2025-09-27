class AdminPanel {
    constructor() {
        this.featureFlagsContainer = document.getElementById('featureFlagsContainer');
        this.createFlagForm = document.getElementById('createFlagForm');
        this.init();
    }

    async init() {
        await this.loadFeatureFlags();
        await this.loadDynamicTemplates();
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.createFlagForm.addEventListener('submit', (e) => this.handleCreateFlag(e));
        
        // Template button listeners
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleTemplateClick(e));
        });
        
        // Auto-enable feature when rollout percentage is 100%
        const rolloutInput = document.getElementById('rolloutPercentage');
        const enabledCheckbox = document.getElementById('flagEnabled');
        const adminOnlyCheckbox = document.getElementById('adminOnly');
        
        if (rolloutInput && enabledCheckbox && adminOnlyCheckbox) {
            rolloutInput.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                if (value === 100) {
                    enabledCheckbox.checked = true;
                    // Disable and uncheck admin-only when rollout is 100%
                    adminOnlyCheckbox.checked = false;
                    adminOnlyCheckbox.disabled = true;
                    adminOnlyCheckbox.style.opacity = '0.5';
                    adminOnlyCheckbox.style.cursor = 'not-allowed';
                    adminOnlyCheckbox.parentElement.title = 'Admin-only access cannot be enabled with 100% rollout. Set rollout to 0% for admin-only features.';
                    this.showNotification('Auto-enabled feature for 100% rollout. Admin-only disabled due to conflict.', 'info');
                } else {
                    // Re-enable admin-only checkbox when rollout is not 100%
                    adminOnlyCheckbox.disabled = false;
                    adminOnlyCheckbox.style.opacity = '1';
                    adminOnlyCheckbox.style.cursor = 'pointer';
                    adminOnlyCheckbox.parentElement.title = '';
                }
            });
            
            // Handle admin-only changes - disable rollout when checked
            adminOnlyCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    rolloutInput.value = 0;
                    rolloutInput.disabled = true;
                    rolloutInput.style.opacity = '0.5';
                    rolloutInput.style.cursor = 'not-allowed';
                    rolloutInput.parentElement.title = 'Rollout percentage is disabled for admin-only features';
                    this.showNotification('Admin-only access enabled. Rollout percentage set to 0% and disabled.', 'info');
                } else {
                    rolloutInput.disabled = false;
                    rolloutInput.style.opacity = '1';
                    rolloutInput.style.cursor = '';
                    rolloutInput.parentElement.title = '';
                }
            });
        }
    }

    async loadFeatureFlags() {
        try {
            const response = await fetch('/api/admin/feature-flags');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const flags = await response.json();
            this.renderFeatureFlags(flags);
        } catch (error) {
            console.error('Error loading feature flags:', error);
            this.renderError('Failed to load feature flags. Please try again.');
        }
    }

    renderFeatureFlags(flags) {
        if (!flags || flags.length === 0) {
            this.featureFlagsContainer.innerHTML = `
                <div style="text-align: center; color: var(--neon-purple); padding: 40px;">
                    <p>No feature flags found. Create your first one below!</p>
                </div>
            `;
            return;
        }

        const flagsGrid = document.createElement('div');
        flagsGrid.className = 'feature-flags-grid';

        flags.forEach(flag => {
            const flagCard = this.createFlagCard(flag);
            flagsGrid.appendChild(flagCard);
        });

        this.featureFlagsContainer.innerHTML = '';
        this.featureFlagsContainer.appendChild(flagsGrid);
    }

    createFlagCard(flag) {
        const card = document.createElement('div');
        card.className = 'flag-card';
        card.dataset.flagId = flag._id;

        const statusClass = flag.enabled ? 'status-enabled' : 'status-disabled';
        const statusText = flag.enabled ? 'ENABLED' : 'DISABLED';
        const adminOnly = flag.conditions?.userRoles?.includes('admin') || false;

        card.innerHTML = `
            <div class="flag-name">${flag.name}</div>
            <div class="flag-description">${flag.description}</div>
            
            <div class="flag-status ${statusClass}">
                <span class="status-indicator"></span>
                <span>${statusText}</span>
            </div>
            
            <div class="rollout-info">
                Rollout: ${flag.rolloutPercentage}% | 
                ${adminOnly ? 'Admin Only' : 'All Users'} |
                Category: ${flag.category || 'general'} |
                Created: ${new Date(flag.created).toLocaleDateString()}
            </div>
            
            <div class="flag-controls">
                <button class="admin-btn ${flag.enabled ? 'danger' : ''}" 
                        onclick="window.adminPanel.toggleFlag('${flag._id}', ${!flag.enabled})">
                    ${flag.enabled ? 'Disable' : 'Enable'}
                </button>
                
                <button class="admin-btn secondary" 
                        onclick="window.adminPanel.showEditForm('${flag._id}')">
                    Edit
                </button>
                
                <button class="admin-btn danger" 
                        onclick="window.adminPanel.deleteFlag('${flag._id}')">
                    Delete
                </button>
            </div>
            
            <!-- Inline edit form (initially hidden) -->
            <div class="edit-form" id="editForm_${flag._id}" style="display: none;">
                <h4 class="edit-form-title">Edit Feature Flag</h4>
                <form onsubmit="window.adminPanel.saveEditFlag(event, '${flag._id}')">
                    <div class="edit-form-group">
                        <label class="edit-form-label">Flag Name (Read Only)</label>
                        <input type="text" class="edit-form-input" name="name" value="${flag.name}" readonly style="opacity: 0.7; cursor: not-allowed;">
                    </div>
                    
                    <div class="edit-form-group">
                        <label class="edit-form-label">Description</label>
                        <textarea class="edit-form-input edit-form-textarea" name="description" required>${flag.description}</textarea>
                    </div>
                    
                    <div class="edit-form-group">
                        <label class="edit-form-label">Category</label>
                        <select class="edit-form-input" name="category">
                            <option value="general" ${flag.category === 'general' ? 'selected' : ''}>General</option>
                            <option value="themes" ${flag.category === 'themes' ? 'selected' : ''}>Themes</option>
                            <option value="audio" ${flag.category === 'audio' ? 'selected' : ''}>Audio</option>
                            <option value="mobile" ${flag.category === 'mobile' ? 'selected' : ''}>Mobile</option>
                            <option value="admin" ${flag.category === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                    </div>
                    
                    <div class="edit-form-row">
                        <div class="edit-form-group">
                            <label class="edit-form-checkbox">
                                <input type="checkbox" name="enabled" ${flag.enabled ? 'checked' : ''}>
                                <span>Enable Feature Flag</span>
                            </label>
                            <small style="color: rgba(255,255,255,0.6); font-size: 0.7rem; margin-top: 3px; display: block;">
                                Master switch
                            </small>
                        </div>
                        
                        <div class="edit-form-group">
                            <label class="edit-form-label">Rollout %</label>
                            <input type="number" class="edit-form-input" name="rolloutPercentage" min="0" max="100" value="${flag.rolloutPercentage}">
                            <small style="color: rgba(255,255,255,0.6); font-size: 0.7rem; margin-top: 3px; display: block;">
                                0% = admin only, 100% = all users
                            </small>
                        </div>
                    </div>
                    
                    <div class="edit-form-group">
                        <label class="edit-form-checkbox">
                            <input type="checkbox" name="adminOnly" ${adminOnly ? 'checked' : ''}>
                            <span>Admin Only Access</span>
                        </label>
                        <small style="color: rgba(255,255,255,0.6); font-size: 0.7rem; margin-top: 3px; display: block;">
                            Admin-only features automatically set rollout to 0% and disable percentage-based rollout
                        </small>
                    </div>
                    
                    <div class="edit-form-controls">
                        <button type="submit" class="admin-btn">Save Changes</button>
                        <button type="button" class="admin-btn secondary" onclick="window.adminPanel.cancelEdit('${flag._id}')">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        // Add validation event listeners to the edit form
        setTimeout(() => {
            const editForm = card.querySelector(`#editForm_${flag._id}`);
            if (editForm) {
                const rolloutInput = editForm.querySelector('input[name="rolloutPercentage"]');
                const adminOnlyCheckbox = editForm.querySelector('input[name="adminOnly"]');
                const enabledCheckbox = editForm.querySelector('input[name="enabled"]');
                
                if (rolloutInput && adminOnlyCheckbox && enabledCheckbox) {
                    // Set initial state for admin-only flags
                    if (adminOnlyCheckbox.checked) {
                        rolloutInput.disabled = true;
                        rolloutInput.style.opacity = '0.5';
                        rolloutInput.style.cursor = 'not-allowed';
                        rolloutInput.parentElement.title = 'Rollout percentage is disabled for admin-only features';
                    }
                    rolloutInput.addEventListener('input', (e) => {
                        const value = parseInt(e.target.value);
                        if (value === 100) {
                            enabledCheckbox.checked = true;
                            // Disable and uncheck admin-only when rollout is 100%
                            adminOnlyCheckbox.checked = false;
                            adminOnlyCheckbox.disabled = true;
                            adminOnlyCheckbox.style.opacity = '0.5';
                            adminOnlyCheckbox.style.cursor = 'not-allowed';
                            adminOnlyCheckbox.parentElement.title = 'Admin-only access cannot be enabled with 100% rollout. Set rollout to 0% for admin-only features.';
                        } else {
                            // Re-enable admin-only checkbox when rollout is not 100%
                            adminOnlyCheckbox.disabled = false;
                            adminOnlyCheckbox.style.opacity = '1';
                            adminOnlyCheckbox.style.cursor = 'pointer';
                            adminOnlyCheckbox.parentElement.title = '';
                        }
                    });
                    
                    // Handle admin-only changes - disable rollout when checked
                    adminOnlyCheckbox.addEventListener('change', (e) => {
                        if (e.target.checked) {
                            rolloutInput.value = 0;
                            rolloutInput.disabled = true;
                            rolloutInput.style.opacity = '0.5';
                            rolloutInput.style.cursor = 'not-allowed';
                            rolloutInput.parentElement.title = 'Rollout percentage is disabled for admin-only features';
                            this.showNotification('Admin-only access enabled. Rollout percentage set to 0% and disabled.', 'info');
                        } else {
                            rolloutInput.disabled = false;
                            rolloutInput.style.opacity = '1';
                            rolloutInput.style.cursor = '';
                            rolloutInput.parentElement.title = '';
                        }
                    });
                }
            }
        }, 0);

        return card;
    }

    async handleCreateFlag(e) {
        e.preventDefault();
        
        const flagData = {
            name: document.getElementById('flagName').value.trim(),
            description: document.getElementById('flagDescription').value.trim(),
            enabled: document.getElementById('flagEnabled').checked,
            rolloutPercentage: parseInt(document.getElementById('rolloutPercentage').value) || 0,
            adminOnly: document.getElementById('adminOnly').checked,
            category: document.getElementById('flagCategory')?.value || 'general',
            metadata: {}
        };

        if (!flagData.name || !flagData.description) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Validate conflicting settings: admin-only with rollout > 0
        if (flagData.adminOnly && flagData.rolloutPercentage > 0) {
            this.showNotification('Admin-only features cannot have rollout percentage > 0%. Set rollout to 0% for admin-only access.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/admin/feature-flags', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(flagData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create feature flag');
            }

            this.showNotification('Feature flag created successfully!', 'success');
            this.createFlagForm.reset();
            await this.loadFeatureFlags();
        } catch (error) {
            console.error('Error creating feature flag:', error);
            this.showNotification(error.message, 'error');
        }
    }

    async toggleFlag(flagId, enabled) {
        try {
            const response = await fetch(`/api/admin/feature-flags/${flagId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ enabled })
            });

            if (!response.ok) {
                throw new Error('Failed to update feature flag');
            }

            this.showNotification(`Feature flag ${enabled ? 'enabled' : 'disabled'} successfully!`, 'success');
            await this.loadFeatureFlags();
        } catch (error) {
            console.error('Error toggling feature flag:', error);
            this.showNotification('Failed to update feature flag', 'error');
        }
    }

    showEditForm(flagId) {
        // Hide any other open edit forms
        document.querySelectorAll('.edit-form').forEach(form => {
            form.style.display = 'none';
            form.classList.remove('show');
        });
        
        // Show the edit form for this flag
        const editForm = document.getElementById(`editForm_${flagId}`);
        if (editForm) {
            editForm.style.display = 'block';
            
            // Use requestAnimationFrame to ensure the display change is processed first
            requestAnimationFrame(() => {
                editForm.classList.add('show');
                
                // Focus on the first editable input (description since name is readonly)
                const firstInput = editForm.querySelector('textarea[name="description"]');
                if (firstInput) {
                    firstInput.focus();
                    firstInput.select();
                }
            });
        }
    }

    cancelEdit(flagId) {
        const editForm = document.getElementById(`editForm_${flagId}`);
        if (editForm) {
            editForm.classList.remove('show');
            
            // Wait for animation to complete before hiding
            setTimeout(() => {
                editForm.style.display = 'none';
            }, 300);
        }
    }

    async saveEditFlag(event, flagId) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        
        const flagData = {
            description: formData.get('description').trim(),
            category: formData.get('category'),
            enabled: formData.has('enabled'),
            rolloutPercentage: parseInt(formData.get('rolloutPercentage')) || 0,
            adminOnly: formData.has('adminOnly')
        };

        if (!flagData.description) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Validate conflicting settings: admin-only with rollout > 0
        if (flagData.adminOnly && flagData.rolloutPercentage > 0) {
            this.showNotification('Admin-only features cannot have rollout percentage > 0%. Set rollout to 0% for admin-only access.', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/admin/feature-flags/${flagId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(flagData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update feature flag');
            }

            this.showNotification('Feature flag updated successfully!', 'success');
            this.cancelEdit(flagId);
            await this.loadFeatureFlags();
        } catch (error) {
            console.error('Error updating feature flag:', error);
            this.showNotification(error.message, 'error');
        }
    }

    async deleteFlag(flagId) {
        if (!confirm('Are you sure you want to delete this feature flag? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/feature-flags/${flagId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete feature flag');
            }

            this.showNotification('Feature flag deleted successfully!', 'success');
            await this.loadFeatureFlags();
        } catch (error) {
            console.error('Error deleting feature flag:', error);
            this.showNotification('Failed to delete feature flag', 'error');
        }
    }

    renderError(message) {
        this.featureFlagsContainer.innerHTML = `
            <div class="error">
                <strong>Error:</strong> ${message}
                <br><br>
                <button class="admin-btn" onclick="adminPanel.loadFeatureFlags()">
                    Retry
                </button>
            </div>
        `;
    }

    handleTemplateClick(e) {
        const template = e.target.dataset.template;
        const templates = this.getTemplateData();
        
        if (templates[template]) {
            this.populateFormWithTemplate(templates[template]);
            this.showNotification(`Template "${templates[template].name}" loaded!`, 'info');
            
            // Scroll to form
            document.getElementById('createFlagForm').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
    }

    async loadDynamicTemplates() {
        try {
            const response = await fetch('/api/admin/discovery/categories');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const categories = await response.json();
            this.renderDynamicTemplates(categories);
        } catch (error) {
            console.error('Error loading dynamic templates:', error);
            // Fallback to static templates if dynamic loading fails
            this.renderStaticTemplates();
        }
    }

    renderDynamicTemplates(categories) {
        const templatesGrid = document.querySelector('.templates-grid');
        if (!templatesGrid) return;

        templatesGrid.innerHTML = '';

        Object.entries(categories).forEach(([categoryId, category]) => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'template-category';
            
            const titleDiv = document.createElement('h3');
            titleDiv.className = 'template-title';
            titleDiv.innerHTML = `${category.icon || '🏷️'} ${category.name}`;
            
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'template-buttons';
            
            category.templates.forEach(template => {
                const button = document.createElement('button');
                button.className = 'template-btn';
                button.dataset.template = template.id;
                button.dataset.category = categoryId;
                button.textContent = template.name;
                
                button.addEventListener('click', (e) => this.handleDynamicTemplateClick(e, template));
                buttonsDiv.appendChild(button);
            });
            
            categoryDiv.appendChild(titleDiv);
            categoryDiv.appendChild(buttonsDiv);
            templatesGrid.appendChild(categoryDiv);
        });
    }

    renderStaticTemplates() {
        // Fallback to original static templates
        console.log('Using static template fallback');
    }

    handleDynamicTemplateClick(e, template) {
        const flagData = {
            name: template.id,
            description: template.description,
            enabled: template.metadata?.enabled || false,
            rolloutPercentage: template.metadata?.rolloutPercentage || 0,
            adminOnly: template.metadata?.adminOnly || false,
            category: template.category,
            metadata: template.metadata || {}
        };
        
        this.populateFormWithTemplate(flagData);
        this.showNotification(`Template "${template.name}" loaded!`, 'info');
        
        // Scroll to form
        document.getElementById('createFlagForm').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }

    getTemplateData() {
        return {
            'theme-vapor': {
                name: 'theme_vapor',
                description: 'Controls access to the Vapor Dream theme with its soft purple/pink aesthetic and dreamy vibes',
                enabled: false,
                rolloutPercentage: 0,
                adminOnly: false
            },
            'theme-synthwave': {
                name: 'theme_synthwave',
                description: 'Controls access to the classic 80s Synthwave theme with magenta/cyan contrast',
                enabled: false,
                rolloutPercentage: 0,
                adminOnly: false
            },
            'theme-quantum': {
                name: 'theme_quantum',
                description: 'Controls access to the high-tech Quantum Flux theme with purple/cyan/lime energy',
                enabled: false,
                rolloutPercentage: 0,
                adminOnly: false
            },
            'theme-noir': {
                name: 'theme_noir',
                description: 'Controls access to the high contrast Neon Noir theme with white/red/black film noir aesthetic',
                enabled: false,
                rolloutPercentage: 0,
                adminOnly: false
            },
            'theme-mint': {
                name: 'theme_mint',
                description: 'Controls access to the fresh Vapor Mint theme with mint/pink/purple retro-futuristic styling',
                enabled: false,
                rolloutPercentage: 0,
                adminOnly: false
            },
            'theme-laser': {
                name: 'theme_laser',
                description: 'Controls access to the hot pink/electric blue Laser Grid theme with retro gaming aesthetics',
                enabled: false,
                rolloutPercentage: 0,
                adminOnly: false
            },
            'theme-toxic': {
                name: 'theme_toxic',
                description: 'Controls access to the radioactive green/yellow Toxic Waste theme with hazardous energy styling',
                enabled: false,
                rolloutPercentage: 0,
                adminOnly: false
            },
            'experimental-themes': {
                name: 'experimental_themes',
                description: 'Enables access to experimental and beta themes including hologram and matrix themes',
                enabled: false,
                rolloutPercentage: 10,
                adminOnly: true,
                category: 'themes'
            }
        };
    }

    populateFormWithTemplate(template) {
        document.getElementById('flagName').value = template.name;
        document.getElementById('flagDescription').value = template.description;
        document.getElementById('flagEnabled').checked = template.enabled;
        document.getElementById('rolloutPercentage').value = template.rolloutPercentage;
        document.getElementById('adminOnly').checked = template.adminOnly;
        
        // Set category if field exists
        const categoryField = document.getElementById('flagCategory');
        if (categoryField && template.category) {
            categoryField.value = template.category;
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            padding: 15px 25px;
            border-radius: 5px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            animation: slideDown 0.3s ease;
        `;

        if (type === 'success') {
            notification.style.background = 'linear-gradient(45deg, var(--neon-yellow), var(--neon-cyan))';
            notification.style.color = 'black';
        } else if (type === 'error') {
            notification.style.background = 'linear-gradient(45deg, #ff0080, #ff4040)';
            notification.style.color = 'white';
        } else {
            notification.style.background = 'rgba(0,0,0,0.8)';
            notification.style.color = 'var(--neon-cyan)';
            notification.style.border = '1px solid var(--neon-cyan)';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    
    @keyframes slideUp {
        from { transform: translateX(-50%) translateY(0); opacity: 1; }
        to { transform: translateX(-50%) translateY(-100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Make adminPanel globally accessible for onclick handlers
window.adminPanel = null;

document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});
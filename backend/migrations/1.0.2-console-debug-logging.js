/**
 * Migration: 1.0.2 - Console Debug Logging Feature Flag
 *
 * Adds the console_debug_logging feature flag to the database.
 * This flag controls verbose console logging for debugging frontend modules.
 *
 * Default state: disabled (enabled: false)
 */

const FeatureFlag = require('../models/FeatureFlag');

module.exports = {
    version: '1.0.2',
    description: 'Add console_debug_logging feature flag',

    async up() {
        console.log('  [*] Running migration 1.0.2: Console Debug Logging Feature Flag');

        try {
            // Check if flag already exists
            const existingFlag = await FeatureFlag.findOne({ name: 'console_debug_logging' });

            if (existingFlag) {
                console.log('  [SKIP] Feature flag "console_debug_logging" already exists, skipping...');
                return { success: true, skipped: true };
            }

            // Create the feature flag
            const flag = await FeatureFlag.create({
                name: 'console_debug_logging',
                description: 'Enable verbose console logging for debugging frontend modules',
                enabled: false,  // Disabled by default for all instances
                rolloutPercentage: 0,
                category: 'developer',
                conditions: {
                    userRoles: [],
                    userIds: []
                },
                metadata: {
                    frontend: true,
                    location: 'All frontend modules via debugLogger'
                }
            });

            console.log('  [OK] Created feature flag: console_debug_logging (disabled by default)');
            return { success: true, flag };

        } catch (error) {
            console.error('  [ERROR] Migration 1.0.2 failed:', error.message);
            throw error;
        }
    },

    async down() {
        console.log('  [*] Rolling back migration 1.0.2: Console Debug Logging Feature Flag');

        try {
            const result = await FeatureFlag.deleteOne({ name: 'console_debug_logging' });

            if (result.deletedCount > 0) {
                console.log('  [OK] Removed feature flag: console_debug_logging');
            } else {
                console.log('  [SKIP] Feature flag "console_debug_logging" not found, nothing to rollback');
            }

            return { success: true };

        } catch (error) {
            console.error('  [ERROR] Rollback 1.0.2 failed:', error.message);
            throw error;
        }
    }
};

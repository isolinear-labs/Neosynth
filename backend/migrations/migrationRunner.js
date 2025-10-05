/**
 * Migration Runner
 *
 * Automatically runs database migrations based on SystemSettings version.
 * Migrations are executed in order and update the system version upon success.
 */

const fs = require('fs');
const path = require('path');
const SystemSettings = require('../models/SystemSettings');

/**
 * Compare version strings (semver-like comparison)
 * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const part1 = parts1[i] || 0;
        const part2 = parts2[i] || 0;

        if (part1 < part2) return -1;
        if (part1 > part2) return 1;
    }

    return 0;
}

/**
 * Get all available migrations sorted by version
 */
function getAvailableMigrations() {
    const migrationsDir = __dirname;
    const files = fs.readdirSync(migrationsDir)
        .filter(file => {
            // Only include migration files (exclude runner and test files)
            return file.endsWith('.js') &&
                   file !== 'migrationRunner.js' &&
                   !file.startsWith('test-');
        })
        .sort();

    return files.map(file => {
        const migration = require(path.join(migrationsDir, file));

        // Validate migration structure
        if (!migration.version) {
            throw new Error(`Migration file ${file} is missing required 'version' property`);
        }
        if (!migration.up || typeof migration.up !== 'function') {
            throw new Error(`Migration file ${file} is missing required 'up' function`);
        }

        return {
            file,
            version: migration.version,
            description: migration.description || 'No description provided',
            up: migration.up,
            down: migration.down
        };
    }).sort((a, b) => compareVersions(a.version, b.version));
}

/**
 * Run all pending migrations
 */
async function runMigrations() {
    try {
        console.log('\n╔════════════════════════════════════════════════════════════════╗');
        console.log('║              DATABASE MIGRATION CHECKER                        ║');
        console.log('╚════════════════════════════════════════════════════════════════╝\n');

        // Get current system version
        const settings = await SystemSettings.getSystemSettings();
        const currentVersion = settings.version || '1.0.0';

        console.log(`[INFO] Current database system version: ${currentVersion}`);

        // Get all available migrations
        const migrations = getAvailableMigrations();

        if (migrations.length === 0) {
            console.log('[INFO] No migrations found\n');
            return { success: true, migrationsRun: 0 };
        }

        // Filter migrations that need to be run
        const pendingMigrations = migrations.filter(m =>
            compareVersions(m.version, currentVersion) > 0
        );

        if (pendingMigrations.length === 0) {
            console.log('[OK] All migrations are up to date\n');
            return { success: true, migrationsRun: 0 };
        }

        console.log(`[INFO] Found ${pendingMigrations.length} pending migration(s):\n`);

        let lastSuccessfulVersion = currentVersion;
        let migrationsRun = 0;

        // Run each pending migration in order
        for (const migration of pendingMigrations) {
            try {
                console.log('┌─────────────────────────────────────────────────────────────┐');
                console.log(`│ Migration ${migration.version}: ${migration.description.padEnd(42, ' ')}│`);
                console.log('└─────────────────────────────────────────────────────────────┘');

                // Run the migration
                const result = await migration.up();

                if (result.success) {
                    // Update system version after successful migration
                    settings.version = migration.version;
                    await settings.save();

                    lastSuccessfulVersion = migration.version;
                    migrationsRun++;

                    if (result.skipped) {
                        console.log('  [SKIP] Migration already applied\n');
                    } else {
                        console.log('  [OK] Migration completed successfully\n');
                    }
                } else {
                    throw new Error('Migration returned unsuccessful result');
                }

            } catch (error) {
                console.log('\n╔════════════════════════════════════════════════════════════════╗');
                console.log('║                    MIGRATION FAILED                            ║');
                console.log('╚════════════════════════════════════════════════════════════════╝');
                console.error(`[ERROR] Migration ${migration.version} failed:`, error.message);
                console.error(`[WARN] System version remains at: ${lastSuccessfulVersion}`);
                console.error('[WARN] Please fix the issue and restart the server\n');

                return {
                    success: false,
                    error: error.message,
                    migrationsRun,
                    failedAt: migration.version,
                    currentVersion: lastSuccessfulVersion
                };
            }
        }

        console.log('╔════════════════════════════════════════════════════════════════╗');
        console.log('║            ALL MIGRATIONS COMPLETED SUCCESSFULLY               ║');
        console.log('╚════════════════════════════════════════════════════════════════╝');
        console.log(`[INFO] System version updated: ${currentVersion} -> ${lastSuccessfulVersion}\n`);

        return {
            success: true,
            migrationsRun,
            previousVersion: currentVersion,
            currentVersion: lastSuccessfulVersion
        };

    } catch (error) {
        console.error('[ERROR] Migration runner error:', error);
        return {
            success: false,
            error: error.message,
            migrationsRun: 0
        };
    }
}

/**
 * Rollback to a specific version (for manual use)
 */
async function rollbackTo(targetVersion) {
    try {
        console.log('\n╔════════════════════════════════════════════════════════════════╗');
        console.log('║                  DATABASE ROLLBACK                             ║');
        console.log('╚════════════════════════════════════════════════════════════════╝\n');
        console.log(`[INFO] Rolling back to version ${targetVersion}...`);

        const settings = await SystemSettings.getSystemSettings();
        const currentVersion = settings.version || '1.0.0';

        if (compareVersions(targetVersion, currentVersion) >= 0) {
            console.log('[WARN] Target version is not older than current version');
            return { success: false, error: 'Invalid rollback target' };
        }

        const migrations = getAvailableMigrations();
        const migrationsToRollback = migrations
            .filter(m => compareVersions(m.version, targetVersion) > 0 &&
                         compareVersions(m.version, currentVersion) <= 0)
            .reverse(); // Rollback in reverse order

        console.log(`[INFO] Rolling back ${migrationsToRollback.length} migration(s)...\n`);

        for (const migration of migrationsToRollback) {
            console.log('┌─────────────────────────────────────────────────────────────┐');
            console.log(`│ Rollback ${migration.version}: ${migration.description.padEnd(40, ' ')}│`);
            console.log('└─────────────────────────────────────────────────────────────┘');

            await migration.down();

            console.log('  [OK] Rollback completed\n');
        }

        // Update system version
        settings.version = targetVersion;
        await settings.save();

        console.log('╔════════════════════════════════════════════════════════════════╗');
        console.log('║              ROLLBACK COMPLETED SUCCESSFULLY                   ║');
        console.log('╚════════════════════════════════════════════════════════════════╝');
        console.log(`[INFO] System version: ${targetVersion}\n`);

        return { success: true, currentVersion: targetVersion };

    } catch (error) {
        console.error('[ERROR] Rollback error:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    runMigrations,
    rollbackTo,
    compareVersions,
    getAvailableMigrations
};

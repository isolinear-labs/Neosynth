# Database Migrations

This directory contains database migration scripts for Neosynth. Migrations run automatically on server startup and ensure all instances are updated consistently.

## How It Works

1. **Server starts** → Connects to MongoDB
2. **Migration runner executes** → Checks `SystemSettings.version` against available migrations
3. **Pending migrations run** → Any migration with version > current system version executes
4. **Database marked ready** → Server accepts requests only after successful migrations
5. **Version updated** → `SystemSettings.version` updated after each successful migration

## Migration Blocking Behavior

- **Before migrations complete**: All API requests return `503 Service Unavailable`
- **Health endpoint**: Always responds (useful for container health checks)
- **On failure**: Database remains in NOT READY state, all requests blocked
- **On success**: Database marked ready, normal operation resumes

## File Structure

```
migrations/
├── migrationRunner.js           # Core migration engine
├── {version}-{description}.js   # Individual migration files
└── README.md                    # This file
```

## Creating a New Migration

### 1. Create Migration File

Name format: `{version}-{description}.js`

Example: `1.0.3-add-user-roles.js`

```javascript
const User = require('../models/User');

module.exports = {
    version: '1.0.3',
    description: 'Add roles field to users',

    async up() {
        console.log('  [*] Running migration 1.0.3: Add user roles');

        try {
            // Migration logic here
            await User.updateMany(
                { role: { $exists: false } },
                { $set: { role: 'user' } }
            );

            console.log('  [OK] Added roles to all users');
            return { success: true };

        } catch (error) {
            console.error('  [ERROR] Migration 1.0.3 failed:', error.message);
            throw error;
        }
    },

    async down() {
        console.log('  [*] Rolling back migration 1.0.3: Add user roles');

        try {
            // Rollback logic here
            await User.updateMany(
                {},
                { $unset: { role: '' } }
            );

            console.log('  [OK] Removed roles from users');
            return { success: true };

        } catch (error) {
            console.error('  [ERROR] Rollback 1.0.3 failed:', error.message);
            throw error;
        }
    }
};
```

### 2. Migration Requirements

Each migration file MUST export:
- `version` (string): Semantic version (e.g., '1.0.3')
- `description` (string): Brief description of changes
- `up()` (async function): Migration logic
- `down()` (async function): Rollback logic (optional but recommended)

### 3. Best Practices

- **Idempotent**: Migrations should be safe to run multiple times
- **Check existence**: Verify data doesn't already exist before creating
- **Return status**: Always return `{ success: true }` or throw an error
- **Logging**: Use ASCII format: `[OK]`, `[ERROR]`, `[SKIP]`, `[*]`
- **Version order**: Use proper semantic versioning
- **Atomic operations**: Each migration should be a single logical change

## Environment Variables

### BYPASS_MIGRATIONS

Set `BYPASS_MIGRATIONS=true` to skip migration execution and mark database as ready immediately.

**Warning**: This is for emergency recovery only. Use when:
- Non-critical migrations are failing
- You need to bring the system online urgently
- You plan to fix and re-run migrations later

```bash
BYPASS_MIGRATIONS=true npm start
```

When enabled, you'll see:
```
[WARN] ╔════════════════════════════════════════════════════════════════╗
[WARN] ║         BYPASSING MIGRATIONS - UNSAFE MODE ENABLED             ║
[WARN] ╚════════════════════════════════════════════════════════════════╝
```

## Manual Migration Control

### Run Migrations Manually

```javascript
const { runMigrations } = require('./migrations/migrationRunner');
await runMigrations();
```

### Rollback to Specific Version

```javascript
const { rollbackTo } = require('./migrations/migrationRunner');
await rollbackTo('1.0.1');
```

### Check Available Migrations

```javascript
const { getAvailableMigrations } = require('./migrations/migrationRunner');
const migrations = getAvailableMigrations();
console.log(migrations);
```

## System Version

The current system version is stored in the `SystemSettings` collection:

```javascript
const SystemSettings = require('./models/SystemSettings');
const settings = await SystemSettings.getSystemSettings();
console.log(settings.version); // e.g., "1.0.2"
```

## Troubleshooting

### Migrations Not Running

- Check MongoDB connection
- Verify `SystemSettings.version` is lower than migration version
- Check server logs for migration errors

### Migration Fails

- Server will NOT mark database as ready
- All requests will return `503 Service Unavailable`
- Fix the migration and restart the server
- System version will remain at last successful migration

### Skip a Migration

Manually update `SystemSettings.version` to skip migrations:

```javascript
const settings = await SystemSettings.getSystemSettings();
settings.version = '1.0.3';
await settings.save();
```

**Warning**: Only do this if you're certain the migration is not needed.

## Migration Execution Order

Migrations execute in semantic version order, regardless of filename:

1. `1.0.1-feature-a.js`
2. `1.0.2-feature-b.js`
3. `1.0.10-feature-c.js` (not 1.0.2)
4. `1.1.0-major-update.js`

## Production Deployment

When deploying to production:

1. Migrations run automatically on server startup
2. Database is blocked until migrations complete
3. Health checks continue to respond during migrations
4. On failure, server remains in degraded state
5. Fix and redeploy to retry failed migrations

## Security

- Migrations run with full database access
- Use caution with data transformations
- Test migrations in staging first
- Always provide rollback capability
- Audit migration logs regularly

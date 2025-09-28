# Administration Guide

This guide covers administrative tasks for NeoSynth, including feature flag management and user administration.

## Feature Flags

NeoSynth uses a comprehensive feature flag system to control feature availability, manage rollouts, and restrict access to admin-only functionality.

### Accessing the Admin Interface

1. Navigate to `/admin` (requires admin authentication)
2. Enter your admin credentials
3. Access the Feature Flags section from the admin dashboard

### Creating Feature Flags

#### Basic Creation
1. Enter a unique **Flag Name** (e.g., `beta_playlist_sharing`)
2. Add a descriptive **Description**
3. Select appropriate **Category**
4. Choose **Enabled** status
5. Set **Rollout Percentage** or check **Admin Only**

#### Quick Templates
Use the "Quick Create Templates" section for common patterns:
- **Theme Features**: Auto-configured for theme access control
- **Admin Features**: Pre-set as admin-only with proper settings
- **UI Features**: Standard user interface enhancements
- **Developer Features**: Debug and development tools

### Feature Flag Properties

- **Name**: Unique identifier (lowercase, underscores only)
- **Description**: Human-readable explanation of the feature
- **Enabled**: Master switch - feature is OFF for everyone if disabled
- **Category**: Organizational grouping (admin, themes, ui, etc.)
- **Admin Only**: Restricts feature to admin users exclusively
- **Rollout Percentage**: Controls what percentage of users have access (0-100%)
- **User IDs**: Specific users who have access (overrides rollout)

### Categories

- **admin**: Administrative tools and controls
- **themes**: Visual themes and styling options
- **ui**: User interface enhancements
- **mobile**: Mobile-specific features
- **developer**: Debug tools and development features
- **navigation**: Menu and navigation features

### Access Control Logic

#### Rollout Percentages
- **0%**: Feature disabled for all users (except admin-only features)
- **1-99%**: Percentage-based rollout to general users
- **100%**: Feature enabled for all users

#### Admin-Only Features
- Always have **0% rollout** (automatically enforced)
- Only accessible to users with `isAdmin: true`
- Cannot be combined with percentage-based rollout

### Best Practices

#### Naming Conventions
- Use lowercase with underscores: `beta_feature_name`
- Include category prefix for clarity: `admin_user_management`
- Keep names descriptive but concise

#### Rollout Strategy
1. **Development**: Create flag, keep disabled
2. **Testing**: Enable for specific test user IDs
3. **Beta**: Start with low rollout percentage (5-10%)
4. **Gradual rollout**: Increase percentage over time
5. **Full release**: 100% rollout or remove flag entirely

## User Management

### Creating Admin Users

#### Method 1: Database Direct Insert
```bash
# Connect to your MongoDB instance
mongo neosynth --eval '
db.users.insertOne({
  username: "admin",
  userId: "admin",
  isAdmin: true,
  authEnabled: true,
  created: new Date(),
  preferences: {
    shuffleEnabled: false,
    volume: 100,
    theme: "default"
  }
})'
```

#### Method 2: Promote Existing User
```bash
# Update existing user to admin
mongo neosynth --eval '
db.users.updateOne(
  { userId: "existing_username" },
  { $set: { isAdmin: true } }
)'
```

### Managing User Access

- **Admin Status**: Grant/revoke admin privileges
- **Account Status**: Enable/disable user accounts
- **Feature Access**: Use feature flags for granular control
- **Authentication**: Manage TOTP settings and login requirements

## Security

### Environment Variables

Ensure these are properly configured in production:

```bash
NODE_ENV=production
COOKIE_SECRET=<secure-random-string>
TOTP_ENCRYPTION_KEY=<secure-random-string>
MONGODB_URI=<database-connection-string>
FRONTEND_URL=<your-domain-url>
```

## Troubleshooting

### Common Issues

#### Feature Not Showing for Admin User
1. Check if feature flag exists and is enabled
2. Verify user has `isAdmin: true` in database
3. Check if flag is properly configured as admin-only
4. Clear browser cache and refresh

#### Cannot Access Admin Panel
1. Verify admin credentials
2. Check `isAdmin` status in database
3. Ensure admin routes are properly configured
4. Check server logs for authentication errors

#### Feature Flag Changes Not Taking Effect
1. Check if changes were saved successfully
2. Verify feature flag is enabled
3. Wait for cache refresh (5 minutes max)
4. Check browser console for errors

For technical details and API documentation, see [Development Guide](DEVELOPMENT.md).
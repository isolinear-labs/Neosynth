# Development Guide

This guide covers technical details for developers working with NeoSynth's APIs and architecture.

## API Documentation

NeoSynth provides comprehensive OpenAPI documentation for all endpoints.

### Accessing API Documentation

#### Local Development
When running NeoSynth locally, the interactive API documentation is available at:
- **Swagger UI**: `http://localhost:5000/api-docs`

#### Production
For production deployments, replace `localhost:5000` with your domain:
- **Swagger UI**: `https://your-domain.com/api-docs`

### API Specification

The complete OpenAPI specification is available at:
- **Local**: `http://localhost:5000/api-docs/openapi.yaml`
- **File**: `/backend/apiSpec/openapi.yaml`

## Authentication

NeoSynth supports multiple authentication methods:

### Session-Based Authentication
- **Login**: `POST /api/auth/login`
- **Logout**: `POST /api/auth/logout`
- **Session Check**: `GET /api/auth/session`

### API Key Authentication
- **Generate Key**: `POST /api/keys/generate`
- **List Keys**: `GET /api/keys`
- **Revoke Key**: `DELETE /api/keys/:keyId`

### Usage Examples

#### Session Authentication
```javascript
// Login
const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'user', password: 'pass' })
});

// Use session cookies for subsequent requests
const userData = await fetch('/api/users/me', {
    credentials: 'include'
});
```

#### API Key Authentication
```javascript
// Using API key in header
const response = await fetch('/api/users/me', {
    headers: {
        'X-API-Key': 'nsk_live_your_api_key_here'
    }
});
```

## Core Endpoints

### User Management
- `GET /api/users/:userId` - Get user data
- `PUT /api/users/:userId` - Update user data
- `POST /api/users/:userId/preferences` - Update preferences

### Playlist Management
- `GET /api/users/:userId/playlists` - Get user playlists
- `POST /api/users/:userId/playlists` - Create playlist
- `PUT /api/users/:userId/playlists/:playlistId` - Update playlist
- `DELETE /api/users/:userId/playlists/:playlistId` - Delete playlist

### Feature Flags
- `GET /api/feature-flags` - Get user's feature flags
- `GET /api/admin/feature-flags` - Admin: Get all flags
- `POST /api/admin/feature-flags` - Admin: Create flag
- `PUT /api/admin/feature-flags/:id` - Admin: Update flag

### Now Playing
- `GET /api/users/:userId/now-playing` - Get current track
- `POST /api/users/:userId/now-playing` - Update current track

## Database Schema

### User Model
```javascript
{
  userId: String,           // Unique user identifier
  username: String,         // Display name
  isAdmin: Boolean,         // Admin privileges
  authEnabled: Boolean,     // Authentication required
  preferences: {
    shuffleEnabled: Boolean,
    volume: Number,
    theme: String
  },
  nowPlaying: {
    playListId: String,
    trackUrl: String,
    trackName: String,
    position: Number,
    isPlaying: Boolean,
    updated: Date
  }
}
```

### Playlist Model
```javascript
{
  playListId: String,       // Unique playlist identifier
  userId: String,           // Owner user ID
  name: String,             // Playlist name
  tracks: [{
    url: String,            // Track file path/URL
    name: String,           // Track display name
    duration: Number        // Track duration in seconds
  }],
  created: Date,
  updated: Date
}
```

### Feature Flag Model
```javascript
{
  name: String,             // Unique flag name
  description: String,      // Human-readable description
  enabled: Boolean,         // Master enable/disable
  category: String,         // Organizational category
  adminOnly: Boolean,       // Restrict to admin users
  rolloutPercentage: Number,// Percentage rollout (0-100)
  userIds: [String],        // Specific user access list
  created: Date,
  updated: Date
}
```

## Real-time Features

### Server-Sent Events
NeoSynth provides real-time updates via Server-Sent Events:

#### Feature Flag Updates
```javascript
// Subscribe to feature flag changes
const eventSource = new EventSource('/api/feature-flags/events');

eventSource.onmessage = function(event) {
    const updatedFlags = JSON.parse(event.data);
    // Update application state
};
```

#### Usage Example
```javascript
// Frontend feature flag manager
class FeatureManager {
    constructor() {
        this.flags = {};
        this.setupSSE();
    }

    setupSSE() {
        const eventSource = new EventSource('/api/feature-flags/events');
        eventSource.onmessage = (event) => {
            this.flags = JSON.parse(event.data);
            this.notifyListeners();
        };
    }

    isEnabled(flagName) {
        return this.flags[flagName] || false;
    }
}
```

## Error Handling

### Standard Error Responses
```javascript
{
  error: "Error message",
  code: "ERROR_CODE",
  details: {} // Additional error context
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Rate Limited
- `500` - Internal Server Error

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **General endpoints**: 100 requests per 15 minutes
- **Authentication endpoints**: 5 requests per 15 minutes
- **Admin endpoints**: 50 requests per 15 minutes

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Development Tools

### Running Tests
```bash
cd backend
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

### API Testing
Use tools like Postman, Insomnia, or curl to test endpoints:

```bash
# Test authentication
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'

# Test with API key
curl -H "X-API-Key: nsk_live_..." \
  http://localhost:5000/api/users/testuser
```

### Database Access
```bash
# Connect to local MongoDB
mongo neosynth

# View collections
show collections

# Query users
db.users.find({})

# Query feature flags
db.featureflags.find({})
```

## Environment Configuration

### Required Environment Variables
```bash
NODE_ENV=development|production
MONGODB_URI=mongodb://localhost:27017/neosynth
FRONTEND_URL=http://localhost:5000
COOKIE_SECRET=secure_random_string
TOTP_ENCRYPTION_KEY=secure_random_string
```

### Optional Environment Variables
```bash
PORT=5000                 # Server port (default: 5000)
LOG_LEVEL=info            # Logging level
CORS_ORIGINS=*            # CORS allowed origins
```

## Security Considerations

### API Security
- All admin endpoints require authentication
- Rate limiting prevents abuse
- Input validation on all endpoints
- SQL injection protection via Mongoose
- XSS protection via helmet and sanitization

### Authentication Security
- Secure session configuration
- TOTP two-factor authentication support
- Bcrypt password hashing
- Secure cookie settings in production

### Best Practices
- Use HTTPS in production
- Regularly rotate secrets
- Monitor for suspicious activity
- Keep dependencies updated
- Follow OWASP guidelines

## Theme System

NeoSynth supports multiple themes through a comprehensive CSS custom property system.

### Theme Structure

Themes are defined in `/frontend/cssCustom/themes/root.css` and individual theme files:

```css
:root {
    /* Base theme variables */
    --primary-accent: #ff00ff;
    --secondary-base: #00ffff;
    --tertiary-accent: #ff00ff;
    --interactive-highlight: #00ffff;
    --warning-accent: #ffff00;
    --dark-bg: #1a0033;
    --darker-bg: #0d001a;
    --text-color: #ffffff;
    --accent-dark: #cc00cc;
    --success-accent: #ffff00;
    --panel-bg: rgba(26, 0, 51, 0.85);
    --panel-bg-hover: rgba(26, 0, 51, 0.95);
}
```

### Theme Architecture

- **Root Variables**: Defined in `/frontend/cssCustom/themes/root.css`
- **Individual Themes**: Located in `/frontend/cssCustom/themes/`
- **Legacy Themes**: Archived in `/frontend/cssCustom/themes/legacy/`
- **Experimental Themes**: Located in `/frontend/cssCustom/themes/experimental-*.css`

### Creating a New Theme

1. **Define theme variables:**
   ```css
   body.theme-mytheme {
       --primary-accent: #your-color;
       --secondary-base: #your-color;
       --tertiary-accent: #your-color;
       --interactive-highlight: #your-color;
       --warning-accent: #your-color;
       --dark-bg: #your-color;
       --darker-bg: #your-color;
       --text-color: #your-color;
       --accent-dark: #your-color;
       --success-accent: #your-color;
       --panel-bg: rgba(your-values);
       --panel-bg-hover: rgba(your-values);
   }
   ```

2. **Register theme in theme selector:**
   Update `/frontend/modules/themes/themeSelector.js` to include your theme.

3. **Test across components:**
   Ensure all UI components work with your theme colors.

### Theme Guidelines

- **Accessibility**: Ensure sufficient color contrast ratios
- **Consistency**: Follow the established CSS variable naming convention
- **Compatibility**: Test with all modules and UI components
- **Documentation**: Document theme inspiration and color choices
- **Performance**: Minimize CSS specificity and redundancy

### Theme API Endpoints

- `GET /api/themes` - Get available themes (filtered by feature flags)
- Theme availability is controlled via the experimental themes feature flag

## Contributing

For information about contributing to the codebase, see [CONTRIBUTING.md](CONTRIBUTING.md).

For administrative tasks and feature flag management, see [ADMINISTRATION.md](ADMINISTRATION.md).

## Support

- **API Issues**: Check the OpenAPI documentation at `/api-docs`
- **Bug Reports**: Submit via GitHub Issues
- **Security Issues**: Contact maintainers privately
- **Questions**: Use GitHub Discussions
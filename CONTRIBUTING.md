# Contributing Guide

Thank you for your interest in contributing to NeoSynth! This guide will help you understand the project structure and how to contribute effectively.

## Table of Contents

- [Pull Request Process](#pull-request-process)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Module System](#module-system)
- [Experimental Themes](#experimental-themes)
- [Code Quality](#code-quality)
- [Feature Development Workflow](#feature-development-workflow)
- [Getting Help](#getting-help)
- [Release Process](#release-process)

## Pull Request Process

### Before Submitting

1. **Run linting:**
   ```bash
   cd backend && npm run lint
   cd frontend && npm run lint
   ```

2. **Run tests:**
   ```bash
   cd backend && npm test
   ```

3. **Test manually:**
   - Verify your changes work as expected
   - Test with different themes
   - Check mobile responsiveness

### Pull Request Guidelines

- **Clear Description**: Explain what your changes do and why
- **Feature Flags**: New features should be behind feature flags
- **Documentation**: Update relevant documentation
- **Screenshots**: Include screenshots for UI changes
- **Breaking Changes**: Clearly mark any breaking changes

### Commit Message Format

```
type(scope): description

body (optional)

footer (optional)
```

Examples:
- `feat(themes): add hologram theme`
- `fix(playlist): resolve shuffle mode bug`
- `docs(contributing): update module creation guide`

## Development Setup

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (v7 or higher)
- npm or yarn
- Git

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/isolinear-labs/Neosynth
   cd Neosynth
   ```

2. **Install dependencies:**
   ```bash
   cd backend
   npm install
   cd ../frontend
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   # In backend directory, create .env file
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5000
   MONGODB_URI="mongodb://localhost:27017/neosynth"
   COOKIE_SECRET="dev_cookie_secret"
   TOTP_ENCRYPTION_KEY="dev_totp_key"
   ```

4. **Start the development server:**
   ```bash
   cd backend
   npm run dev
   ```

## Project Structure

### Backend (`/backend`)

- `routes/` - API endpoint definitions
- `middleware/` - Express middleware functions
- `models/` - MongoDB/Mongoose data models
- `tests/` - Backend test files
- `server.js` - Main application entry point

### Frontend (`/frontend`)

- `modules/` - Modular feature components
- `cssCustom/` - Custom CSS and theme definitions
- `index.html` - Main application entry point

## Module System

NeoSynth uses a modular architecture where features are organized into self-contained modules.

### Module Structure

Each module in `/frontend/modules/` typically contains:

```
module-name/
├── moduleHandler.js    # Main module logic
├── moduleStyles.css    # Module-specific styles
└── moduleConfig.js     # Configuration (optional)
```

### Creating a New Module

1. **Create module directory:**
   ```bash
   mkdir frontend/modules/my-feature
   ```

2. **Create module handler (`moduleHandler.js`):**
   ```javascript
   /**
    * @feature-flag: my_feature
    * @description: Description of what this feature does
    * @category: ui
    */
   export class MyFeatureModule {
       constructor() {
           this.name = 'MyFeature';
           this.initialized = false;
       }

       async init() {
           // Check feature flag
           if (!featureManager.isEnabled('my_feature')) {
               return;
           }

           this.setupEventListeners();
           this.render();
           this.initialized = true;
       }

       setupEventListeners() {
           // Add event listeners
       }

       render() {
           // Render UI components
       }

       destroy() {
           // Cleanup when module is disabled
           this.initialized = false;
       }
   }
   ```

3. **Create module styles (`moduleStyles.css`):**
   ```css
   /* Module-specific styles */
   .my-feature-container {
       /* Styles that respect theme variables */
       background-color: var(--bg-primary);
       color: var(--text-primary);
   }
   ```

4. **Register the module:**
   Add your module to the main application loader.

### Module Best Practices

- **Feature Flag Integration**: Always check feature flags in your module
- **Theme Compatibility**: Use CSS custom properties for theming
- **Event Cleanup**: Implement proper cleanup in `destroy()` method
- **Performance**: Lazy load modules when possible
- **Documentation**: Include clear JSDoc comments

## Experimental Themes

NeoSynth includes an experimental themes system that allows for testing new themes before they become part of the main theme selector.

### How Experimental Themes Work

Experimental themes are:
- **Feature Flag Controlled**: Only visible when the `experimental_themes` feature flag is enabled
- **Backend Filtered**: The `/api/themes` endpoint filters themes based on feature flags
- **Separate CSS Files**: Located in `/frontend/cssCustom/themes/experimental-*.css`

### Creating an Experimental Theme

1. **Create the theme CSS file:**
   ```bash
   # Create new experimental theme file
   touch frontend/cssCustom/themes/experimental-myTheme.css
   ```

2. **Define theme variables:**
   ```css
   /* Experimental My Theme */
   body.theme-myTheme {
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

3. **Register in backend:**
   Add to `/backend/routes/featureFlags.js` experimental themes array:
   ```javascript
   {
       id: 'myTheme',
       name: 'My Theme Name',
       description: '[EXPERIMENTAL] Description of your theme'
   }
   ```

4. **Add to theme selector:**
   Update `/frontend/modules/themes/themeSelector.js`:
   ```javascript
   // Add to getAvailableThemes() method
   {
       id: 'myTheme',
       name: 'My Theme Name',
       description: '[EXPERIMENTAL] Description of your theme'
   }
   ```

### Experimental Theme Guidelines

- **Prefix**: Always prefix experimental theme files with `experimental-`
- **Description**: Include `[EXPERIMENTAL]` in theme descriptions
- **Testing**: Test thoroughly across all UI components
- **Documentation**: Document the theme's inspiration and color choices
- **Performance**: Ensure theme doesn't impact application performance
- **Accessibility**: Maintain proper contrast ratios for readability

### Promoting Experimental Themes

When an experimental theme is ready for general use:

1. **Move CSS file**: From `experimental-*.css` to main themes location
2. **Update selectors**: Change from `body.theme-name` to standard theme selectors
3. **Remove from experimental array**: Remove from backend experimental themes
4. **Add to main themes**: Add to standard theme arrays
5. **Update documentation**: Remove experimental labels
6. **Archive if needed**: Move previous version to `/frontend/cssCustom/themes/legacy/`

### Legacy Themes

Deprecated themes are archived in `/frontend/cssCustom/themes/legacy/` for reference and potential restoration.

## Code Quality

### Linting

We use ESLint for code quality and consistency.

#### Backend Linting
```bash
cd backend
npm run lint          # Check for issues
npm run lint:fix      # Automatically fix fixable issues
```

#### Frontend Linting
```bash
cd frontend
npm run lint          # Check for issues
npm run lint:fix      # Automatically fix fixable issues
```

#### Cross-Directory Linting
```bash
# From backend directory
npm run lint:frontend  # Lint frontend from backend
```

### Code Style Guidelines

- **JavaScript**: Follow ESLint configuration
- **CSS**: Use meaningful class names and organize by component
- **Comments**: Include JSDoc for functions and classes
- **Variables**: Use descriptive names
- **Functions**: Keep functions small and focused

### Testing

#### Backend Tests
```bash
cd backend
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

#### Writing Tests
- Place test files in `/backend/tests/`
- Use descriptive test names
- Cover both success and error cases
- Test API endpoints thoroughly

## Feature Development Workflow

### Adding a New Feature

1. **Plan the feature:**
   - Define requirements
   - Consider user experience
   - Plan feature flag strategy

2. **Create feature flag:**
   - Use admin interface to create flag
   - Start with disabled/admin-only
   - Plan rollout strategy

3. **Develop feature:**
   - Create module if needed
   - Implement feature logic
   - Add appropriate styling
   - Include feature flag checks

4. **Test thoroughly:**
   - Test with flag enabled/disabled
   - Test different user types
   - Test theme compatibility

5. **Document feature:**
   - Update relevant documentation
   - Include usage examples
   - Document configuration options

### Feature Flag Best Practices

- **Naming**: Use descriptive, lowercase names with underscores
- **Categories**: Choose appropriate category (ui, admin, themes, etc.)
- **Rollout**: Start small and gradually increase
- **Cleanup**: Remove flags when features are stable

## Getting Help

### Resources

- **API Documentation**: See [Development Guide](DEVELOPMENT.md)
- **Feature Flags**: See [Administration Guide](ADMINISTRATION.md)
- **Architecture**: Review existing modules for patterns

### Community

- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Join project discussions for questions
- **Code Review**: Participate in pull request reviews

## Release Process

### Version Numbers

We follow semantic versioning (SemVer):
- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes (backward compatible)

### Changelog

Update `CHANGELOG.md` with:
- New features
- Bug fixes
- Breaking changes
- Deprecations

---

Thank you for contributing to NeoSynth! Your efforts help make this project better for everyone.
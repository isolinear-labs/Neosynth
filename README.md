<div align="center">

# NeoSynth

*A synthwave themed music and video streaming web application that allows users to create, save, and manage playlists. Built with modern features and designed with a neon-infused aesthetic, it provides a unique way to organize and play your media!*

![Demo](demo.png)

---

</div>

## Features

- Stream audio and video files from your local network
- Create and manage multiple playlists
- Shuffle mode with intelligent track selection
- Responsive design for both desktop and mobile
- Multiple themes ready to use
- Feature flag administration system
- Modular features and CSS design allowing easy contributions
- API integration ready
- TOTP support


---

## Quick Start

### Production Deployment

For production deployments using Docker Compose or Kubernetes, see our comprehensive [Deployment Guide](deployments/README.md).

### Development Setup

For local development:

1. **Prerequisites:**
   - Node.js (v16 or higher)
   - MongoDB (v7 or higher)
   - npm or yarn

2. **Clone and install:**
   ```bash
   git clone https://github.com/isolinear-labs/Neosynth
   cd Neosynth
   cd backend && npm install
   ```

3. **Set up environment variables:**
   ```bash
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5000
   MONGODB_URI="mongodb://localhost:27017/neosynth"
   COOKIE_SECRET=$(openssl rand -base64 32)
   TOTP_ENCRYPTION_KEY=$(openssl rand -hex 32)
   ```

4. **Start the application:**
   ```bash
   npm start
   ```

5. **Access:** http://localhost:5000

---

## Documentation

- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute, module system, themes, and development workflow
- **[Administration Guide](ADMINISTRATION.md)** - Feature flag management and user administration
- **[Development Guide](DEVELOPMENT.md)** - API documentation, authentication, and technical details
- **[Deployment Guide](deployments/README.md)** - Docker Compose and Kubernetes deployment instructions

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) to get started.

---

## License

This project is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License - see the [LICENSE](LICENSE) file for details.

**Commercial use is prohibited.** For commercial licensing inquiries, please contact the project maintainer.

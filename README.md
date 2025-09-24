# NeoSynth

![Demo](demo.png)

NeoSynth is a cyberpunk themed music and video streaming web application that allows users to create, save, and manage playlists. Built with a modern features and designed with a neon-infused aesthetic, it provides a unique way to organize and play your media!

## Features

- Play audio and video files from network locations / storage
- Create and manage multiple playlists
- Shuffle mode with intelligent track selection
- Responsive design for both desktop and mobile
- Multiple themes ready to use
- Modular design to allow easy implementation of features and themes

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Generate Production Secrets

```bash
# Generate TOTP encryption key (32 bytes = 64 hex chars)
node -e "console.log('TOTP_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate cookie secret (32+ characters)
node -e "console.log('COOKIE_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"
```

### Set Up Environment Variables
```bash
NODE_ENV=production                    # You can set NODE_ENV=development instad to lower security 
                                       # protocols for local testing
FRONTEND_URL=http://myNeoSythURL:5000  # Default is http://localhost:5000
MONGODB_URI="mongodb://myMongoURI:27017/neosynth"
COOKIE_SECRET=mySuperSecretCookieSecretGeneratedAbove
TOTP_ENCRYPTION_KEY="mySuperSecretTOTPEnncryptionKeyGeneratedAbove"
```


### Installation

1. Clone the repository:
   ```
   git clone gh repo clone isolinear-labs/Neosynth
   cd Neosynth
   ```

2. Install dependencies:
   ```
   cd backend
   npm install
   ```

3. Start the application:
   ```
   cd backend
   npm start
   ```

4. Access the application at `http://localhost:5000` (Or what was set in the FRONTEND_URL env variable)

### Docker Compose

```docker
version: '3.8'

services:
  neosynth:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - FRONTEND_URL=http://localhost:5000
      - MONGODB_URI=mongodb://mongodb:27017/neosynth
      - COOKIE_SECRET=your_super_secret_cookie_secret_here
      - TOTP_ENCRYPTION_KEY=your_super_secret_totp_encryption_key_here
    depends_on:
      - mongodb
    networks:
      - neosynth-network

  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    networks:
      - neosynth-network

volumes:
  mongodb_data:

networks:
  neosynth-network:
    driver: bridge
```

### Kubernetes Deployment

Docs coming soon...

## Contributing

Docs coming soon...

## License

This project is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License - see the [LICENSE](LICENSE) file for details.

**Commercial use is prohibited.** For commercial licensing inquiries, please contact the project maintainer.
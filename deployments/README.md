# Deployment

Choose your deployment method:

- **[Docker Compose](#docker-compose)** - Quick local setup or simple production deployment
- **[Kubernetes](#kubernetes-deployment)** - Scalable production deployment with orchestration

## Prerequisites

### Generate Production Secrets

**Important**: Generate secure secrets before deployment:

```bash
# Using OpenSSL (recommended)
COOKIE_SECRET=$(openssl rand -base64 32)
TOTP_ENCRYPTION_KEY=$(openssl rand -hex 32)
```

Alternative using Node.js:
```bash
# Generate TOTP encryption key (32 bytes = 64 hex chars)
node -e "console.log('TOTP_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate cookie secret (32+ characters)
node -e "console.log('COOKIE_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"
```

### Environment Variables

- `NODE_ENV` - Set to `production` for production deployment
- `FRONTEND_URL` - The URL where the frontend will be accessible
- `MONGODB_URI` - Connection string for MongoDB database
- `COOKIE_SECRET` - Secret key for cookie encryption (generate using command above)
- `TOTP_ENCRYPTION_KEY` - Secret key for TOTP encryption (generate using command above)

## Docker Compose

To run Neosynth using Docker Compose:

```yaml
version: '3.8'

services:
  neosynth:
    image: ghcr.io/isolinear-labs/neosynth:latest
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
    volumes:
      - mongodb_data:/data/db
    networks:
      - neosynth-network

volumes:
  mongodb_data:

networks:
  neosynth-network:
```

## Setup Instructions

### 1. Deploy

1. Save the docker-compose configuration above as `docker-compose.yml`
2. Replace `COOKIE_SECRET` and `TOTP_ENCRYPTION_KEY` with the generated values
3. Run: `docker-compose up -d`
4. Access the application at http://localhost:5000

## Data Persistence

MongoDB data is persisted using a Docker volume (`mongodb_data`), ensuring your data survives container restarts.

## Kubernetes Deployment

For Kubernetes deployments, use the provided `kubernetes.yaml` template:

### Prerequisites

- Kubernetes cluster (1.19+)
- kubectl configured
- Ingress controller (optional, for external access)

### Setup Instructions

1. **Use the secrets generated in Prerequisites above**

2. **Update configuration:**
   - Edit `kubernetes.yaml`
   - Replace `your-domain.com` with your actual domain
   - Update the secret values with generated keys

3. **Deploy:**
   ```bash
   kubectl apply -f kubernetes.yaml
   ```

4. **Access the application:**
   - Internal: `http://neosynth-service.neosynth.svc.cluster.local:5000`
   - External: Configure your domain to point to the ingress controller

### Configuration Notes

- **Storage**: Uses a 10GB PersistentVolumeClaim for MongoDB data
- **Resources**: Each service limited to 500m CPU and 512Mi memory
- **Health checks**: Configured on `/health` endpoint
- **Namespace**: All resources deployed in `neosynth` namespace
- **TLS**: Ingress configured for HTTPS (requires cert-manager or manual certificate setup)

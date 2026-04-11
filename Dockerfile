FROM node:22-alpine

# Optional build-time overrides — pass with:
#   docker build --build-arg APP_VERSION=1.2.3 --build-arg BUILD_STATUS=$(git rev-parse --short HEAD) ...
ARG APP_VERSION
ARG BUILD_STATUS

# Add container labels for GitHub Container Registry
LABEL org.opencontainers.image.source="https://github.com/isolinear-labs/Neosynth"
LABEL org.opencontainers.image.description="NeoSynth - A cyberpunk-themed music and video stream application."
LABEL org.opencontainers.image.licenses="CC-BY-NC-SA-4.0"

# Create app directories with clear absolute paths
WORKDIR /app

# Copy package files
COPY backend/package*.json /app/backend/
RUN cd /app/backend && npm install

# Copy application code
COPY backend/ /app/backend/
COPY frontend/ /app/frontend/

# Stamp constants.js with build-time values if supplied
RUN if [ -n "$APP_VERSION" ]; then \
        sed -i "s/export const VERSION = '[^']*'/export const VERSION = '$APP_VERSION'/" /app/frontend/constants.js; \
    fi && \
    if [ -n "$BUILD_STATUS" ]; then \
        sed -i "s/export const BUILD_STATUS = '[^']*'/export const BUILD_STATUS = '$BUILD_STATUS'/" /app/frontend/constants.js; \
    fi

# Validate the frontend content is copied correctly
RUN ls -la /app/frontend

# Expose port for application
EXPOSE 5000

# Start the application using an absolute path
CMD ["node", "/app/backend/server.js"]

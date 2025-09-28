FROM node:22-alpine

# Add container labels for GitHub Packages and multi-arch support
LABEL org.opencontainers.image.description="NeoSynth - A cyberpunk-themed music and video stream application."
LABEL org.opencontainers.image.title="NeoSynth"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/isolinear-labs/Neosynth"
LABEL org.opencontainers.image.licenses="CC-BY-NC-SA-4.0"

# Create app directories with clear absolute paths
WORKDIR /app

# Copy package files
COPY backend/package*.json /app/backend/
RUN cd /app/backend && npm install

# Copy application code
COPY backend/ /app/backend/
COPY frontend/ /app/frontend/

# Validate the frontend content is copied correctly
RUN ls -la /app/frontend

# Expose port for application
EXPOSE 5000

# Start the application using an absolute path
CMD ["node", "/app/backend/server.js"]

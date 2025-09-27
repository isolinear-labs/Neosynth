FROM node:22-alpine

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
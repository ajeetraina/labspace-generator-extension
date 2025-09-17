# Multi-stage build for Docker Desktop Extension
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY public/ ./public/

# Build the React frontend
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy backend source
COPY src/server.js ./
COPY src/templates/ ./templates/

# Create necessary directories
RUN mkdir -p /tmp && chmod 777 /tmp

# Install additional tools that might be needed
RUN apk add --no-cache \
    git \
    curl \
    bash

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "server.js"]
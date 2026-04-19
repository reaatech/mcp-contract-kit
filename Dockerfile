# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files and install production deps only
COPY package.json package-lock.json ./
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# Copy built files from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Switch to non-root user
USER nodejs

# Entry point
ENTRYPOINT ["node", "dist/src/cli.js"]
CMD ["--help"]

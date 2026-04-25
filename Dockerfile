# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
# Copy any other necessary files (like schemas or static assets if you have any)

# Create a non-root user for security
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
USER nextjs

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["node", "dist/server.js"]

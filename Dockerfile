# Universal Dockerfile for a Node.js Monorepo

# ARG to specify which service this build is for.
# This will be passed from docker-compose.yml.
ARG SERVICE_NAME

# --- STAGE 1: Builder ---
# This stage builds the application and installs all dependencies.
FROM node:18-alpine AS builder
WORKDIR /app

# Copy the root package.json and lock file
# This assumes you have a package.json in the root of your project.
COPY package*.json ./

# Install all dependencies for the entire monorepo
RUN npm install

# Copy the source code for all services
COPY ./apps ./apps
# Copy any shared libraries if they exist at the root
COPY ./libs ./libs


# --- STAGE 2: Production ---
# This stage creates the final, lean image for a single service.
FROM node:18-alpine

WORKDIR /app

# Copy package files from the builder stage
COPY package*.json ./

# Install ONLY production dependencies to keep the image small
# If you have a build step, you might need dev dependencies. In that case, use `npm install`.
RUN npm install --omit=dev

# Copy the applications' source code and shared libs from the builder stage
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/libs ./libs


# Re-declare the ARG so it can be used in this stage
ARG SERVICE_NAME

# Create a non-root user for better security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expose a default port. The actual mapping is in docker-compose.yml.
EXPOSE 8080

# The command to start the specific service.
# This assumes you have start scripts in your root package.json,
# for example: "start:api-gateway": "node apps/api-gateway/src/index.js"
CMD sh -c "npm run start:${SERVICE_NAME}"


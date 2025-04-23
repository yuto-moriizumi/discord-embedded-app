# Use Node.js 22 slim as the base image
FROM node:22-slim AS base
# Enable corepack to manage pnpm (recommended way)
RUN corepack enable
# Set pnpm home directory for caching
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# --- Builder Stage ---
FROM base AS builder
WORKDIR /app

# Copy manifests first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/server/package.json ./packages/server/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies using cache mount
# Filter for the server and its dependencies to potentially reduce install size/time
# Note: Installing all might be simpler if filtering causes issues, but filtering is generally better.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter discord-counter-server...

# Copy the rest of the source code
COPY packages/server/ ./packages/server/
COPY packages/shared/ ./packages/shared/

# Build the server package and its dependencies (shared)
RUN pnpm --filter discord-counter-server... build

# Prepare the server package for deployment into /prod/server
# This copies only production dependencies and necessary files
RUN pnpm deploy --filter=discord-counter-server --prod /prod/server

# --- Production Stage ---
FROM base AS production
WORKDIR /app

# Copy the deployed server package from the builder stage
COPY --from=builder /prod/server /app

# Expose the port the app runs on (assuming 3000)
EXPOSE 3000

# Define the command to run the application using pnpm start from the deployed package
CMD ["pnpm", "start"]

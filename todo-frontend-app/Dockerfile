# -------- Base deps image --------
FROM node:20-alpine AS deps
WORKDIR /app
# Install libc6-compat for some native modules
RUN apk add --no-cache libc6-compat
# Install dependencies (use npm ci if lockfile exists)
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# -------- Builder image --------
FROM node:20-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production
# Build-time configurable public GraphQL endpoint
ARG NEXT_PUBLIC_GRAPHQL_ENDPOINT
ENV NEXT_PUBLIC_GRAPHQL_ENDPOINT=$NEXT_PUBLIC_GRAPHQL_ENDPOINT

COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build the Next.js app
RUN npm run build

# -------- Runner image --------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Runtime port/envs
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Optional: allow overriding at runtime (only affects server code, public envs are baked at build)
ENV NEXT_PUBLIC_GRAPHQL_ENDPOINT=${NEXT_PUBLIC_GRAPHQL_ENDPOINT}

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Copy standalone server output
COPY --from=builder /app/.next/standalone ./
# Copy Next.js static assets
COPY --from=builder /app/.next/static ./.next/static
# Copy public assets only if present
# (Most apps have /public, but if missing it's safe to skip)
# Commented to avoid build failure when absent
# COPY --from=builder /app/public ./public
# Copy app fonts (if used outside standalone tracing)
# Comment if not needed
# COPY --from=builder /app/app/fonts ./app/fonts

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"] 
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Build arguments for Next.js public environment variables
# These get inlined at build time into the JavaScript bundle
# Override these with --build-arg when building for production:
#   docker build --build-arg NEXT_PUBLIC_SOCKET_URL=https://your-domain.com ...
ARG NEXT_PUBLIC_SOCKET_URL=https://test-asistant-ai-be.dnext-pia.com
ARG NEXT_PUBLIC_KEYCLOAK_URL=https://diam.dnext-pia.com
ARG NEXT_PUBLIC_KEYCLOAK_REALM=orbitant-realm
ARG NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=orbitant-ui-client
ARG NEXT_PUBLIC_API_URL=https://test-asistant-ai-be.dnext-pia.com

# Server-side environment variables for build process (Next.js bakes these at build time)
ARG KEYCLOAK_CLIENT_SECRET
ARG KEYCLOAK_CLIENT_ISSUER
ARG NEXTAUTH_SECRET
ARG NEXTAUTH_URL
ARG API_URL

# Set environment variables for build process
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_KEYCLOAK_URL=$NEXT_PUBLIC_KEYCLOAK_URL
ENV NEXT_PUBLIC_KEYCLOAK_REALM=$NEXT_PUBLIC_KEYCLOAK_REALM
ENV NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=$NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ENV KEYCLOAK_CLIENT_ID=$NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
ENV KEYCLOAK_CLIENT_SECRET=$KEYCLOAK_CLIENT_SECRET
ENV KEYCLOAK_CLIENT_ISSUER=$KEYCLOAK_CLIENT_ISSUER
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV API_URL=$API_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Runtime environment variables for server-side code (can be overridden at container run)
ENV API_URL=http://localhost:8093

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

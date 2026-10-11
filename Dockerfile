# ========================================================
# Stage 1: Build Astro static site and prepare assets
# ========================================================
FROM node:24-alpine AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.10.1 --activate

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy sources and build static bundle
COPY . .
ENV NODE_ENV=production
RUN pnpm build

# ========================================================
# Stage 2: Node API Runner
# ========================================================
FROM node:24-alpine AS api

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.10.1 --activate

ENV NODE_ENV=production
ENV PORT=3000
ENV SQLITE_PATH=/data/tower.sqlite

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY api ./api
COPY src/data ./src/data
COPY tsconfig.json ./

RUN mkdir -p /data

EXPOSE 3000
VOLUME ["/data"]

CMD ["pnpm", "api:start"]

# ========================================================
# Stage 3: Caddy Web Server
# ========================================================
FROM caddy:2-alpine AS web

COPY --from=builder /app/dist /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
EXPOSE 443

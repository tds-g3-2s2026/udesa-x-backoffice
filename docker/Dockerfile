# Stage 1: Base & Dependencies
FROM oven/bun:alpine AS base
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Stage 2: Development
FROM base AS dev
WORKDIR /app
COPY . .
EXPOSE 5173
CMD ["bun", "run", "dev", "--host", "0.0.0.0"]

# Stage 3: Builder
FROM base AS builder
WORKDIR /app
COPY . .
RUN bun run build

# Stage 4: Production (Nginx)
FROM nginx:alpine AS runner
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

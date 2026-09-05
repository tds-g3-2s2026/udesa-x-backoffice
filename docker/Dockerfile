# Stage 1: Base & Dependencies
# The version is pinned and mirrored in .bun-version, which is what the CI reads
# for the lint job: a moving tag means testing on a runtime nobody chose.
FROM oven/bun:1.4.0 AS base
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Stage 2: Development
FROM base AS dev
WORKDIR /app
COPY . .
EXPOSE 5173
CMD ["bun", "run", "dev", "--host", "0.0.0.0"]

# Tests only. Sits before the build stages because `docker build` without
# --target builds the last one, and that has to be the served image.
FROM base AS test
WORKDIR /app
COPY . .

# Nothing here needs root, and the image already ships a uid 1000.
RUN chown -R bun:bun /app
USER bun

CMD ["bun", "run", "test:ci"]

# Stage 3: Builder
FROM base AS builder
WORKDIR /app
COPY . .
RUN bun run build

# Stage 4: Production (Nginx)
FROM nginx:1.29-alpine AS runner
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80

# wget and not curl: the alpine image ships busybox. 127.0.0.1 and not localhost:
# that resolves to ::1 first and nginx only listens on IPv4.
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

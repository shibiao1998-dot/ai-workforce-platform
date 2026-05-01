FROM node:20-alpine AS base

FROM base AS builder
RUN apk add --no-cache python3 make g++ file
WORKDIR /app
# COPY 整个项目(含 node_modules — 包含内网私有包 @sdp.nd/*,容器内无法单独取)
COPY . .
# 补齐 linux-x64-musl 架构的 optional native 包(本地是 macOS arm64)
# 注意不要用 --omit=dev,那会误删 @tailwindcss/postcss 等 devDep
RUN npm install --no-save --force \
    lightningcss-linux-x64-musl@1.32.0 \
    @tailwindcss/oxide-linux-x64-musl@4.2.2 \
    @napi-rs/simple-git-linux-x64-musl 2>&1 | tail -10 || true
# 强制源码编译 better-sqlite3 为 Alpine/musl 二进制，避免拉到 glibc prebuild。
RUN rm -rf node_modules/better-sqlite3/build && \
    npm rebuild better-sqlite3 --build-from-source
RUN file node_modules/better-sqlite3/build/Release/better_sqlite3.node 2>&1 | head -2
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN mkdir -p /app/data && chown nextjs:nodejs /app/data
COPY --from=builder --chown=nextjs:nodejs /app/local.db /app/data/local.db
ENV DATABASE_PATH=/app/data/local.db

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN corepack enable && pnpm install --frozen-lockfile
COPY client ./client
RUN pnpm --filter @prism/client build

FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN corepack enable && pnpm install --frozen-lockfile --prod

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S prism && adduser -S prism -G prism && mkdir -p /data && chown -R prism:prism /data
COPY --from=dependencies --chown=prism:prism /app/node_modules ./node_modules
COPY --from=dependencies --chown=prism:prism /app/server/node_modules ./server/node_modules
COPY --chown=prism:prism server ./server
COPY --chown=prism:prism packages ./packages
COPY --from=build --chown=prism:prism /app/client/dist ./client/dist
USER prism
EXPOSE 4100
WORKDIR /app/server
CMD ["node", "src/index.js"]

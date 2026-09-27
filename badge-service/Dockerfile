FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY badge-service/package.json badge-service/package.json
COPY server/package.json server/package.json
COPY client/package.json client/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN pnpm install --frozen-lockfile
COPY badge-service badge-service
RUN pnpm --filter @prism/badge-service build
RUN addgroup -S prism && adduser -S prism -G prism
USER prism
WORKDIR /app/badge-service
EXPOSE 3000
CMD ["pnpm", "start"]

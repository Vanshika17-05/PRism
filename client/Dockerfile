FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN pnpm install --frozen-lockfile
COPY client client
COPY packages packages
RUN pnpm --filter @prism/client build
RUN addgroup -S prism && adduser -S prism -G prism
USER prism
EXPOSE 5173
CMD ["pnpm", "--filter", "@prism/client", "preview", "--port", "5173"]

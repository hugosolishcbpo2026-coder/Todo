FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --filter @todo/api... --prod=false
COPY packages packages
COPY apps/api apps/api
RUN pnpm --filter @todo/api build
CMD ["node", "apps/api/dist/apps/api/src/main.js"]

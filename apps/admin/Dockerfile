FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/admin/package.json apps/admin/package.json
RUN pnpm install --filter @todo/admin... --prod=false
COPY packages packages
COPY apps/admin apps/admin
RUN pnpm --filter @todo/admin build
CMD ["pnpm", "--filter", "@todo/admin", "start"]


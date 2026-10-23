FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@12.15.0

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json .npmrc* ./
COPY packages/domain/package.json ./packages/domain/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile || pnpm install

COPY packages/domain ./packages/domain
COPY apps/api ./apps/api

RUN pnpm --filter @aidflow/domain build && pnpm --filter @aidflow/api build

FROM node:22-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm@12.15.0

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/domain/dist ./packages/domain/dist
COPY --from=builder /app/packages/domain/package.json ./packages/domain/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

EXPOSE 3000

ENV PORT=3000

CMD ["node", "apps/api/dist/main.js"]

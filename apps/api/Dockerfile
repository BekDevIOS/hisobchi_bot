FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY prisma prisma
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @hisobchi/api prisma:generate
COPY . .
RUN pnpm --filter @hisobchi/api build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]

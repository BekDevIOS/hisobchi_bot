FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/bot/package.json apps/bot/package.json
RUN pnpm install --frozen-lockfile=false
COPY . .
RUN pnpm --filter @hisobchi/bot build
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/bot/dist ./apps/bot/dist
COPY --from=build /app/apps/bot/package.json ./apps/bot/package.json
EXPOSE 3001
CMD ["node", "apps/bot/dist/main.js"]

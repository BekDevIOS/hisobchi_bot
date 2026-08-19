# Hisobchi Bot

Hisobchi is a Telegram personal-finance MVP for UZS, KRW, and USD. It has a Telegraf bot, a Telegram Mini App, and a NestJS REST API backed by PostgreSQL. The API owns all finance rules; the bot and web client are adapters.

## Architecture

`Telegram Bot -> NestJS API -> Prisma/PostgreSQL` and `Mini App -> NestJS API`. Redis is provisioned for future rate limiting/conversation state but normal financial data stays in PostgreSQL. Money is stored as `Decimal(20,4)` and dashboard totals are always grouped by currency; no exchange-rate conversion is performed.

## Local setup

Requirements: Node.js 22+, pnpm 9+, Docker Desktop, and a Telegram bot token for bot integration.

```bash
copy .env.example .env
pnpm install
docker compose up -d postgres redis
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
```

The API is available at `http://localhost:3000`, the Mini App at `http://localhost:5173`, and health at `/health`. Open the Mini App from Telegram for real server-side `initData` authentication; the web app intentionally does not trust `initDataUnsafe`.

## Environment

Copy `.env.example` to `.env`. Set `DATABASE_URL`, a long random `JWT_SECRET`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_WEBHOOK_SECRET`. `AI_ENABLED=false` is a supported default. If enabled, configure `GEMINI_API_KEY` and implement/enable the provider in `apps/api/src/ai/ai.service.ts`; AI output must continue through Zod and transaction business validation.

## Database

```bash
pnpm prisma:migrate       # development migration
pnpm prisma:seed          # idempotent system categories
pnpm --filter @hisobchi/api prisma:migrate:deploy # deployment
```

## Development commands

```bash
pnpm dev
pnpm build
pnpm test
pnpm lint
```

Critical tests cover parser inputs, Decimal-safe balance rules, currency separation, validation, and ownership checks.

## Telegram setup

Create a bot with BotFather and set `TELEGRAM_BOT_TOKEN`. For local development the bot uses long polling. `/start` asks for a currency and creates `Main Account` only after selection. Users can then send `-45000 tushlik`, `+5000000 oylik`, `coffee 5500 won`, or `kecha 35 ming tushlik`. `/balance`, `/history`, `/accounts`, and `/help` are supported.

For production, set `BOT_MODE=webhook`, `PUBLIC_API_URL=https://api.example.com`, and configure `TELEGRAM_WEBHOOK_SECRET`. The bot process registers `https://api.example.com/telegram/webhook`; Nginx proxies that path to the bot and all other API paths to NestJS.

## Mini App setup

Set the BotFather Mini App URL to `https://app.example.com`. The Mini App sends Telegram `initData` to `POST /auth/telegram`. The server validates the Telegram HMAC using the bot token and returns a short-lived JWT. Screens include Dashboard, Transactions, Accounts, and Settings.

## Docker and Nginx

```bash
docker compose up -d --build
```

Compose runs PostgreSQL with a persistent volume, Redis, API, bot, web, and Nginx. Replace the placeholder `app.example.com` and `api.example.com` in `nginx/nginx.conf`, then add TLS certificates. The ACME challenge path is already reserved for Certbot. In production, set `API_URL`/`PUBLIC_API_URL` to the real HTTPS URLs and use strong secrets.

## Backups

Run from the deployment host (or inside the Postgres container):

```bash
POSTGRES_PASSWORD='...' docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" --format=custom "$POSTGRES_DB" > backups/hisobchi-$(date -u +%Y%m%dT%H%M%SZ).dump
```

Alternatively use `chmod +x scripts/backup-db.sh && ./scripts/backup-db.sh` with `PGHOST`, `PGDATABASE`, `PGUSER`, and `PGPASSWORD` set. Schedule it with cron, for example `0 3 * * * cd /srv/hisobchi-bot && ./scripts/backup-db.sh`. Retention is intentionally not automated; choose and document a retention policy before adding cleanup.

## Troubleshooting

- `JWT_SECRET` or `DATABASE_URL` errors: check `.env` is loaded by the process.
- Empty categories: run `pnpm prisma:seed`.
- Mini App auth error: open it inside Telegram and verify the bot token and server time.
- Bot cannot reach API in Compose: use `API_URL=http://api:3000` inside the bot container, while `PUBLIC_API_URL` is the public webhook URL.

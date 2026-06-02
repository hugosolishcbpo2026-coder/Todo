# Todo Ride Platform

Todo is a driver-first ride platform for a controlled city launch.

Core rules:

- Drivers keep 100% of ride earnings.
- Drivers pay a 100 MXN daily membership, with an optional discounted monthly plan.
- Expired memberships block ride acceptance.
- Riders see transparent prices.
- WhatsApp Business Platform is the primary communication channel.

## What This Starter Includes

- NestJS-style API architecture in `apps/api`
- Next.js admin dashboard in `apps/admin`
- React Native Expo shells for rider and driver apps
- Shared TypeScript contracts in `packages/shared`
- PostgreSQL schema in `infra/postgres/schema.sql`
- Docker Compose for API, admin, Postgres, and Redis
- GitHub-first project workflow, CI, issue templates, and environment templates
- Google-account storage plan for documents, backups, exports, and operating memory

## Quick Start

```bash
corepack pnpm@9.12.3 install
corepack pnpm@9.12.3 dev
```

Or with Docker:

```bash
docker compose up --build
```

Services:

- API: `http://localhost:4000`
- Admin: `http://localhost:3000`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

## MVP Launch Recommendation

Start in one city with 50-100 verified drivers, cash plus card payments, and hands-on support. Tune dispatch, GPS quality, and support workflows before expanding.

## GitHub-Only Operating Model

Todo does not require AWS or any cloud deployment plan in this starter. GitHub is used for:

- source code
- CI checks
- releases
- project issues
- bug reports
- feature requests
- documentation

Runtime stays local or self-hosted with Docker Compose. Your Google account can be used for driver documents, backups, exports, and operating memory files.

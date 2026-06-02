# GitHub Operating Plan

Todo is managed on GitHub without an AWS/cloud deployment plan.

## GitHub Responsibilities

- Repository source control
- Pull requests and code review
- GitHub Actions CI
- Issues for product and engineering tasks
- Releases for packaged MVP versions
- Documentation for operations and support

## Local Runtime

Use Docker Compose for the full local system:

```bash
docker compose up --build
```

This starts:

- API on `http://localhost:4000`
- Admin dashboard on `http://localhost:3000`
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

## Branching

- `main`: stable code only
- `develop`: integration branch
- `feature/*`: product features
- `fix/*`: bug fixes
- `release/*`: release preparation

## Required Pull Request Checks

- `corepack pnpm@9.12.3 typecheck`
- `corepack pnpm@9.12.3 build`
- `corepack pnpm@9.12.3 test`

## Release Process

1. Create a GitHub release from `main`.
2. Attach release notes.
3. Tag the release, for example `v0.1.0`.
4. Run the local/self-hosted runtime from the tagged source.

## No Hosted Infrastructure

This plan intentionally avoids AWS, hosted databases, managed Redis, and cloud deployment infrastructure. Your Google account can be used for file storage and operational memory. Third-party product APIs such as WhatsApp Business Platform, Google Maps, and Stripe still require their own external accounts if used in production.

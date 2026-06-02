# Google Account Storage Plan

Todo uses your Google account for storage and operating memory instead of AWS/S3.

## What Goes In Google Drive

- Driver documents
- Vehicle verification photos
- Support exports
- Daily operation notes
- Manual database backups
- Release artifacts
- Admin reports
- Fraud review packets

## What Stays Local

- Live ride records
- User accounts
- Driver membership state
- Payments ledger
- Realtime driver GPS state
- Dispatch queues

These stay in local/self-hosted PostgreSQL and Redis because ride dispatch needs fast structured data and reliable realtime state.

## Suggested Drive Folder Layout

```text
Todo Platform/
  Documents/
    Drivers/
    Vehicles/
    Insurance/
  Backups/
    Postgres/
    Redis snapshots/
  Exports/
    Payments/
    Rides/
    Support/
  Memory/
    Launch notes/
    SOPs/
    Incident reviews/
```

## Environment Variables

```bash
GOOGLE_ACCOUNT_EMAIL=
GOOGLE_DRIVE_ROOT_FOLDER_ID=
GOOGLE_DRIVE_DOCUMENTS_FOLDER_ID=
GOOGLE_DRIVE_BACKUPS_FOLDER_ID=
GOOGLE_DRIVE_EXPORTS_FOLDER_ID=
GOOGLE_STORAGE_MODE=manual
```

## Storage Modes

- `manual`: operators upload/download files through Google Drive.
- `connector`: app integration uses an authorized Google Drive connector.
- `service_account`: backend uses Google APIs with credentials you control.

For the MVP, start with `manual`. It is simpler, safer, and enough for a controlled launch.

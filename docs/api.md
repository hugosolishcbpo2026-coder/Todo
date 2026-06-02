# API Routes

Base path: `/api/v1`

## Auth

- `POST /auth/otp/request`
- `POST /auth/otp/verify`
- `GET /auth/me`

## Rider

- `POST /rides/estimate`
- `POST /rides`
- `GET /rides/:id`
- `POST /rides/:id/cancel`
- `GET /riders/me/history`
- `POST /riders/me/favorites`

## Driver

- `POST /drivers/onboarding`
- `POST /drivers/documents`
- `PATCH /drivers/me/online`
- `POST /drivers/me/location`
- `GET /drivers/me/earnings`
- `POST /drivers/me/membership/checkout`
- `POST /rides/:id/accept`
- `POST /rides/:id/arriving`
- `POST /rides/:id/start`
- `POST /rides/:id/complete`

## Admin

- `GET /admin/live`
- `GET /admin/drivers`
- `PATCH /admin/drivers/:id/verification`
- `GET /admin/rides`
- `PATCH /admin/rides/:id/dispatch`
- `GET /admin/payments`
- `GET /admin/support-tickets`
- `GET /admin/fraud-events`
- `POST /admin/suspensions`

## Webhooks

- `POST /webhooks/stripe`
- `GET /webhooks/whatsapp`
- `POST /webhooks/whatsapp`


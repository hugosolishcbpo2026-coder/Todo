# Architecture

## System Shape

Todo is a modular platform with four client surfaces:

- Rider mobile app
- Driver mobile app
- Admin CRM dashboard
- WhatsApp support and notification channel

The backend is organized into domain modules:

- Auth: OTP, JWT, roles, permissions
- Riders: profiles, favorite locations, history
- Drivers: onboarding, documents, verification, online status, membership
- Rides: pricing, matching, lifecycle, tracking
- Payments: memberships, rider payments, payouts, refunds
- Notifications: WhatsApp, push, SMS fallback
- Admin: operations, dispatch override, analytics, fraud, support

## Realtime

Socket.IO rooms:

- `ride:{rideId}` for rider and assigned driver updates
- `driver:{driverId}` for driver-specific offers and alerts
- `admin:live-map` for operational monitoring

Redis stores short-lived driver location and dispatch offer state. PostgreSQL remains the source of truth for rides, payments, users, memberships, and audit records.

## Dispatch Eligibility

A driver can receive offers only when:

- status is `approved`
- membership status is `active`
- membership expiration is in the future
- driver is online
- last GPS point is fresh
- no active accepted ride exists

Matching score weighs:

- nearest driver
- active membership
- acceptance rate
- rating
- ETA

## WhatsApp Business Platform

Use Meta's official WhatsApp Business Platform Cloud API for:

- rider ride updates
- driver membership reminders
- support ticket creation and continuation
- payment confirmations

Production integration should use approved message templates for outbound notifications and webhook verification for inbound messages.


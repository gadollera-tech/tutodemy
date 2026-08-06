# Backend and Marketplace Roadmap

## Current release — Supabase marketplace foundation

Included in this package:

- email/password authentication
- optional Google sign-in configuration
- learner/parent and tutor account roles
- tutor onboarding and private verification-document storage
- administrator approval and suspension workflow
- public approved-tutor directory
- tutor schedules, modes, locations, rates, and profiles
- booking requests and tutor responses
- manual payment confirmation by an administrator
- session-delivery confirmation
- booking completion and commission ledger
- verified reviews after completed bookings
- tutor tier calculation for 10%, 15%, and 12% commission rates
- Row Level Security policies and controlled database functions

## Launch payment workflow

Payment collection and tutor payouts are manual in this release. The website records payment confirmation, booking completion, platform commission, and tutor net earnings only after the administrator verifies the transaction.

Do not present this release as automated checkout or automated payout.

## Next release — automated marketplace payments

A secure automated payment release should include:

1. server-created checkout session or payment intent
2. signed payment-provider webhook verification
3. idempotent payment-status updates
4. refund and dispute records
5. marketplace/platform fee calculation on the server
6. tutor payout or connected-account workflow
7. reconciliation and audit logs
8. retry and failure handling
9. tax and invoicing requirements

Browser-only JavaScript must not decide whether a payment succeeded.

## Additional recommended releases

### Operations and safeguarding

- tutor verification checklist and expiry tracking
- complaint and incident workflow
- learner safeguarding rules
- no-show, late-cancellation, and refund policies
- moderation and account appeals

### Administration

- internal reports and exports
- payment reconciliation dashboard
- tutor-document review history
- account deletion and retention tooling
- content and booking audit trails

### Learning system

- DOST-SEI cross-device attempt synchronization
- secure Premium entitlements
- reviewer content management
- accessibility audit and learner accommodations

### Scaling

- server-side search and pagination for large tutor directories
- email and in-app notifications
- calendar integration
- rate limiting and abuse monitoring
- backup, recovery, and incident-response procedures

# Backend and Form Integration Roadmap

## Phase 1 — Static GitHub Pages

Working now:

- Question randomization
- Timer
- Scoring
- Local attempt history
- Local Premium preview
- Tutor directory
- Local inquiry demonstration

## Phase 2 — Google Forms or Apps Script

Suitable for:

- Tutor inquiries
- Tutor applications
- Resource requests
- Error reports
- Mailing-list registration

### Easiest method

Embed a Google Form using its iframe code.

### Custom branded method

Send the custom HTML form to a Google Apps Script web app and store responses in Google Sheets.

Never collect sensitive information that is unnecessary for matching or communication.

## Phase 2.5 — Supabase account layer included in this package

Ready to activate after project setup:

- Email/password authentication
- Optional Google OAuth
- Learner profiles
- Saved progress and cross-device attempt history
- Saved reviewers
- Active exam synchronization
- Tutor inquiry records
- Row Level Security policies

See `SUPABASE-SETUP-GUIDE.md` and `SUPABASE-SCHEMA.sql`.

## Phase 3 — Expanded application backend

Still recommended later:

- Private file uploads
- Secure Premium entitlements
- Tutor availability and bookings
- Admin content workflow
- Account deletion and data-retention tooling
- Parent, tutor, and administrator roles

Possible platforms:

- Supabase
- Firebase
- A custom server and database

## Phase 4 — Payments

A real paywall requires:

1. authenticated user
2. checkout session
3. signed payment webhook
4. subscription record
5. server-side authorization
6. protected data delivery

The local Premium switch is not secure.

## Phase 5 — Tutor scheduling

Add:

- verified tutor roster
- available time blocks
- booking requests
- confirmation and cancellation
- payment policy
- learner safeguarding
- session notes and assignments

# TutoDemy Learning PH — Marketplace Release 1.0

Release date: 2026-08-06

## Added

- learner/parent and tutor account-role selection
- tutor onboarding with public profile, schedule, location, teaching mode, rates, photo, and private verification documents
- administrator approval before public tutor listing
- approved-only tutor directory and detailed tutor profiles
- learner booking requests and tutor accept/decline workflow
- tutor and learner booking dashboards
- manual administrator payment confirmation
- delivered-session and completed-booking workflow
- commission ledger and tutor earnings dashboard
- verified reviews for completed bookings
- secure administrator console backed by Supabase authorization
- public-safe database views that exclude tutor contact email, verification details, learner IDs, and booking IDs
- 10% Founding, 15% Regular, and 12% High-Volume/Top-Rated commission tiers
- final Practice Hubs and Tutor Connect navigation
- Terms, Privacy Notice, tutor policy, sitemap, manifest, icons, and deployment documentation

## Learning content

- 880 approved UPCAT/general CET practice questions
- 1,700 approved DOST-SEI-style practice questions
- 2,580 approved original questions in total

## Current operational model

Payments are not collected or split automatically. The administrator confirms payment manually, the tutor marks the session delivered, and the administrator completes the booking before commission is recorded.

## Required before live launch

- run the Supabase installer
- add the administrator account
- test the full workflow with separate learner, tutor, and administrator accounts
- configure `tutodemy.net`, HTTPS, and Supabase redirects
- publish real support details and operational policies
- document tutor verification, safeguarding, cancellation, refund, no-show, dispute, tax, and payout procedures

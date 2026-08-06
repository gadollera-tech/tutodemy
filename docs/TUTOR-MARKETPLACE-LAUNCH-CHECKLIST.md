# Tutor Marketplace Launch Checklist

## Database and accounts

- [ ] Complete Supabase installer ran without errors.
- [ ] Administrator account was added to `public.admin_users`.
- [ ] Email confirmation and redirect URLs were tested on `tutodemy.net`.
- [ ] Tutor profile, availability, document, booking, review, and commission tables exist.
- [ ] `tutor-avatars` is public and `tutor-documents` is private.

## Tutor approval

- [ ] Identity and credential review procedure is documented.
- [ ] Only approved profiles appear publicly.
- [ ] Rejection and suspension reasons are recorded privately.
- [ ] Founding Tutor eligibility has a clear launch cutoff and maximum roster.
- [ ] Safeguarding rules for minors and in-person sessions are documented.

## Booking operations

- [ ] Learner booking request was tested.
- [ ] Tutor acceptance and decline were tested.
- [ ] Manual payment-verification procedure is documented.
- [ ] Session delivery and admin completion were tested.
- [ ] 10%, 15%, and 12% commission calculations were checked.
- [ ] Refund, cancellation, no-show, and dispute procedures are published.

## Public website

- [ ] Support email is added to `js/config.js`.
- [ ] Privacy Notice and Terms were reviewed for actual operations.
- [ ] No source PDFs, private IDs, credentials, or secret keys are in GitHub.
- [ ] Mobile navigation, forms, uploads, and tutor cards were tested.
- [ ] `tutodemy.net` and `www.tutodemy.net` open with HTTPS.

## Payments

- [ ] Automated checkout is disabled until a compliant provider is connected.
- [ ] Users are not told that money is automatically split or held.
- [ ] Payment references are visible only to booking parties and administrators.
- [ ] Tax, payout, invoice, refund, and dispute responsibilities are defined before live payments.

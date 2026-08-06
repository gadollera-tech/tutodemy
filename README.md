# TutoDemy Learning PH — Publishable Website with Tutor Marketplace

This package is the consolidated TutoDemy website for deployment on GitHub Pages and connection to Supabase.

Official domain prepared for connection:

```text
tutodemy.net
```

## Run locally

For a reliable local preview, open a terminal inside this folder and run:

```bash
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

## Included learning content

- UPCAT and general CET practice hub with **880 approved original questions**
- DOST-SEI-style preparation hub with **1,700 approved original questions**
- **2,580 approved original practice questions** in total
- Practice, timed-practice, and mock-exam modes
- Reviewer library ready for original or licensed UPCAT, DCAT, and other CET resources
- DOST-SEI under the **Practice Hubs** navigation menu

## Included account and tutor marketplace features

- Email/password account registration and login
- Optional Google sign-in after provider setup
- Account role selection:
  - learner or parent looking for a tutor
  - tutor offering tutoring services
- Tutor onboarding with:
  - public profile photo
  - subjects, examinations, and grade levels
  - location and online/in-person mode
  - schedule availability
  - session rate and duration
  - biography, education, and credentials
  - private verification documents
- Admin approval before a tutor appears publicly
- Public tutor directory and tutor profile pages
- Booking requests and tutor acceptance or rejection
- Learner and tutor booking dashboards
- Tutor earnings and commission ledger
- Verified reviews after completed bookings
- Admin console for tutor applications, payment confirmation, and booking completion

## Commission policy

- **Founding Tutor:** 10% platform commission for the first 20 completed sessions when founding eligibility is approved by an administrator
- **Regular Tutor:** 15% platform commission
- **High-Volume Tutor:** 12% after at least 100 completed sessions, rating of at least 4.5, and good standing
- **Top-Rated Tutor:** 12% after at least 50 completed sessions, rating of at least 4.8, at least 20 verified reviews, cancellation rate not exceeding 5%, and good standing

Only paid, delivered, and administrator-completed bookings count toward milestones and commission records.

## Payment status at launch

This build does **not** collect or split payments automatically.

The launch workflow is:

```text
booking request
→ tutor acceptance
→ payment handled through the approved manual process
→ administrator confirms payment
→ tutor marks the session delivered
→ administrator completes the booking
→ commission and tutor earnings are recorded
```

Automatic checkout, webhooks, refunds, and tutor payouts require a secure server-side payment integration and should be added as a later release.

## Supabase installation

For a fresh project, run this file in the Supabase SQL Editor:

```text
docs/SUPABASE-COMPLETE-INSTALL.sql
```

For a project where the original account schema was already installed, run:

```text
docs/TUTOR-MARKETPLACE-UPGRADE.sql
```

Then:

1. Configure the public Project URL and publishable key in `js/config.js`.
2. Configure the Site URL and redirect URLs in Supabase Authentication.
3. Create the first administrator row in `admin_users` using the authenticated administrator's user ID.
4. Test learner registration, tutor registration, tutor approval, booking, payment confirmation, completion, and review using separate accounts.

Never place a database password, `service_role`, or `sb_secret_...` key in this public website.

## Deployment

Upload the **contents of this folder** to the repository root. GitHub Pages should publish from:

```text
Branch: main
Folder: / (root)
```

Do not upload the outer ZIP or an extra enclosing folder.

The repository root must contain `index.html`, `css/`, `js/`, `data/`, `assets/`, `docs/`, and the other HTML pages.

## Domain connection

`CNAME-READY.txt` contains the prepared custom-domain value. Rename it to `CNAME` only after the Namecheap DNS records have been configured and the site is already deploying correctly through GitHub Pages.

## Content and source notice

The educational content has been marked approved for distribution by the project owner. The public package does not include the private reference PDFs.

Keep this public disclaimer visible:

> Original examination-style practice material. Not an official UPCAT, DCAT, DOST-SEI, or university examination, and not affiliated with the respective institutions.

## Operational review before launch

The code and package have been structurally validated, but a real marketplace also requires operational review of:

- tutor verification procedures
- safeguarding and complaint handling
- cancellation, refund, and no-show rules
- privacy and data-retention practices
- manual payment proof and reconciliation
- legal, tax, and business-registration requirements

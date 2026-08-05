# TutoDemy Learning PH — Consolidated Static Website

Open `index.html` to view the website. Use a local HTTP server when testing signup, login, OAuth, or password-reset redirects.

For the most reliable local test:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Included

- Branded responsive homepage
- Local learner dashboard
- UPCAT / General CET practice hub
- 880-question prototype bank:
  - 220 Mathematics
  - 220 Language & Reading
  - 220 Science
  - 220 Reasoning
- 20, 50, 100, 200, and custom item sets
- Practice, Timed Practice, and Mock Exam modes
- Random question and answer-choice ordering
- Countdown timer, warnings, and automatic submission
- Question navigator and flag-for-review
- Results by domain, time used, and accuracy
- Retry-incorrect workflow
- Reviewer library
- Tutor directory with placeholder faces and names
- Tutor profile pages
- Tutor inquiry form demonstration
- Free / Pro local preview
- Source and copyright policy
- GitHub Pages deployment guide

## Accounts and cloud progress

The website now includes ready-to-connect Supabase integration for:

- Email/password signup and login
- Optional Google OAuth
- Learner profiles
- Cloud-synced attempt history
- Saved reviewers
- One unfinished active exam
- Tutor inquiry records
- Account-scoped local storage and JSON data export

Run `docs/SUPABASE-SCHEMA.sql`, then add the public Project URL and publishable/anon key to `js/config.js`. Full instructions are in `docs/SUPABASE-SETUP-GUIDE.md`.

When Supabase is not configured or the learner is logged out, the site continues using browser `localStorage`.

## Remaining prototype limitations

The following are not connected yet:

- Secure Premium access
- Payment processing
- Real tutor scheduling
- Admin dashboard
- Automated content publishing
- AI integration
- Self-service account deletion
- Parent, tutor, and administrator roles

## Important content notice

The uploaded commercial modules, compiled question banks, readings, books, and abstract-reasoning test are not included in this website package.

The public bank contains original prototype questions, original passages, and original visual patterns. All educational content is marked for human review before public launch.

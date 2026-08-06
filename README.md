# TutoDemy Learning PH — Complete Website with DOST-SEI Final Bank

Open `index.html` to view the full website. For authentication, password-reset links, and reliable local testing, use an HTTP server:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Included in the whole website

- Responsive TutoDemy homepage and navigation
- Email/password account pages and learner profiles
- Supabase-ready cloud synchronization for the standard CET practice engine
- UPCAT / General CET practice hub with **880 original reviewed questions**
- Complete DOST-SEI-style preparation module with **1,700 original reviewed questions**
- **2,580 total original reviewed questions** across the two practice systems
- Practice, Timed Practice, and Mock Exam modes
- Dedicated strict 200-item DOST-SEI training mock
- Original reading passages, tables, graphs, spatial figures, and mechanical diagrams
- Reviewer library
- Tutor directory and inquiry demonstration
- Free / Premium prototype labels
- Source and copyright policy
- GitHub Pages and Supabase setup documentation

## DOST-SEI final subject totals

- Verbal Reasoning: 200
- Non-Verbal Reasoning: 250
- English: 200
- Biology: 150
- Chemistry: 150
- Physics: 150
- Earth Science: 100
- Mathematics: 300
- Mechanical-Technical: 200
- **Total: 1,700**

Open `dost-sei.html` from the main website, or launch `dost-sei/qbank-preview.html` directly.

## Supabase configuration

`js/config.js` already contains the public project URL and public publishable key supplied for the TutoDemy Supabase project.

You still need to:

1. Run `docs/SUPABASE-SCHEMA.sql` in the Supabase SQL Editor.
2. Configure the correct GitHub Pages Site URL and redirect URLs in Supabase Authentication.
3. Keep Email confirmation enabled if confirmation is required.

Never place a database password, `service_role`, or `sb_secret_...` key in the website.

## Current synchronization scope

Cloud synchronization currently covers the standard CET attempt history, one active CET session, saved reviewers, learner profiles, and tutor inquiries.

The dedicated DOST-SEI module currently stores its active attempt and recent history in browser `localStorage`. DOST cross-device cloud synchronization remains a later integration step.

## Prototype limitations

The following are not implemented as secure production services:

- Secure paid Premium entitlement
- Payment processing
- Real tutor scheduling
- Admin content dashboard
- Automated publishing
- AI integration
- DOST attempt cloud synchronization

## Content notice

Uploaded commercial modules, official-style primers, compiled question banks, books, and review files are not included in this website package.

The public package contains original reviewed questions and visuals. All educational items remain marked for qualified human review before public release.

## Navigation update

The top navigation no longer shows DOST-SEI as a separate main menu item. It is available under the **Practice Hubs** dropdown together with UPCAT/CET practice.

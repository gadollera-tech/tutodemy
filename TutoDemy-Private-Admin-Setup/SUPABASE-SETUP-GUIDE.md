# Supabase Setup Guide — TutoDemy Learning PH

This website uses a plain HTML/JavaScript front end with Supabase Auth, Database, Storage, and Row Level Security.

## 1. Run the complete installer

In Supabase:

```text
SQL Editor → New query
```

Open and run:

```text
docs/SUPABASE-COMPLETE-INSTALL.sql
```

This installs:

- learner/parent and tutor account roles
- cloud learning progress tables
- tutor applications and public profiles
- private tutor verification documents
- availability schedules
- booking requests
- verified reviews
- tutor commission ledger
- admin-only approval and booking functions
- public avatar and private document Storage buckets
- Row Level Security policies

A successful run may show `Success. No rows returned`.

If the original learner schema was already installed, you may run only:

```text
docs/TUTOR-MARKETPLACE-UPGRADE.sql
```

## 2. Create the administrator account

1. Register a normal account through `auth.html`.
2. Confirm its email and log in once.
3. In the SQL Editor, run this after replacing the email:

```sql
insert into public.admin_users (user_id, note)
select id, 'Primary TutoDemy administrator'
from auth.users
where email = 'YOUR_ADMIN_EMAIL@example.com'
on conflict (user_id) do nothing;
```

Do not create a browser-visible admin password. Admin access is checked through the authenticated user ID and database policies.

## 3. Browser configuration

The supplied `js/config.js` already follows this structure:

```js
window.TUTODEMY_CONFIG = {
  siteName: "TutoDemy Learning PH",
  supabaseUrl: "https://PROJECT_REF.supabase.co",
  supabaseAnonKey: "sb_publishable_...",
  googleOAuthEnabled: false,
  publicEmail: "",
  premiumPaymentsConnected: false,
  aiConnected: false
};
```

Only the **Project URL** and **publishable key** belong in browser code.

Never place these in GitHub:

- `service_role` key
- `sb_secret_...` key
- database password
- payment-provider secret keys

## 4. Authentication URLs for tutodemy.net

In Supabase:

```text
Authentication → URL Configuration
```

Site URL:

```text
https://tutodemy.net
```

Allowed redirect URLs:

```text
https://tutodemy.net/**
https://www.tutodemy.net/**
```

Keep the old GitHub Pages address temporarily while testing.

## 5. Email and optional Google login

Email/password:

```text
Authentication → Providers → Email
```

Enable signups and decide whether email confirmation is required.

For Google, configure the provider and set in `js/config.js`:

```js
googleOAuthEnabled: true
```

Use the Supabase callback URI shown by the Google provider page.

## 6. Test the tutor workflow

1. Create a tutor account.
2. Save a tutor draft.
3. Upload a profile photo and private document.
4. Submit the application.
5. Log in with the admin account.
6. Open `admin.html`.
7. Review and approve the tutor.
8. Confirm the profile appears on `tutoring.html`.
9. Create a learner booking request.
10. Accept it from `tutor-dashboard.html`.
11. Confirm payment in `admin.html`.
12. Mark the session delivered from the tutor dashboard.
13. Complete it in the admin console.
14. Verify the commission ledger and learner review flow.

## 7. Current payment limitation

The website does not automatically collect, split, or pay funds. The admin console records manual payment confirmation and calculates commission only after a paid session is delivered.

Connect a compliant marketplace payment provider before enabling automatic checkout or tutor payouts.

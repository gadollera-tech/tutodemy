# Activate TutoDemy Accounts and Cloud Progress

The website already contains the login, signup, profile, and cloud-sync code. It remains in local-only mode until a Supabase project is connected.

## 1. Create a Supabase project

Create a new project in Supabase. Keep the database password private.

## 2. Create the tables and security policies

Open the Supabase SQL Editor and run:

```text
docs/SUPABASE-SCHEMA.sql
```

This creates:

```text
profiles
exam_attempts
active_sessions
saved_reviewers
tutor_inquiries
```

It also enables Row Level Security so authenticated learners can access only rows associated with their own user ID.

## 3. Add the public browser credentials

In the Supabase project dashboard, copy:

- Project URL
- Publishable key or legacy anon key

Edit:

```text
js/config.js
```

Fill in:

```js
supabaseUrl: "https://YOUR-PROJECT.supabase.co",
supabaseAnonKey: "YOUR-PUBLIC-PUBLISHABLE-OR-ANON-KEY",
```

The public browser key is designed to be used in the front end when Row Level Security is correctly configured.

**Never place a service_role key in GitHub or browser code.**

## 4. Configure email authentication

In Supabase Authentication settings:

1. Enable email/password signups.
2. Decide whether email confirmation is required.
3. Add the deployed website URLs to the allowed redirect URLs.

For GitHub Pages, add URLs in this form:

```text
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/profile.html
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/auth.html?mode=reset
```

Also add your custom domain versions later, if applicable.

## 5. Optional Google login

In Supabase Authentication Providers:

1. Enable Google.
2. Add the Google OAuth Client ID and Client Secret.
3. Follow the callback URL shown by Supabase when configuring the Google Cloud OAuth client.
4. Add your site redirect URLs in Supabase.
5. Change this in `js/config.js`:

```js
googleOAuthEnabled: true,
```

## 6. Test locally

Run:

```bash
python -m http.server 8000
```

Open:

```text
http://localhost:8000/auth.html
```

Add these local redirect URLs in Supabase during testing:

```text
http://localhost:8000/profile.html
http://localhost:8000/auth.html?mode=reset
```

## 7. Test the complete flow

1. Create an account.
2. Confirm the email if confirmation is enabled.
3. Log in.
4. Edit and save the learner profile.
5. Complete a practice set.
6. Save a reviewer.
7. Start an exam without finishing it.
8. Log in on another browser or device.
9. Confirm the history, saved reviewer, and active exam appear.

## What is synchronized

- Learner profile
- Completed attempt summaries and detailed result payloads
- Saved reviewers
- One active unfinished exam
- Tutor inquiry submissions made while logged in

## Local fallback

The website continues saving a local browser copy. After a learner first logs in, anonymous local progress on that browser is moved into that learner's account-scoped local storage and uploaded to the cloud.

On shared computers, learners should log out after use.

## Not included yet

- Admin dashboard
- Secure paid subscriptions
- Parent-linked accounts
- Teacher or tutor roles
- Account deletion workflow
- Avatar file upload to Supabase Storage
- Email marketing consent

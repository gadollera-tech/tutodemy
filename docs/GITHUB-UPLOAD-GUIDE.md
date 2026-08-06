# GitHub Pages Upload and Domain Guide

## 1. Upload the correct folder contents

Extract the final ZIP, open the extracted website folder, and upload **everything inside it** to the GitHub repository root.

Do not upload:

- the ZIP file itself
- an extra outer folder containing the website
- private source PDFs
- tutor identity documents
- secret or service-role keys

The repository's main page should immediately show files and folders such as:

```text
index.html
auth.html
profile.html
tutoring.html
tutor-onboarding.html
tutor-profile.html
bookings.html
tutor-dashboard.html
admin.html
css/
js/
data/
assets/
docs/
dost-sei/
```

## 2. Configure GitHub Pages

Open:

```text
Repository → Settings → Pages
```

Use:

```text
Source: Deploy from a branch
Branch: main
Folder: / (root)
```

Wait for the `pages build and deployment` workflow to receive a green check in the **Actions** tab.

## 3. Verify the default Pages address first

Before connecting the custom domain, confirm that the site and its CSS/JavaScript work at the GitHub Pages address.

Test pages including:

- homepage
- login/signup
- practice hubs
- tutor directory
- tutor onboarding
- admin console

## 4. Connect `tutodemy.net`

In Namecheap:

```text
Domain List → tutodemy.net → Manage → Advanced DNS
```

For the root domain, use GitHub Pages' current apex A records. For `www`, use a CNAME pointing to the GitHub account Pages hostname, such as:

```text
YOUR-GITHUB-USERNAME.github.io
```

Do not include `https://` or the repository path in the CNAME value.

After the DNS records are saved, open:

```text
GitHub repository → Settings → Pages → Custom domain
```

Enter:

```text
tutodemy.net
```

GitHub normally creates or updates the repository `CNAME` file. This package includes `CNAME-READY.txt` as a safe prepared copy; rename it to `CNAME` only when the DNS connection is ready.

Enable **Enforce HTTPS** after GitHub finishes issuing the certificate.

## 5. Update authentication URLs

After the custom domain works, set the Supabase Authentication Site URL to:

```text
https://tutodemy.net
```

Allow the required redirect destinations, including:

```text
https://tutodemy.net/
https://tutodemy.net/profile.html
https://tutodemy.net/auth.html
https://tutodemy.net/auth.html?mode=reset
https://tutodemy.net/tutor-onboarding.html
https://tutodemy.net/tutor-dashboard.html
https://tutodemy.net/bookings.html
```

Retain the old GitHub Pages URLs during testing, then remove unused addresses later.

## 6. Install the Supabase database

Fresh installation:

```text
docs/SUPABASE-COMPLETE-INSTALL.sql
```

Existing original account schema:

```text
docs/TUTOR-MARKETPLACE-UPGRADE.sql
```

Then add the first administrator to `admin_users` through the Supabase SQL Editor. Never implement administrator access using a password embedded in browser JavaScript.

## 7. Test using separate accounts

Use at least:

- one learner/parent account
- one tutor account
- one administrator account

Complete the whole flow before accepting real users:

```text
tutor registration
→ application submission
→ administrator review
→ public listing
→ learner booking request
→ tutor acceptance
→ administrator payment confirmation
→ tutor delivery confirmation
→ administrator completion
→ learner review
```

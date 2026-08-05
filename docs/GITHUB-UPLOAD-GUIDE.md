# Uploading the Website to GitHub Pages

## Do not upload the old batch ZIP files individually

Use only this final consolidated website folder.

## Option A — Replace the contents of the existing TutoDemy repository

1. Download and extract the final ZIP.
2. Open the extracted `TutoDemy-Final-Website` folder.
3. In the existing TutoDemy GitHub repository, remove the old website files that are being replaced.
4. Upload all files and folders from inside `TutoDemy-Final-Website`.
5. Commit the changes.
6. Open **Settings → Pages**.
7. Under **Build and deployment**, select:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/ (root)`
8. Save and wait for deployment.

The repository root must contain:

```text
index.html
dashboard.html
exams.html
practice.html
reviewers.html
reviewer.html
tutoring.html
tutor-profile.html
pricing.html
resources.html
about.html
auth.html
profile.html
privacy.html
assets/
css/
data/
js/
docs/
```

## Important

Do not upload the private reference PDFs into the public repository.

GitHub Pages repositories and their files are publicly accessible.

## Updating tutor profiles

Edit:

```text
data/tutors.js
```

Replace placeholder names, portraits, subjects, levels, bios, experience, availability, and rates only after verification.

Place real tutor photos inside:

```text
assets/tutors/
```

## Connecting the inquiry form

Edit:

```text
js/config.js
```

You may later add:

- Google Form embed URL
- Google Apps Script endpoint
- Public contact email
- Facebook page URL

The current form intentionally stores demo data only in the browser.

## Custom domain

After GitHub Pages is working, add a domain through **Settings → Pages → Custom domain**. DNS records depend on the domain provider.

## Activating learner accounts

Uploading to GitHub Pages publishes the account-ready front end, but login will remain in setup mode until Supabase is connected.

After deployment:

1. Run `docs/SUPABASE-SCHEMA.sql` in a Supabase project.
2. Paste the public Project URL and publishable/anon key into `js/config.js`.
3. Add the GitHub Pages `profile.html` and password-reset URLs to Supabase Auth redirect URLs.
4. Optionally enable Google OAuth.

See `docs/SUPABASE-SETUP-GUIDE.md` for the full procedure.

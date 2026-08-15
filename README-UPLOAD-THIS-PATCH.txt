TutoDemy DOST Visual Reasoning — Phase 3 LIVE GitHub Patch
Built from the user-provided current GitHub repository ZIP: tutodemy-main.zip
Date: 2026-08-16

HOW TO UPLOAD
1. Extract this ZIP.
2. Open the folder TutoDemy-DOST-Visual-Reasoning-Phase3-Live-Patch.
3. Upload/replace these files in the ROOT of your existing TutoDemy GitHub repository,
   preserving the included folder paths.
4. Commit the changes.
5. After GitHub Pages deploys, open the DOST practice page and hard-refresh once.
   The service-worker cache was bumped to: tutodemy-20260816-dostvr3

WHAT THIS PATCH DOES
- Replaces 24 existing Non-Verbal Reasoning slots with the upgraded visual questions.
- Removes the content of all 13 old Easy Figure Series items plus 5 repetitive Moderate series items.
- Replaces 6 repetitive Wave 4 rotation items.
- Keeps the overall DOST bank at exactly 1,700 questions.
- Keeps Non-Verbal Reasoning at exactly 250 questions.
- Keeps Wave 4 at exactly 500 questions.
- Adds 24 responsive SVG figures.
- Adds tap/click enlargement for complex figures.
- Removes the old 115px max-height cap that could crop visual answer SVGs.
- Keeps normal question choice shuffling, but preserves fixed A–E order for figures whose option letters are drawn inside the SVG.
- Updates cumulative + Wave 4 JSON, JS, CSV, answer-key, summary, and validation records.
- No Supabase SQL change is required.

CHANGED/NEW FILES: 45

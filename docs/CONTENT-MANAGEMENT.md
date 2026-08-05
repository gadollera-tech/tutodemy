# Adding Questions and Reviewers

## Question bank

The main bank is available in:

```text
data/question-bank.json
data/question-bank.js
```

The website currently loads the JavaScript version so it also works when opened directly from a computer.

Each question needs:

```json
{
  "id": "unique-id",
  "category": "Mathematics",
  "domain": "M1",
  "topic": "Percent",
  "difficulty": "Moderate",
  "access": "Free",
  "stem": "Original question",
  "choices": [
    {"id": "A", "text": "Choice A"},
    {"id": "B", "text": "Choice B"},
    {"id": "C", "text": "Choice C"},
    {"id": "D", "text": "Choice D"}
  ],
  "correct_choice": "B",
  "rationale": "Original explanation",
  "steps": [],
  "takeaway": "Rule to remember"
}
```

For a visual choice, include an `html` field containing original SVG.

## Reviewers

Edit:

```text
data/reviewers.js
```

Each reviewer includes its title, category, domain, summary, key points, access level, and linked practice domain.

## Warning

Editing the JSON but not the JavaScript file will not change the direct-open version of the website. A future build process should generate both files automatically.

## Account configuration

Account credentials belong in:

```text
js/config.js
```

Use only the public Supabase publishable/anon key. Never use a `service_role` key in client code. Database tables and RLS policies are defined in `docs/SUPABASE-SCHEMA.sql`.

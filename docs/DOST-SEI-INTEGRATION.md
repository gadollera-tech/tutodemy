# DOST-SEI Integration in the Complete Website

The complete Waves 1–4 module is stored in:

```text
dost-sei/
```

The branded website landing page is:

```text
dost-sei.html
```

The practice engine is:

```text
dost-sei/qbank-preview.html
```

## Included data

- 500 Wave 4 questions
- 1,700 cumulative questions
- 300 cumulative stimuli
- JSON, JavaScript, and CSV exports
- Wave 4 answer key and validation documents

## Storage behavior

The DOST engine uses these browser keys:

```text
tutodemy_dost_wave4_active_session
tutodemy_dost_wave4_history
```

These keys are deliberately separate from the standard CET engine so an unfinished DOST attempt cannot corrupt or replace a CET session.

## Production next step

To add DOST cloud synchronization safely, use separate DOST session/history records or add an exam-track field before sharing the standard `active_sessions` row. Do not simply reuse the current CET active-session key because the session formats are different.

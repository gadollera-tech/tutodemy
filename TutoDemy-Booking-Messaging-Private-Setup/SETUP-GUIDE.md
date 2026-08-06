# TutoDemy Private Booking Messaging Setup

Keep this folder private. Do not upload it to the public GitHub repository.

## Installation order

1. Sign in to the TutoDemy Supabase project.
2. Open **SQL Editor** and create a new query.
3. Open `BOOKING-MESSAGING-UPGRADE.sql` in a text editor.
4. Copy the entire SQL file into the Supabase query and click **Run**.
5. Confirm that the query completes successfully.
6. Upload the contents of the public website ZIP to the GitHub repository root.
7. Test with separate learner, tutor, and administrator accounts.

## Test flow

1. Create a learner booking request.
2. Sign in as the tutor and accept the request.
3. Open **Messages** from either booking dashboard.
4. Send messages from both accounts.
5. Confirm live updates and unread indicators.
6. Submit a conversation report.
7. Sign in as administrator and open **Admin Console → Message reports**.
8. Review the conversation and resolve or dismiss the report.

## Privacy behavior

- Messaging opens only after tutor acceptance.
- Learner, assigned tutor, and authorized administrators can read the booking thread.
- Cancelled, declined, and refunded bookings are read-only.
- Message reports are visible only to authorized administrators.
- No file attachments are enabled in this release.
- Do not place Supabase secret keys, database passwords, or OAuth client secrets in public website files.

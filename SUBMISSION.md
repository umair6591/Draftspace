# Submission Inventory

## Included

- Source code for the DraftSpace full stack document editor MVP.
- `README.md` with setup, run, Supabase, reviewer account, and script instructions.
- `ARCHITECTURE.md` with scope, implementation decisions, tradeoffs, and next steps.
- `AI_WORKFLOW.md` with AI tool usage, review decisions, and verification notes.
- `supabase/schema.sql` with tables, triggers, indexes, and row level security policies.
- `.env.example` listing required environment variables.
- Vitest and React Testing Library tests for helper logic, UI feedback, auth, dashboard, and editor flows.

## Live Product URL

https://draftspace-nine.vercel.app/

## Reviewer Credentials

Use this seeded reviewer account:

- `umair.techlife@gmail.com` / `Oatsandmilk@23`

To review sharing, create any second account from the sign-up screen, share a document with that email, then sign in as the second user to confirm the document appears under "Shared with me."

## What Works

- User sign-up and sign-in with Supabase Auth.
- Profile creation for share lookup.
- New document creation.
- Rich-text editing with bold, italic, underline, headings, bulleted lists, and numbered lists.
- Autosave and manual save.
- Reopening documents after refresh.
- `.txt` and `.md` file import into new editable documents.
- Owner-to-user sharing by email.
- Owned and shared document sections on the dashboard.
- Database-backed access rules with Supabase RLS.
- Automated tests: 5 files, 15 tests covering helper logic, feedback UI, auth validation/sign-in, dashboard create/import, and editor save/share behavior.

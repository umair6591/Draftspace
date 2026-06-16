# AI Workflow Note

## Tools Used

I used Cursor with an AI coding assistant to move faster through implementation planning, code edits, and verification.

## Where AI Helped

AI materially sped up:

- Turning the open-ended assessment into a scoped MVP plan.
- Sketching the Next.js page structure for auth, dashboard, and document editing.
- Drafting Supabase schema and RLS policies for owner/shared access.
- Identifying the right helper functions to test around import validation and access rules.
- Producing submission documentation after the product behavior was in place.

## What I Changed Or Rejected

I kept the scope intentionally smaller than a full Google Docs clone. I rejected real-time cursors, comments, version history, PDF export, and complex role management because they would have increased risk without improving the core assessment flow as much as reliable creation, editing, importing, sharing, and persistence.

I also adjusted AI-assisted output where product or security judgment mattered, including limiting file import types, storing TipTap JSON instead of HTML, keeping share lookup tied to signed-up profiles, and adding RLS policies rather than relying only on client-side checks.

## Verification

I verified correctness with:

- Manual reasoning through the Alice/Bob sharing flow.
- Supabase RLS policies that enforce access on the database side.
- Automated Vitest and React Testing Library tests for document helpers, feedback UI, auth validation/sign-in, dashboard create/import behavior, and editor save/share behavior.
- Local lint, test, and production build checks.
- UI copy that states import limits and reviewer account expectations.

Remaining deployment verification should include creating the Supabase project, applying `supabase/schema.sql`, setting production env vars, deploying the app, and smoke testing sign-up, import, edit, share, and shared-user access from the live URL.

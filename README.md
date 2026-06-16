# DraftSpace

DraftSpace is a deliberately scoped collaborative document editor MVP built for the Ajaia full stack product engineering assessment. It supports rich-text document creation, text/Markdown import, persistence, and simple owner-to-user sharing.

## Live Demo

Live product URL: https://draftspace-nine.vercel.app/

Reviewer test account:

- `umair.techlife@gmail.com` / `Oatsandmilk@23`

To review sharing, create any second account from the sign-up screen, share a document with that email, then sign in as the second user to see it under "Shared with me."

## Features

- Create, rename, edit, save, and reopen documents.
- Rich text editing with bold, italic, underline, H1/H2 headings, bulleted lists, and numbered lists.
- Autosave plus a manual "Save now" action.
- Import `.txt` and `.md` files as new editable documents.
- Lightweight Supabase auth with profile records.
- Owner/shared document separation on the dashboard.
- Email-based sharing that grants editor access to another signed-up user.
- Supabase persistence for document content, plain-text previews, profiles, and share grants.
- Row level security policies for owned/shared access.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- TipTap editor
- Supabase Auth and Postgres
- Vitest and React Testing Library

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a Supabase project.

3. Run the SQL in `supabase/schema.sql` in the Supabase SQL editor.

4. Copy the environment template:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

5. Fill in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

6. Start the dev server:

```bash
npm run dev
```

7. Open `http://localhost:3000`.

## Supabase Notes

The app expects email/password auth to be enabled. The database trigger in `supabase/schema.sql` creates a profile row when a user signs up, and the UI also upserts the profile after sign-up for a smoother reviewer flow.

If email confirmation is enabled in Supabase, reviewers may need to confirm accounts before signing in. For a take-home demo, disabling email confirmation keeps the Alice/Bob flow fast.

## Validation And Limits

- File import is intentionally limited to `.txt` and `.md`.
- Imported files must be under 500 KB.
- Sharing requires the recipient to have signed up at least once so a profile exists.
- Shared users receive editor access in this MVP.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm test
```

## Test Coverage

The automated suite uses Vitest and React Testing Library. It covers document helper logic, feedback UI components, auth validation/sign-in flow, dashboard create/import behavior, and document editor save/share behavior.

Current local verification:

- 5 test files
- 15 tests
- `npm test`, `npm run lint`, and `npm run build` passing

## Assessment Notes

- Architecture note: `ARCHITECTURE.md`
- AI workflow note: `AI_WORKFLOW.md`
- Submission inventory: `SUBMISSION.md`

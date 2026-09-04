# Profit Streams® Podcast — Guest Intake

A branded pre-recording intake form for podcast guests. Replaces chasing
down headshots, bios, and book links after recording — guests fill this
out beforehand, and it lands directly in a database with email
notifications sent automatically.

Stack: **Next.js** (App Router) · **Supabase** (Postgres + Storage) ·
**Resend** (email) · deployed on **Vercel**.

## What happens when a guest submits

1. Their headshot (if attached) uploads to a Supabase Storage bucket.
2. Their answers are saved as a row in the `guest_intakes` table.
3. You get a notification email with a summary and links.
4. The guest gets an automatic confirmation email.

No manual steps after setup — this runs on its own.

## One-time setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor**, paste in `supabase/schema.sql`, and run it.
3. Go to **Storage**, create a new bucket named `headshots`, and set it to **Public**.
4. Go to **Project Settings -> API** and copy:
   - `Project URL` -> `SUPABASE_URL`
   - `service_role` key (not the `anon` key) -> `SUPABASE_SERVICE_ROLE_KEY`

The service role key bypasses Row Level Security and must **only** ever
be used server-side (as it is here, inside `app/api/submit/route.ts`).
Never expose it in client-side code or commit it to git.

### 2. Resend (email)

1. Create an account at [resend.com](https://resend.com) — free tier covers this easily.
2. Get an API key -> `RESEND_API_KEY`.
3. Either verify your own sending domain (e.g. `noreply@profit-streams.com`)
   for `EMAIL_FROM`, or use Resend's default `onboarding@resend.dev` sender
   while testing.

### 3. Environment variables

Copy `.env.example` to `.env.local` for local development, and fill in
the real values. For production, add the same variables in **Vercel ->
Project Settings -> Environment Variables**.

### 4. Local development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

### 5. Deploy

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) -> **New Project** -> import the repo.
3. Add the environment variables (same as `.env.local`) in the Vercel project settings.
4. Deploy. Vercel auto-builds and redeploys on every push to `main`.

## Scaling note

If load ever gets high enough to matter, Supabase Storage is already
S3-compatible under the hood, so no migration is needed there. The
Postgres table will comfortably handle far more volume than a podcast
guest list will ever produce — this isn't a component likely to need
attention as things grow.

## Extending this later

- Add an internal dashboard page (e.g. `/admin`) that queries
  `guest_intakes` and shows a table of submissions with their `status`
  field, so you can track kit-building progress per guest without
  opening Supabase directly.
- Add a Drive/Notion sync step in `app/api/submit/route.ts` if you want
  submissions to also land in your existing podcast folder structure.

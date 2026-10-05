# He:Bro — Build Plan

## Context

He:Bro is a students-management portal for a single private Hebrew tutor. UI is Hebrew/RTL. **Only the tutor uses it**, and a **VPN is always on** across their devices — so China-access workarounds (HK VPS, server-side Google proxy, Caddy, Litestream) are unnecessary and were dropped.

Locked decisions:

* **Hosting:** GitHub Pages (free static hosting) for the SPA — no server to maintain.
* **Database + auth:** Supabase free tier (cloud Postgres + Auth) → phone↔PC sync.
* **Google Calendar:** read-only, direct browser OAuth (Google Identity Services token flow).
* **Users:** tutor only — one Supabase auth user. Reminders are a tutor-facing nudge list.
* **Hebrew level model:** per skill (reading/speaking/listening) → **level** + **tags** + free-text note.

## Stack

| Concern | Choice | Note |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) + TS | `output: "export"` — fully static SPA, no server runtime |
| Styling | Tailwind v4 (CSS-first) | Logical-property utilities (`ms-*`, `ps-*`, `start-*`, `text-start`) for RTL |
| DB | Supabase Postgres | Schema in `supabase/schema.sql`; RLS: authenticated full access |
| Data/auth client | `@supabase/supabase-js` | Sessions persisted in `localStorage`, auto-refresh |
| Auth | Supabase email + password | Login at `/login/`; `AppShell` guards the app group |
| Calendar | Google Identity Services (token flow) | Token in `localStorage`; scope `calendar.events.readonly` |
| PWA | Hand-written `public/sw.js` | Stale-while-revalidate, same-origin only |
| Fonts | Rubik (headings/buttons) + Assistant (body) | Self-hosted via `next/font` |

## Project structure

```
he-bro/
├── app/
│   ├── layout.tsx                  # <html lang="he" dir="rtl"> + fonts
│   ├── manifest.ts                 # PWA manifest (force-static, base-prefixed paths)
│   ├── (auth)/login/page.tsx       # email + password
│   └── (app)/
│       ├── layout.tsx              # AppShell (auth guard) + AppHeader
│       ├── page.tsx                # dashboard
│       ├── students/{page,new/page,view/page,edit/page}.tsx
│       ├── lessons/{page,new/page,edit/page}.tsx
│       └── settings/{page,calendar/page}.tsx
├── components/{students,lessons,settings}/
├── lib/
│   ├── supabase.ts                 # client singleton
│   ├── db.ts                       # data-access layer (snake_case rows → camelCase)
│   ├── students-form.ts, lessons-form.ts
│   ├── reminders.ts, google-calendar.ts
│   ├── tags.ts, datetime.ts
├── supabase/schema.sql
├── public/{sw.js, icons/}
├── .github/workflows/deploy.yml
└── next.config.ts                  # output export, basePath, trailingSlash, images unoptimized
```

## Routing convention

Static export forbids dynamic segments and server-side `searchParams`. Routes are **flat + query params**, read on the client via `new URLSearchParams(window.location.search)` inside `useEffect`:

`/students/?tab=archived` · `/students/view/?id=` · `/students/edit/?id=` · `/lessons/?id=` · `/lessons/new/?id=` · `/lessons/edit/?id=&lesson=` · `/settings/calendar/` · `/login/`

## Data model (supabase/schema.sql)

Tables, snake_case: `students`, `skill_levels`, `skill_tags`, `special_dates`, `lessons`, `holidays`.

* **students**: name, age?, age_range?, city, country, status (`active`/`archived`), lessons_location?, why_learning?, what_for?, birthday?
* **skill_levels**: student_id, skill, level, note?
* **skill_tags**: level_id, tag (child table per level)
* **special_dates**: student_id, date, label
* **lessons**: student_id, starts_at, ends_at?, planned_topics?, covered_topics? (gap = next-lesson priority), used_presentation, last_slide_no?, homework_assigned?, promised_next?, homework_checked, notes?
* **holidays**: date, name

`set_updated_at()` trigger on every table; RLS enabled with one policy — `authenticated` full access (`using (true) with check (true)`). The anon key is public; security rests on RLS + the one login.

## Auth

* Login page calls `supabase.auth.signInWithPassword({ email, password })`.
* `AppShell` checks `getSession()` and subscribes via `onAuthStateChange`; no session → redirect to `/login/`.
* The tutor user is created manually in the Supabase dashboard (Authentication → Users). No sign-up UI.

## Google Calendar

* The teaching calendar is **public** ("Make available to public" in its sharing settings). Events are read with a simple API-key GET — no OAuth, consent, tokens, or popups.
* `listUpcomingEvents(max)` in `lib/google-calendar.ts` calls the Calendar REST API with the key + calendar ID baked in as constants. The dashboard shows the 5 next events; Settings → Calendar lists 10.
* The API key is public by design; restrict it in the GCP Console (HTTP referrer: `https://snirsigawi.github.io/*`) and rely on the calendar being public.

## Deployment (GitHub Pages via Actions)

Workflow `.github/workflows/deploy.yml` builds on every push to `main`/`master` and deploys `./out`.

One-time setup:

1. **Supabase:** create a project; run the contents of `supabase/schema.sql` in the SQL editor; create the tutor user under Authentication → Users (email + password).
2. **GitHub:** push the repo. Settings → Pages → **Source: GitHub Actions**.
3. **Repo variables:** Settings → Secrets and variables → Actions → **Variables** (these are public values, so Variables, not Secrets):
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   * `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
4. Push to `main`; the workflow type-checks, builds (base path is derived automatically — `/<repo>` for project pages, empty for a `<user>.github.io` repo), and deploys.
5. In Google Cloud Console, add the final Pages origin to the OAuth client's authorized JavaScript origins.

Local dev/build: copy values into `.env` (see `.env.example`); `npm run dev` / `npm run build` (export goes to `./out`).

## Reminders (`lib/reminders.ts`)

Nudge list: unchecked homework, promises for next time, planned-vs-covered topic gaps, birthdays/special dates within 14 days, holidays within 30 days.

## RTL/Hebrew conventions

Logical Tailwind utilities only; wrap Latin text/dates/phone numbers in `<span dir="ltr" style={{ unicodeBidi: "isolate" }}>`; no `letter-spacing` for Hebrew; headings/buttons Rubik, body Assistant.

## Verification

* `npx tsc --noEmit` clean; `npm run build` produces `./out` with 13 static routes.
* Log in with the Supabase user; unauthenticated access redirects to `/login/`.
* Create a student with skill levels/tags, special dates; archive/restore; delete.
* Log a lesson (planned vs covered, presentation + last slide, homework, promise); timeline renders; toggle homework-checked; edit/delete via query-param routes.
* Dashboard: next lesson, student summaries, reminders; settings: holiday CRUD, Google connect + upcoming events.

## Pitfalls

1. Do not reintroduce dynamic route folders (`[id]`) or server-side `searchParams` — they break static export.
2. Metadata routes need `export const dynamic = "force-static"` under `output: "export"`.
3. `NEXT_PUBLIC_BASE_PATH` must equal `/<repo>` for project pages or manifest/asset links break; the workflow derives it.
4. CI must use plain `npm ci` (dev deps include TS/Tailwind — `--omit=dev` breaks the build).
5. RLS must remain enabled — the anon key ships in the client bundle.
6. GIS origins are exact-match (scheme + host + port); localhost and the Pages URL must both be listed.

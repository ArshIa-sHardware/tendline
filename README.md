# tendline

A Parkinson’s care companion. The current design replaces the earlier Bedside Notebook interface. See `DESIGN.md` for the system, research rationale and verification limits.


A React + TypeScript + Vite app for sleep, medication timing, symptoms, and care-partner observations, with Supabase Auth and a private cloud notebook for each account.

## Run locally

Install **Node.js 22.22.2+ or 24.15+** (Node 22 LTS is supported; use the latest patch release). Open this folder in VS Code or your preferred editor, then:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open the localhost URL printed by Vite, normally `http://127.0.0.1:5173`. Before configuring Supabase, the welcome screen explains setup and provides a fully interactive fictional example. It never sends example entries to Supabase. The example resets when you leave/reload it.

For cloud accounts, complete the following setup, fill `.env.local`, then restart `npm run dev`.

## Set up a new Supabase project

1. Create a project at [Supabase](https://supabase.com/dashboard). Keep the database password private; this app does not need it in the browser.
2. In the project's SQL editor, run the complete contents of `supabase/migrations/202610250001_notebooks.sql` **once**. It creates the table, row-level security policies, restricted grants, and revision trigger. Alternatively, apply the migration through the Supabase CLI with `supabase db push` after linking your project.
3. Copy the project URL and **publishable key** (or legacy `anon` key) from the project's API settings into `.env.local`:

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLIC_KEY
   ```

   Never use a `service_role` or `sb_secret_…` key. Vite variables are public in the built app. The app rejects secret keys, and `.env.local` is ignored by Git.

4. Enable email/password authentication in Supabase Auth. Keep email confirmation enabled. Configure a password minimum of 12 characters to match the signup form.
5. Set the Auth **Site URL** to your local app URL during development. Add these allowed redirect URLs for the origins you use:

   ```text
   http://127.0.0.1:5173/
   http://127.0.0.1:5173/?reset=1
   http://localhost:5173/
   http://localhost:5173/?reset=1
   ```

   After deployment, use your deployed HTTPS origin as the Site URL and add its `/` and `/?reset=1` URLs. The app builds redirects from its current origin. Keep redirect URLs narrow.

6. Configure email delivery/SMTP before inviting real users. Supabase's default email service has restrictions; see [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
7. Restart the Vite server. Create an account, confirm the email, sign in, create a note, reload, and try password recovery. Recovery links open a new-password form before the notebook. Invalid or expired links can request a fresh email.

No hosted Supabase project or email service is provisioned by these files. Those need your account. The app contains real SDK calls, not simulated authentication. Automated browser tests intercept those requests with fixtures; live email delivery and your hosted configuration must be tested after setup.

## Features retained

- Person with Parkinson's and care-partner perspectives, with names and distinct marks.
- Sleep diary: bedtime, rising time, time to sleep, wakes, bathroom trips, causes, restedness, caregiver observations, caregiver sleep, and free-text notes.
- Timed medication doses, daytime dozing, bowel movements, and laxatives.
- Symptom check-ins for medication timing, moving, energy, stomach, mood, food, and notes; historical date/time entry.
- Notebook history with both sleep perspectives, 24-hour timelines, daily entries, deletion confirmation, undo, and older-day pagination. Search is new.
- Visit summaries for 1, 2, or 4 weeks, comparisons, dozing/dose timing, both people's words, saved questions, editable report, copy, and text download.
- JSON backup/restore (including existing v2/v3 backups), CSV export with formula escaping, and same-origin legacy import.
- Tracking preferences, larger text, light/dark/device themes, touch targets, and fictional example data.
- Installable PWA with app-shell precaching and optional device storage for offline notes.

The old prototype's design-rationale annotations are not part of the new tracking UI. Caregiver perspectives remain inside a single account; separate caregiver accounts, invitations, and shared permissions are a future phase.

## Move existing notes

In the old app, open **Settings → Download full backup**. In the new app, sign in and open **Settings → Import JSON backup**. Review the entry count and confirm replacement. Download the current account's backup first if it already has notes. Import validates the entire file before changing the notebook and is one versioned cloud write.

If both versions run at the same origin, **Import the old notebook from this browser** reads the old `bedside-notebook-v1` key after an explicit click. It does not delete the old data. Changing the host, port, or domain changes browser storage, so a JSON file is the reliable migration path. The original HTML and ZIP remain separate from this project.

## Storage, access control, and conflicts

`public.notebooks` contains one JSONB document per account. Keeping an atomic document preserves legacy backups and makes import/undo atomic. The document is typed and validated by Zod. The database also checks the top-level document shape, size (12 MB maximum), and that it is not a fictional example. Larger deployments may eventually normalize entries into separate rows.

Every SELECT, INSERT, UPDATE, and DELETE is restricted by `(select auth.uid()) = owner_id`. Anonymous roles have no table privileges. Clients may insert only `owner_id` and `content`, and update only `content`; they cannot change ownership, timestamps, or revisions. The revision trigger increments the version. Every app write includes its previous revision; zero updated rows means a conflict, never a blind overwrite.

When another device changes a notebook, the conflict panel keeps your proposed copy available for download and requires an explicit reload of the cloud copy. It does not automatically merge or replace either copy. Use **Refresh from cloud** to fetch another device's changes. Sync is request-based, not realtime collaboration.

Authenticated pages are keyed by user ID and unmounted on signout/account change. User data is not cached by the service worker. Supabase stores the session in browser storage. Optional offline notebook copies are separately keyed by account ID and removed on signout. Never enable offline copies on a shared device; they are unencrypted. No external fonts, analytics, or third-party media are loaded.

## Offline behavior

Enable **Settings → Keep a copy on this device for offline use** while online. Open the deployed app once to cache its shell. With an available cached session, notes can then be read/edited offline. They remain pending until **Retry sync** is selected after reconnecting. A stale revision produces the conflict flow above.

If storage is full or disabled, the app explicitly reports **Not saved · keep this page open** and offers JSON download. Without the offline option, pending edits exist only in page memory. Unsynced writes trigger a page-leave warning. Unsubmitted form drafts are not saved across navigation or refresh. An expired session may require reconnecting and signing in. Signing out discards the account's local cache, so export or sync pending notes first.

## Development and tests

```sh
npm run dev          # local app
npm run typecheck    # strict TypeScript
npm test             # models, auth forms, offline/conflict handling, and PostgreSQL RLS via PGlite
npm run build        # production assets in dist/
npm run preview      # serve production build locally
npx playwright install chromium
npm run test:e2e     # SDK auth flow fixtures + tracking, offline, conflicts, mobile
npm run format       # format source and configuration
```

Database tests execute the shipped SQL migration in embedded PostgreSQL (PGlite), with fixture `auth.users` and `auth.uid()`. They check owner CRUD, anonymous and cross-account denial, column grants, revision conflicts, and example rejection. Browser tests run the real Supabase JS SDK against intercepted fixture responses. They do not create external accounts or prove hosted email delivery. For an installed Chrome browser, `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e` is also supported.

After connecting a real project, verify with **two disposable test accounts**: create different notes, reload each, attempt to read or update the other notebook through the client API, and confirm no rows are returned/changed. Also test signup confirmation, an expired recovery link, signout, and a real second-device conflict.

## Deploy

This is a static frontend. Supabase hosts authentication and the database.

### Vercel or Netlify

- Import this folder/repository.
- Select Node 22 or later; install with `npm ci`, build with `npm run build`, publish **`dist`**.
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the hosting environment **before building**. Redeploy after changing them.
- `vercel.json` and `netlify.toml` supply SPA routing and response headers. The CSP allows the standard `*.supabase.co` host. If using a custom Supabase domain, explicitly add it to `connect-src` in both configs.
- Update Supabase's Auth Site URL and allowed redirects to your deployed HTTPS origin, including `/?reset=1`.
- Apply the SQL migration to the same project named by the frontend URL.
- Test account creation, email confirmation, password reset, persistence after reload, and account isolation. Install the app and test offline behavior with fictional/test data.

For another static host, upload `dist/`, serve `index.html` for application navigation, serve assets normally, and avoid caching `sw.js` or `index.html` indefinitely. Host at the origin root. The worker caches only the app shell and activates an update after old tabs close, preserving work in open tabs.

## Project layout

```text
src/components/    Authentication, navigation shell, reusable form controls
src/features/      Home, sleep, check-in, notebook, visit report, settings
src/hooks/         Auth lifecycle and notebook persistence/offline state
src/lib/           Typed models, validation, Supabase, repository, reports, exports
supabase/          Versioned database migration
tests/             Unit, PostgreSQL policy, and browser tests
public/            App icons
```

RLS enforces account boundaries but does not by itself make the app a regulated clinical system. This project does not claim HIPAA compliance or provide caregiver invitations, auditing, medical advice, or emergency alerts. Choose appropriate hosting, retention, and operating arrangements before a clinical deployment.

Official references: [Supabase password auth](https://supabase.com/docs/guides/auth/passwords), [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Vite deployment](https://vite.dev/guide/static-deploy).

## Daybook redesign

The home screen now offers Sleep, Symptoms & medication, and Visit preparation as large rows. Calendar navigation opens appointments with add/edit/delete and “Bring or ask” notes. Sleep and check-in answers use native radio buttons and checkboxes; optional symptom topics expand individually. Visit notes can be printed. Duplicate doses within ten minutes require confirmation.

The font is bundled locally. React DayPicker supplies keyboard calendar behavior. See `RESEARCH-DESIGN.md` for the research decisions. Appointments live in the existing protected notebook JSON; no extra database migration is needed. Older backups remain supported. Full JSON backups include appointments; CSV exports contain diary entries only.

Supabase can be configured after reviewing the design. Until then, choose **Explore the example notebook** on the sign-in screen. Example edits are temporary and disappear on reload.


### Recording flow update
Home and each recording screen expose Log sleep, Log symptoms and Log medication. Medication doses require a name and amount, with optional label strength and notes. Recently recorded names can be reused, but the amount must be entered each time. Laxatives retain their separate tracking category. Legacy unnamed doses remain clearly unspecified; no medicine details are invented. Named doses appear in the journal, CSV and visit report.

The author selector attributes a record within one account; it is not account switching or caregiver authorization. Separate caregiver invitations remain future work. Example sleep records are fictional and now labeled at their source. Theme follows the device by default, with neutral dark surfaces and a manual preference in Settings. Display dates use MM/DD/YYYY and sleep summaries use AM/PM.

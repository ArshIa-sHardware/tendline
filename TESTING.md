# Verification record

Tested locally on October 25, 2026.

- `npm run dev`: serves the app successfully. Interactive example opens without Supabase environment variables.
- `npm run build`: strict TypeScript checks and Vite/PWA production build.
- `npm test`: 34 passing checks covering validation/legacy imports, reports, auth forms, offline/conflict state, account-view unmounts, and the shipped SQL migration.
- SQL tests run actual PostgreSQL in PGlite with fixtures for Supabase's auth schema. They verify owner access, cross-account denial, anonymous denial, immutable ownership/revisions, stale update prevention, and example-write rejection.
- In-app browser: checked care-partner sleep editing, dose logging, symptom check-in, history/timeline, and inclusion in the generated visit report.
- In-app browser: all six main screens fit a 390-pixel phone viewport without horizontal overflow. Desktop layout inspected visually.
- `npm audit`: zero reported vulnerabilities at verification time.

## Remaining checks requiring an external environment

The Playwright browser suite is included, but Chrome could not launch in this execution environment (exited before any test ran). It is **not** recorded as passing. Run `npx playwright install chromium` and `npm run test:e2e` locally or use the included CI workflow.

No live Supabase project is connected yet. Verify email confirmation, login, reset-email delivery, new-password submission, cross-device persistence, and two-account isolation after completing README setup. Auth form tests mock Supabase methods; they verify client behavior, not live email delivery or project configuration. Installed PWA/offline behavior also needs testing on the intended phones.

## Daybook redesign verification — October 25, 2026

- 39 automated tests pass, including five added tests for legacy backup compatibility, appointment validation/create/edit, duplicate-dose detection across writing perspectives, and native selection controls.
- Production build passes; dependency installation reports zero vulnerabilities.
- In-app browser: created an example appointment with preparation notes; selected and saved a symptom; checked the retained sleep controls.
- At 390px, Today, Calendar, Notebook, Visit note, Settings and Check-in have no horizontal overflow. Desktop sidebar/calendar arrangement inspected at 1440px.
- Supabase remains unconfigured. Live email delivery and deployed auth redirects require the user's Supabase setup.
- The Playwright suite was updated for the revised navigation and controls. It has not been rerun successfully in this environment; do not count it as passing. Browser checks above are manual tool-driven verification.

## tendline redesign

- 44 automated tests pass, including structured observation rendering, zero-valued counts, fall/freezing labels, author selection, distinct conflicting author reports and enlargement validation.
- Desktop (1440px) and normal popup layout inspected. Main destinations checked at 390px with both 100% and 200% text; no horizontal page overflow after fixes.
- The popup is left at normal 100% text with viewport overrides removed. Secondary sleep details expand rather than filling the entire mobile overview.
- 200% was verified using the app's real text-size preference. Native browser zoom was not independently verified: the in-app browser did not respond to the zoom shortcut. The 720px reflow layout corresponds to the CSS viewport width of a 1440px browser at 200% zoom, but is not a claim of a native zoom test.
- No lint script exists in this project. Existing tests, TypeScript check and production build are the available automated checks. The Playwright suite has updated selectors but remains unverified in this environment.


### Recording flow verification (October 25, 2026)
49 unit/component/database tests pass, including new medication validation, backup/CSV/report retention, duplicate-dose handling, caregiver attribution, laxative category, and recent medicine reuse. Production build passes. In-app browser verified saving a fictional named dose and finding name/amount under the journal Medication filter. Sleep and medication screens checked at 390px with no page overflow. The separate Playwright suite was updated for the new flow but was not rerun successfully in this environment; it is not counted in the 49 passing tests.

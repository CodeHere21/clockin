# clockin

A work-from-home clock in/out tracker. The app is deliberately small; the Azure work
around it is the point.

**Live:** https://ambitious-bush-06ed08410.4.azurestaticapps.net/
Every push to `main` deploys. Lint, 30 tests and a typecheck gate the deploy — a red
gate skips it entirely.

## Two tracks, in parallel

| | Goal | Work from | When |
|---|---|---|---|
| **A — pass AZ-900** | The exam, ~4 weeks, ~15 h | [AZ-900-study-order.md](AZ-900-study-order.md) | weekday evenings |
| **B — build and ship this** | AZ-400 portfolio piece | [idea-2-clock-mutable-walrus.md](idea-2-clock-mutable-walrus.md) | weekends |

**The app is not how you learn Azure in the next four weeks — the Part 4 guided projects
are.** The app just needs to exist, be deployed, and get used daily so there is real data
in it later.

## Status

- [x] Azure free account + subscription
- [x] Azure DevOps org `litovko89` + private project — org region **Central US**
- [x] Billing linked, free grant live (1 parallel job, 1,800 min/month)
- [x] Region decided: **East US 2**
- [x] Frontend built, tested, building clean
- [ ] $5 budget alert on the subscription
- [x] GitHub public repo [`clockin`](https://github.com/CodeHere21/clockin)
- [x] Deployed to Azure Static Web Apps — **[live site](https://ambitious-bush-06ed08410.4.azurestaticapps.net/)**
- [ ] Azure CLI + `az bicep install`
- [ ] Temurin JDK 25 (not needed until the backend)

## The app

React 19 + TypeScript + Tailwind 4 on Vite 8, in [`web/`](web). State lives in
`localStorage`; there is no backend yet, by design.

```bash
cd web
npm install
npm run dev      # http://localhost:5173
npm test         # 37 tests
npm run build    # typecheck + production build
npm run preview  # serve the build; needed to exercise the service worker
npm run icons    # re-rasterise public/icon.svg after changing the mark
```

What it does: clock in/out, pause and resume for breaks, today and this-week totals
against targets, encouraging status lines, history grouped by day, and correcting any
past entry — including adding, removing and retiming its breaks. Plus JSON
export/import, because of the storage caveat below.

It is an installable PWA: add it to your home screen and it runs full-screen and fully
offline, which costs nothing because there is no server to be offline from.

### How it is laid out

| | |
|---|---|
| `web/src/lib/time.ts` | **The part that matters.** All hours math, pure, no clock reads — `now` is always a parameter. This is what becomes Java later. |
| `web/src/lib/time.test.ts` | 29 tests: break subtraction, open sessions, overnight shifts, both DST transitions, and correction validation |
| `web/src/lib/nudges.ts` | The status wording, with its tone rule written down |
| `web/src/lib/storage.ts` | `localStorage` with every read and write guarded |
| `web/src/components/` | ClockCard, Progress, History (with inline correction), Toolbar |
| `web/public/icon.svg` | Source of every app icon; `npm run icons` regenerates the PNGs |

Three decisions worth remembering:

- **Timestamps are ISO-8601 UTC strings, rendered in the browser's zone.** Same rule the
  backend will follow with `Instant`, so the migration is a transport change, not a rewrite.
- **A session belongs to the day it started**, so a shift past midnight stays in one piece.
- **Corrections are validated, breaks especially.** `breakMinutes` sums every break, so
  two overlapping ones would subtract the overlap twice. Since breaks became editable by
  hand, `validateSession` rejects overlaps, breaks outside their session, and inverted
  times, and Save stays disabled until the problems are gone.

### The storage caveat — this is a real limitation, not a note

`localStorage` lives in **one browser on one device**. There is no server, so there is
nothing for a second device to read: your phone and your laptop keep entirely separate
sets of data and always will, until a backend exists. Clearing site data erases what is
there.

Installing the PWA does not change this. A service worker caches the *app*, not your
hours, and each installed copy still has its own storage.

Until then: **Export JSON** from the Targets and backup panel, and import it on the other
device. That same file is the import path into the real backend when it arrives.

## Deploying to Static Web Apps

Push to GitHub first, then create the Static Web App in the portal and point it at the
repo. The wizard asks for build settings:

| Field | Value |
|---|---|
| App location | `/web` |
| Api location | *(leave blank)* |
| Output location | `dist` |

It generates a GitHub Actions workflow and commits it for you — that is your first
CI/CD pipeline, free, and you did not write it. Every pull request then gets its own
preview URL on the free tier.

## What this costs

Everything below is permanently free, not a trial that expires.

| | |
|---|---|
| Static Web Apps **Free** plan | Hosting, managed SSL, custom domain, 1M Functions executions |
| GitHub Actions on a public repo | Unlimited minutes |
| Azure DevOps free grant | 1 parallel job, 1,800 min/month |
| React, Vite, Tailwind, Vitest | Open source |

The backend phase adds Container Apps and Azure SQL, both of which also have permanent
free grants. Nothing in this project is on a 12-month clock.

## Sequencing

Changed on 2026-10-05: the frontend ships first, the backend waits until after the exam.
A Spring Boot weekend before AZ-900 would have delayed the thing actually being tested.

| | |
|---|---|
| **Now** | Deploy this to Static Web Apps. Start using it daily. |
| **Next 4 weeks** | Track A. Guided projects, portal work, practice assessment, exam. |
| **After the exam** | Spring Boot 4.1 + Java 25 + Azure SQL. Swap `localStorage` for API calls, then Bicep, Container Apps, Key Vault, canary deploys. |

## Conventions worth not relearning

- **This repo is public.** No subscription IDs, no connection strings, no keys — not in
  code, not in docs, not in comments.
- **Keep the hours math pure.** `now` stays a parameter. It is why the DST tests are
  possible at all.
- **Flyway from commit one** when the backend lands; `ddl-auto=validate`, never `update`.
  Direct fix for the Supabase incident on Canvas.
- **Build the image once, promote the same digest.** Never rebuild per environment.

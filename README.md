# Bathroom Status

A mobile-first web app for households to see whether the bathroom is occupied, check in/out with an estimated duration, reserve future time slots, and fairly resolve conflicts through a challenge system. Styled after a sunlit Mediterranean courtyard — ivory and sandstone, moss green, aged gold, with light and dark modes.

**Live app:** https://bathroom-status.vercel.app

## Features

- **Live status** — green Available / red Occupied card with a live countdown, updated for everyone within ~3 seconds (polling)
- **Check in / out / extend** — one tap, with duration presets and optional notes
- **Automatic checkout** — sessions past their estimate are expired lazily at read time (no cron required)
- **Reservations** — week and month calendar views with overlap prevention, nearest-slot suggestions, and weekly recurring slots
- **Challenge system** — anyone can challenge a reservation; the owner accepts (slot transfers) or declines; additional challengers queue in order
- **Notifications** — in-app feed on the home screen plus Web Push (check-ins, availability, challenges, 10-minute reservation reminders)
- **Household accounts** — no passwords; create a household, share the 6-character invite code, rejoin as an existing member from any device
- **Analytics** — dedicated page with You/House scopes: 14-day trend, busiest hours, weekday breakdown, leaderboard
- **PWA** — installable to the home screen; required for push notifications on iOS

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript) on Vercel — UI and API routes in one project
- [Neon Postgres](https://neon.com) via the Vercel Marketplace, with [Drizzle ORM](https://orm.drizzle.team)
- Tailwind CSS v4 + shadcn/ui (Base UI)
- `jose` for signed session cookies, `web-push` for notifications

Everything runs on the free tiers (Vercel Hobby + Neon Free). Hobby-plan constraints are designed around: session expiry is computed at read time, reservation reminders dispatch opportunistically on status polls, and the single daily cron only rolls recurring reservations forward and prunes old rows.

## Local development

```bash
npm install
vercel link                        # link to the Vercel project
vercel env pull .env.local --yes   # pulls DATABASE_URL + secrets
npm run db:push                    # sync schema to the database
npm run dev
```

Required env vars (see `.env.example`): `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate SQL migrations from the Drizzle schema |
| `npm run db:push` | Push the schema to the database |

## Project layout

- `src/app/(app)/` — authenticated pages (Home, Schedule, Reserve, Analytics, Profile)
- `src/app/welcome/` — onboarding (create / join household)
- `src/app/api/` — route handlers (status, check-in/out/extend, reservations, challenges, notifications, push, cron)
- `src/db/` — Drizzle schema and client
- `src/lib/` — auth, status/expiry logic, reservations, notifications, push
- `src/components/` — UI components, including `decor.tsx` (classical SVG ornaments) and the theme toggle

## Deployment

Deployed on Vercel; `vercel.json` defines the daily cron (`/api/cron/daily`). Deploy with:

```bash
vercel deploy --prod
```

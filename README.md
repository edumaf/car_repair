# Used Car Check

An iPhone app (Expo / React Native) that helps people avoid buying a bad used car. See [`CLAUDE.md`](./CLAUDE.md) for the
full brief and [`PROGRESS.md`](./PROGRESS.md) for where the project stands.

## Run it on your phone (Windows)

One-time setup:

1. Install **Node.js LTS** from nodejs.org and **Git** from git-scm.com.
2. Install **Expo Go** from the App Store on your iPhone.
3. The code lives in `F:\projects\car_repair` (already linked to GitHub). On a new computer:
   `git clone https://github.com/edumaf/car_repair.git`

Every time:

```bash
cd F:\projects\car_repair
git pull
npm install
npx expo start --clear
```

Then scan the QR code with the iPhone **Camera** app; it opens in Expo Go. Your PC and phone must be on the same Wi-Fi.
If the QR code doesn't connect (office or guest Wi-Fi), use `npx expo start --tunnel`.

## Commands

| Command | What it does |
|---|---|
| `npm start` | Start the dev server for Expo Go |
| `npm test` | Unit tests (Jest) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | Lint |
| `npx expo-doctor` | Checks dependency versions and config |
| `npm run fixtures` | Re-records the mock vehicle reports from live NHTSA data |

Install packages with `npx expo install <package>` (never plain `npm install <package>`), so versions match the Expo SDK.

## Project layout

```
data/                 Seed data: checklist, repair costs, listing red flags (source of truth for facts)
src/app/              Screens (expo-router; every file is a route)
src/core/             Pure TypeScript, no React Native: VIN, NHTSA normalization, verdict, API clients + mocks
src/db/               SQLite schema, migrations, app_meta
src/design/           Design tokens, fonts and shared components
scripts/              Developer scripts (mock fixture builder)
```

Kept from the Expo template: `src/app` as the routes folder and the `@/` import alias for `src/`.

## Mock mode

Until the backend exists (Milestone 1), the app uses mock API clients (`EXPO_PUBLIC_USE_MOCKS=1`, also automatic when
no Supabase URL is set). The vehicle reports in `src/core/api/mocks/fixtures/` are **real NHTSA data** for six sample
cars; their VINs are synthetic (real model prefix + made-up serial):

| Car | Powertrain | Sample VIN |
|---|---|---|
| 2018 Honda Civic | gas | `2HGFC2F78JH900001` |
| 2015 Ford F-150 | gas | `1FTEW1EG5FK900001` |
| 2013 Nissan Altima | gas (CVT) | `1N4AL3AP4DC900001` |
| 2017 Toyota Prius | hybrid | `JTDKBRFU3H3900001` |
| 2019 Tesla Model 3 | EV | `5YJ3E1EA5KF900001` |
| 2012 Volkswagen Jetta TDI | diesel | `3VW3L7AJ4CM900001` |

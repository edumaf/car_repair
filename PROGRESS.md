# Used Car Check — Progress log

> **For every new chat / Claude session:** read `CLAUDE.md` (the brief) and then this file before doing anything.
> Update this file at the end of every milestone or work session (what was done, what's next, open owner actions),
> in the same PR as the work.
>
> **Owner's opening prompt for a new chat** (copy-paste):
> ```
> Read CLAUDE.md and PROGRESS.md before doing anything.
>
> 1. Summarize in 5–8 short lines: what's done, what's in progress, and what I (the owner) still need to do.
> 2. Check GitHub: are there open PRs or unmerged branches? Is PROGRESS.md up to date with main?
> 3. Tell me the next step, then wait for my OK before you start building.
>
> Rules for this chat:
> - I write in Romanian or English; you always reply in English, short and simple.
> - Give me instructions one step at a time and wait for "done".
> - Never ask me to paste secret keys in the chat.
> - Every change goes through a PR into main.
> - At the end of the session (or each milestone), update PROGRESS.md in the same PR.
> - Crystal Check (edumaf/crystal_app) has priority if Apple asks for fixes.
> ```

Last updated: **2026-11-16** (M0 built, waiting for the owner to test it on the phone).

## Status at a glance

| Milestone | Planned (CLAUDE.md §0) | Status |
|---|---|---|
| M0 — Skeleton, data, design | Nov 16–19 | 🟡 Built, owner to test in Expo Go |
| M1 — Add a car + vehicle report | Nov 16–19 | ⏳ Next |
| M2 — Guided inspection + photo checks | Nov 20–25 | ⏳ |
| M3 — Verdict, repairs, questions, script | Nov 26–Dec 1 | ⏳ |
| M4 — Listing check + price check | Nov 26–Dec 1 | ⏳ |
| M5 — Garage, compare, onboarding, paywall, quotas, dev build | Dec 2–6 | ⏳ |
| M6 — Share, Learn, analytics, settings, polish, store assets | Dec 7–10 | ⏳ |
| M7 — Submit to App Store | **Dec 10–11** | ⏳ |

Schedule: **on track** (M0 done on day 1 of the M0+M1 window).

## What exists today (M0)

- **Project:** Expo SDK 58 (same as Crystal Check), TypeScript strict, expo-router, created with `create-expo-app`.
  Installed: expo-sqlite, expo-haptics, expo-blur, vector icons, fonts (Barlow Condensed, Inter, JetBrains Mono),
  zustand, react-query, zod; dev: jest-expo, Testing Library, ESLint, tsx.
- **Tabs:** Garage · Check (raised center button) · Learn · Settings. Garage shows the empty state; Check lists the
  four ways to add a car (disabled, coming in M1); Learn lists guide titles (written in M6); Settings shows the
  disclaimers, plus a dev-only section (Design preview, API mode, seed data status).
- **Design system** (`src/design/`): tokens from §12 (light + dark), fonts, `AppText`, `Button`, `Card`, `Screen`,
  `Row`, `Tag`/`SeverityTag`, and signature components `VerdictSignal`, `ProblemAreaBar`, `CostRangeBar`, `VinText`.
  Not built yet: `CheckItemCard`, `PhotoFindingChip`, `ProgressRing`, editable `VinField` (with their milestones).
- **Seed data:** `src/core/data/seed.ts` (typed access) + zod schemas with cross-file checks; validated in
  `seed.test.ts` and at startup in dev builds (an error screen lists any problem). Data is valid as delivered.
- **SQLite:** tables `cars`, `answers`, `photo_checks`, `comparables`, `app_meta` (§5.2), migrations via
  `user_version`; the seed data version is stored in `app_meta`.
- **VIN:** `src/core/vin/vin.ts` validation (17 chars, no I/O/Q, check digit = warning only), barcode parsing,
  3-6-8 grouping, masking. Fully tested.
- **NHTSA normalization** (`src/core/vehicle/normalize.ts`): vPIC decode → powertrain/engine/drive, recalls
  (dedupe by campaign), complaints → our complaint groups with counts and short samples, safety rating. Pure TS so
  the M1 `/vehicle` function can reuse it. Fully tested.
- **Mock API clients** (`src/core/api/`): vehicle, photo check, listing, quota; mocks on until Supabase is set up.
  Six fixture cars recorded from **live NHTSA data** with `npm run fixtures` (list in README).
- **Stubs** (types + signatures, throw "not implemented"): `buildChecklist` (M2), `computeVerdict` (M3),
  `matchListingFlags` and `priceCheck` (M4). Photo-check contract (allowed findings, lights) in
  `src/core/photoCheck/types.ts`.
- **Quality gates (M0):** `tsc` clean · 67 Jest tests pass · `expo lint` clean · `expo-doctor` 20/20 ·
  iOS bundle exports. Screens checked in a browser (light + dark); not yet on a real iPhone.

## Decisions made

- **Plain SQL instead of drizzle-orm** (the brief allows either); fewer moving parts. Same raw-SQL style as Crystal.
- **Seed data is read straight from the bundled JSON**, not copied into SQLite (it's static, and nothing needs to
  search it with SQL). `app_meta.data_version` records which version the user's answers were made with.
- Kept from Crystal Check: infrastructure patterns only (DB migrations, app_meta, root layout startup). No UI,
  tokens, copy or layouts (guideline 4.3).

## Things learned about NHTSA (important for M1)

- `api.nhtsa.gov` answers **"no results" with HTTP 400** and a normal body `{"count":0,"results":[]}`. The
  `/vehicle` function must treat that as empty, not as an error.
- **2015 Ford F-150 has 0 complaints** in the complaints API under "F-150" and "F150" (recalls work: 14). 2016 has
  only 120. Coverage gaps exist; the report must show "no complaint data" gracefully. Check more models in eval (§16).
- vPIC reports regular hybrids as `Strong HEV (Hybrid Electric Vehicle)` (fixed in `derivePowertrain`, tested).
- vPIC often gives `4x2` as the drive type for sedans; we show "2WD".
- Complaint summaries are user text with NHTSA's own redactions (`XXX`). We quote ≤ 200 characters.

## Owner actions (open)

1. **Test M0 on the iPhone** (steps below) and reply OK or with screenshots.
2. **Before M1:** create a **new Supabase project** for this app (separate from Crystal Check), turn on anonymous
   sign-ins. Instructions come step by step at the start of M1. Never paste keys in the chat.
3. Decide the **final app name** and check it's free on the App Store (§18.1). "Used Car Check" is a working name.
4. **Check your employment contract** for side-project / non-compete clauses (§18.6).
5. Later: a mechanic skims `data/*.json` (§18.7); collect ~40 eval photos by **Dec 6** (§16).

## How to test M0 on the phone

```
cd F:\projects\car_repair
git pull
npm install
npx expo start --clear
```
Scan the QR code with the iPhone Camera → opens in Expo Go. Check:
1. The app opens on **Garage** with "DON'T BUY A LEMON." and a blue **Check a car** button (no red error screen).
2. The tab bar has **Garage · Check · Learn · Settings**, with a raised blue round **Check** button in the middle.
3. **Check a car** goes to the Check tab with 4 greyed-out options marked "NEXT".
4. **Settings → Design preview:** traffic-light verdicts, tags, Nissan Altima complaint bars, repair range, VIN.
5. Switch the iPhone to **Dark mode** (Control Center) and look at the screens again.

## Next steps

1. Owner tests M0 → merge the M0 PR.
2. **M1:** Supabase project + `/vehicle` Edge Function (NHTSA decode/recalls/complaints/ratings, model-name
   variants, 7-day cache, Deno tests with recorded fixtures), VIN barcode scan, VIN typing with check digit,
   year/make/model picker, vehicle report screen.

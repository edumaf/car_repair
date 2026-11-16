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

Last updated: **2026-11-17, later** (price check, compare, onboarding, paywall + free limits, share card, Learn; owner to test).

## ⚠️ Scope change (owner decision, 2026-11-16) — read CLAUDE.md "Scope change" first

Worldwide from v1.0, our own model database (~200 generations), a Diagnose tab (error codes + symptom flows), nothing
cut. **New submission target: ~Dec 20** (early January if it slips past Dec 22). English + Romanian at launch.

## Status at a glance

| Milestone | Status |
|---|---|
| M0 — Skeleton, data, design | ✅ Done, tested on the owner's iPhone (edumaf/car_repair#1) |
| M1 — Add a car + vehicle report | 🟡 App side built (VIN scan/typing, model picker for any country, NHTSA for US cars). **Backend `/vehicle` waits for Supabase** |
| M2 — Guided inspection + photo checks | 🟡 Built. **Real AI photo checks wait for the backend** (sample results until then) |
| M3 — Verdict, repairs, questions, script | ✅ Built + tested |
| **M-D — Model database + Diagnose (new)** | 🟡 Data + screens built. Left: **Romanian translation**, mechanic review of the data |
| M4 — Listing check + price check | 🟡 Pasted-text check + **price check** done. Left (backend): screenshots, VIN photo |
| M5 — Garage/compare, onboarding, paywall, quotas, dev build | 🟡 Filters, **compare**, **onboarding**, **paywall (simulated)**, local free limits done. Left: RevenueCat, server quotas, pass-expiry reminder, dev build |
| M6 — Share, Learn, analytics, settings, polish, store assets | 🟡 **Share card**, **Learn guides**, Settings (Premium, restore, delete my data) done. Left: analytics, store assets, eval light |
| M7 — Submit | **~Dec 20** |

**Critical path:** Supabase backend (start by Nov 20), then Romanian translation, paywall, dev build.

## What exists today

**From the earlier sessions (edumaf/car_repair#1, #2):** Expo SDK 58 app; VIN scan/typing; NHTSA lookup (dev-only
direct mode); report; guided inspection with notes, photos and AI-suggestion chips (samples); verdict engine (§8) with
questions and a 2-tone script; offline listing check; garage list. See git history for details.

**Model database & Diagnose (this session)**
- **Data** (all AI-drafted, validated by tests, **must be reviewed by a mechanic**):
  - `data/models/*.json`: **213 model generations, 923 known problems** (VW/Skoda/Seat/Audi 51, Dacia/Renault/
    Peugeot/Citroën/Opel 44, Ford/BMW/Mercedes/Fiat/Volvo 46, Toyota/Honda/Nissan/Mazda/Hyundai/Kia/Mitsubishi/
    Suzuki/Subaru/Chevrolet/Jeep/Tesla 72). Each: engines, strengths, problems by engine/years (signs, what to check,
    severity, frequency, repair-cost link), buying tips, VIN hints.
  - `data/obd_codes.json`: **195 generic OBD-II codes** with drive/stop advice and causes (most likely first).
  - `data/symptoms.json`: **26 symptom flows, 88 outcomes** (warning lights, noises, shaking, smoke/smells, leaks,
    starting, driving, gearbox, A/C and electrics).
  - `data/repair_costs.json`: 20 more ranges (injectors, DSG mechatronic, EGR, dual-mass flywheel, AdBlue…).
  - Validation (`knowledgeSchema.ts`): ids, engines, years, repair-cost and complaint-group references, symptom flows
    (no dead ends, no loops, every outcome reachable), safety (urgent outcomes always say "see a mechanic").
- **Cars from any country:** "Pick make and model" (our list: make → generation → engine → year). A VIN NHTSA doesn't
  know (European cars) goes straight there, pre-filled from the VIN (manufacturer code; VW-group model code + year, so
  a Romanian Golf 6 VIN becomes "Golf Mk6, 2011"). "My car isn't listed" → free entry. US cars matched by NHTSA are
  linked to our model automatically when it's unambiguous.
- **Report:** "About this model" card (engine picker, strengths, common problems for that engine/year with signs and
  what to check, buying tips). Non-US cars: clear "official recall data not available for this market" + links to
  **GOV.UK MOT history** (UK) or **RAR** (Romania).
- **Inspection:** the model's problem areas are pushed first, and each matching check shows a "Known for this model"
  box (e.g. the timing-chain cold-start check on a 1.4 TSI).
- **Diagnose tab** (new, between Garage and Check): search codes (by code or words; manufacturer-specific codes get an
  honest explanation), code page (drive/stop banner, causes most-likely-first, what to try yourself, US cost range in
  the US), symptom flows (questions → urgency, causes, "see a mechanic if").
- **Region** (Settings, detected from the phone): km/mi, which history links appear, and **US repair prices only in
  the US** (elsewhere severity only, per the brief).
- Database migration 3: `cars.model_id`, `engine_id`, `mileage_unit`.

**Price check, compare, onboarding, paywall, share, Learn (2026-11-17, later)**
- **Price check** (`src/core/price/priceCheck.ts`, tested): the user adds similar listings; ≥ 3 with mileage →
  least-squares fit, fair range (± max(residual SD, 5%)), below/within/above; fewer → min/median/max. Feeds the
  verdict (above → Negotiate) and floors the suggested offer. Links to KBB/Edmunds (US), Autovit/OLX (RO), Auto
  Trader (UK), mobile.de (EU). Prices shown in the region's currency (€ for Romania).
- **Garage:** status filters; **compare 2–3 cars** side by side (verdict, repairs, price, price vs similar, mileage,
  engine, recalls, known problem areas).
- **Onboarding** (§11): welcome, 4 questions, camera priming; "I own a car with a problem" goes to Diagnose.
- **Paywall** (§9): pass pre-selected, headline from the "biggest worry" answer, restore, close. Purchases are
  **simulated** until RevenueCat + dev build (Settings → Developer → Simulate Premium).
- **Free limits (local until /quota exists):** 1 inspected car, 10 AI photo checks, price check and compare are
  Premium; paywall once after the first vehicle report.
- **Share card** (§13): story/post, generic silhouette, verdict, 3 facts, "Free check" mark for free users; no VIN,
  plate, price or photos.
- **Learn:** 8 offline guides in `content/learn.json` (tire date, coin tread test, PPI, papers incl. Romania, scams,
  test drive, OBD2 reader, warning lights).
- **Settings:** Premium status, restore, **delete all my data**, region, dev toggles (simulate Premium, show
  onboarding again).

**Quality gates:** `tsc` clean · **264 Jest tests** (was 243) pass · `expo lint` clean · `expo-doctor` 20/20 · iOS bundle
exports. Clicked through in a browser: Romanian Golf 6 VIN → engine → report with model card and RAR link → inspection
with "Known for this model" → Diagnose: P0301, "shakes at idle" flow, manufacturer code P1234.

## Decisions made

- Plain SQL; seed/knowledge data read straight from bundled JSON (validated by tests and at dev startup).
- Dev-only direct NHTSA mode; release builds can't use it (§2.8).
- **No paid VIN decoder** (owner agreed): outside the US the user confirms make/model/engine; free VIN hints pre-fill.
- Model data is split per make group (`data/models/*.json`) instead of one huge `models.json`; a test checks every file
  is loaded.
- VIN model codes and years are only hints: the user always confirms.
- Repair costs are US ranges: shown only when the region is the US. Romanian (RON) costs need a reviewed price list.
- `ProgressRing` (§12) still waits for `react-native-svg` (not in §3). **Owner: OK to add it? (works in Expo Go)**

## Things learned about NHTSA

- "No results" comes back as HTTP 400 with a normal body (handled). 2015 F-150 has 0 complaints in the API.
- vPIC decodes European VINs to the make at most (Dacia/Skoda: "manufacturer not registered"), so non-US cars use our
  model list.

## Owner actions (open)

1. **Test this PR on the iPhone** (steps below).
2. **By Nov 20: Supabase project** for this app (separate from Crystal Check). Steps come at the start of that session.
3. **Find a mechanic to review the data** before launch: `data/models/*.json` (start with the most common models in
   Romania: Logan, Golf, Octavia, Astra, Focus, Passat, Duster), `obd_codes.json`, `symptoms.json`, repair costs.
4. Final app name; employment-contract check; eval photos by Dec 6 (unchanged).
5. Romanian translation will need your review (a list of texts in the app).
6. Provide **terms of use + privacy policy URLs** and a **support email** (paywall and Settings need them).

## How to test on the phone

```
cd F:\projects\car_repair
git pull
npm install
npx expo start --clear
```
Then:
1. **Settings → Your region:** should show **Romania**. Data source: **Real NHTSA (dev)** is fine.
2. **Check → Type the VIN** of a European car (e.g. a VW, Skoda, Dacia from the street; or `WVWZZZ1KZBW123456`).
   You'll see the check-digit warning (normal for EU cars) → **Look it up** → the app asks for the engine/model
   (pre-filled from the VIN) → save.
3. Report: **About this model** (tap a problem to see signs and what to check) and the **RAR** button.
4. **Start the inspection** → "Under the hood": a blue **Known for this model** box.
5. **Diagnose tab:** search `P0420` and `P1234`; try **Engine shakes or runs rough at idle** and **Fluid under the car**.
6. Check → **Pick make and model** → e.g. Dacia → Duster → engine → year.
7. A US car still works as before (sample VIN `1N4AL3AP4DC900001`).
8. **New this round:** first launch shows the **onboarding** (if it doesn't, Settings → Developer → Show onboarding
   again). After the first report the **paywall** appears once: close it. Settings → Developer → **Simulate Premium**
   on, then try **Price check** (add 3 listings), **Compare cars** in the Garage, and **Share card** on a verdict.
   **Learn** tab: open a guide. Settings → **Delete all my data** resets everything.

## Next steps

1. Owner tests → merge PR edumaf/car_repair#2.
2. **Backend (critical path):** Supabase, `/vehicle` (reuses `src/core/vehicle/nhtsa.ts`), `/photo-check`,
   `/listing-check`, `/quota`; free-text symptom → symptom id (AI) for Diagnose.
3. **Romanian translation** (UI first, then data files) with the owner's review: the next big chunk of work.
4. RevenueCat + dev build (real purchases), analytics, store assets, eval light.

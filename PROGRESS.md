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
> 3. If "NEXT CHAT: START HERE" below says a phone test is pending, walk me through it first,
>    one step at a time, and note what fails.
> 4. Tell me the next step, then wait for my OK before you start building.
>
> Rules for this chat:
> - I write in Romanian or English; you always reply in English, short and simple.
> - Give me instructions one step at a time and wait for "done".
> - Never ask me to paste secret keys in the chat.
> - Every change goes through a PR into main.
> - At the end of the session (or each milestone), update PROGRESS.md in the same PR.
> - Crystal Check (edumaf/crystal_app) has priority if Apple asks for fixes.
> ```

Last updated: **2026-11-16, end of session** (backend code ready to deploy, English + Romanian, app icon; **owner to test**).

## ▶ NEXT CHAT: START HERE

**State:** everything is on branch `claude/fervent-bohr-s8o6sg`, open as PR edumaf/car_repair#2 (not merged).
Nothing has been tested on the iPhone since the M0 test. **The owner must test it now** using the step-by-step list in
"How to test on the phone" below (tests A–L). Walk the owner through it **one step at a time**, wait for "done" or a
description/screenshot of the problem, write down every failure, then fix them in the same PR before merging.

What's new since the last phone test (all needs testing):
1. Price check, compare cars, onboarding, paywall (simulated) + free limits, share card, Learn guides.
2. Worldwide add-car (European VINs → pick model/engine), model pages, Diagnose tab (error codes + symptom flows).
3. **English + Romanian**: phone language picks it; Settings → Language switches.
4. App icon + splash.
5. Backend code (`supabase/`) is written and unit-tested but **not deployed**: it can't be tested on the phone until the
   owner creates the Supabase project (owner action 2). Until then the app uses "Real NHTSA (dev)" or "Sample cars".

After the test passes: owner merges PR #2 → next work is in "Next steps" below.

## ⚠️ Scope change (owner decision, 2026-11-16) — read CLAUDE.md "Scope change" first

Worldwide from v1.0, our own model database (~200 generations), a Diagnose tab (error codes + symptom flows), nothing
cut. **New submission target: ~Dec 20** (early January if it slips past Dec 22). English + Romanian at launch.

## Status at a glance

| Milestone | Status |
|---|---|
| M0 — Skeleton, data, design | ✅ Done, tested on the owner's iPhone (edumaf/car_repair#1) |
| M1 — Add a car + vehicle report | 🟡 App + backend code built (`supabase/functions/vehicle`). **Waits for the Supabase project to deploy** |
| M2 — Guided inspection + photo checks | 🟡 Built, `/photo-check` written + tested. **Real AI waits for deploy + an AI key** |
| M3 — Verdict, repairs, questions, script | ✅ Built + tested |
| **M-D — Model database + Diagnose (new)** | 🟡 Data + screens built. Romanian: UI, checklist, listing signs, guides done; **left: OBD codes, symptoms, models**; mechanic review |
| M4 — Listing check + price check | 🟡 Pasted-text check + **price check** done. Left (backend): screenshots, VIN photo |
| M5 — Garage/compare, onboarding, paywall, quotas, dev build | 🟡 Filters, **compare**, **onboarding**, **paywall (simulated)**, local free limits done. Left: RevenueCat, server quotas, pass-expiry reminder, dev build |
| M6 — Share, Learn, analytics, settings, polish, store assets | 🟡 **Share card**, **Learn guides**, Settings (Premium, restore, delete my data) done. Left: analytics, store assets, eval light |
| M7 — Submit | **~Dec 20** |

**Critical path:** Supabase project from the owner (deploy the ready backend), Romanian data translation, RevenueCat, dev build.

### Session 2026-11-16 (later)
- **Backend written, ready to deploy** (`supabase/`, README "Backend"): migration (usage counters, cache, RLS),
  functions `vehicle`, `photo-check` (§7.2 prompt, allowed findings, retry, refund on unusable photo), `listing-check`
  (screenshots = Premium, VIN photo = free with a daily cap, contacts scrubbed), `quota` (status, delete data).
  30-day pass expiry is computed from RevenueCat purchase dates (stacked passes add up), so no `passes` table.
  20 Deno tests. The app's live clients (anonymous Supabase sign-in, friendly errors, paywall on HTTP 402) are wired;
  they switch on when `.env.local` has the Supabase URL + anon key.
- **English + Romanian** (CLAUDE.md scope change §6): gettext-style `tr()`; English text is the key, Romanian in
  `src/core/i18n/ro.json` (UI, 638 strings) and `data/i18n/ro.json` (checklist, listing warning signs, Learn guides).
  The phone's language picks it; Settings → Language switches. `npm run i18n` lists gaps; Jest fails on any missing
  string. Listing check now matches Romanian OLX/Autovit phrases with or without diacritics.
- App icon + splash (white car with a green check on blue).

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

**Quality gates:** `tsc` clean · **291 Jest tests** + 20 Deno tests pass · `expo lint` clean · `expo-doctor` 20/20 · iOS bundle
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
5. **Review the Romanian texts:** `src/core/i18n/ro.json` and `data/i18n/ro.json` (English → Romanian, one per line).
6. Provide **terms of use + privacy policy URLs** and a **support email** (paywall and Settings need them).

## How to test on the phone

Setup (once, on the Windows PC):
```
cd F:\projects\car_repair
git fetch
git checkout claude/fervent-bohr-s8o6sg
git pull
npm install
npx expo start --clear
```
Scan the QR code with the iPhone camera → opens in **Expo Go**. If the app was open before, shake the phone → Reload.

Each test: what to do → what you should see. Report anything different (a screenshot helps).

**A. First launch (onboarding)** — if the app opens straight to the Garage: Settings → Developer → Show onboarding
again.
1. Welcome screen: "Don't buy a lemon." (or Romanian "Nu cumpăra o rablă." if the phone is in Romanian) → Get started.
2. Answer the 4 questions → camera screen → "Not now" → you land in the Garage.

**B. Language**
1. Settings → **Language → Română**: the whole app redraws in Romanian and you stay in Settings.
2. Tabs read Garaj · Diagnoză · Verifică · Învață · Setări. Switch back to English: everything is English again.
3. Close and reopen the app: the language you chose is kept.

**C. Region** — Settings → Your region: Romania (or the phone's country). Data source: **Real NHTSA (dev)**.

**D. US car by VIN** — Check → Type the VIN → `1N4AL3AP4DC900001` (sample Nissan Altima; with "Sample cars"
data source) or any real US VIN → Look it up → add a price and mileage → Save. You should see recalls, owner-complaint
bars, crash rating. The **paywall** appears once after the first report: close it with ✕.

**E. European car by VIN** — Check → Type the VIN of a car on the street (VW/Skoda/Dacia) or `WVWZZZ1KZBW123456`.
A check-digit warning is normal for EU cars → Look it up → the app asks to confirm make/model (pre-filled) and the
engine → Save. Report shows **About this model** (tap a problem: signs + what to check) and a **RAR** history button.

**F. Pick make and model** — Check → Pick make and model → Dacia → Duster → engine → year → Save.

**G. Inspection** — on a car: Start the inspection → answer a few items (Looks OK / Problem / Not sure / Skip), add a
note, take a photo of a tire (AI result is a **sample** until the backend is live) → Confirm or Dismiss the AI chip.
"Under the hood" shows a blue **Known for this model** box for model-database cars. Then **See the verdict**: headline,
"Why", questions for the seller, negotiation script (Friendly / Firm, Copy).

**H. Listing check** — on a car report, paste:
`Vând urgent, plată în avans, livrare prin curier. Fără acte, km necunoscuți.` → Check the listing →
**Possible scam** with several warnings, in Romanian if the app is in Romanian. Also try English:
`wire transfer only, car is in storage` → Possible scam.

**I. Diagnose tab** — search `P0301` → causes, "Try yourself", urgency banner. Search `P1234` → "manufacturer-specific".
Pick **Engine shakes or runs rough at idle** → answer the questions → an outcome with likely causes.
(Code/symptom texts are still English: Romanian data translation is next.)

**J. Premium features** — Settings → Developer → **Simulate Premium** on. Then: car → **Price check** (add 3 similar
listings with price + mileage → fair range), Garage → **Compare cars** (pick 2), verdict → **Share card**
(Story / Post → share sheet opens).

**K. Learn** — open 2 guides; in Romanian they should be fully Romanian.

**L. App icon + delete data** — home screen icon is Expo Go's (the real icon shows only in a dev/store build: OK).
Settings → **Delete all my data** → confirm → back to onboarding, garage empty.

## Next steps

1. Owner tests → merge PR edumaf/car_repair#2.
2. **Deploy the backend** once the owner creates the Supabase project (README "Backend"); free-text symptom →
   symptom id (AI) for Diagnose.
3. **Romanian data:** OBD codes, symptom flows, model pages (same dictionary approach), then owner review.
4. Listing screenshot + VIN photo buttons in the app (backend + clients are ready).
5. RevenueCat + dev build (real purchases), analytics, store assets, eval light.

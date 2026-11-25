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

Last updated: **2026-11-25, during the phone test** (round 2, fixes 1–6 below). Before that, 2026-11-17: phone-test
fixes, listing/VIN photo features, data eval, analytics, full Romanian, release prep, bug hunt, design round 2.

## ▶ NEXT CHAT: START HERE

**State:**
- PR edumaf/car_repair#2 (branch `claude/fervent-bohr-s8o6sg`): everything up to 2026-11-16. Not merged.
- PR edumaf/car_repair#3 (branch `claude/vibrant-cori-kyx5fo`) is **built on top of #2**: merge #2 first, then #3.
- **Test from branch `claude/vibrant-cori-kyx5fo`** (it has everything in #2 plus this session's work).

**Full phone test, second round (2026-11-18 → 11-25, branch `claude/vibrant-cori-kyx5fo`):**
- ✅ A onboarding · ✅ B language · ✅ C region · ✅ D US car by VIN · ✅ E European VIN · ✅ F pick make and model.
- 🟡 **G inspection:** steps 1–7 ✅ (answer colors, Next item, keyboard, notes, photo chip, "Known for this model"
  box). Step 8 (verdict script) waits for ≥ 40% of the checks (see fix 6).
- ⏳ H–Q not done yet.
- **Fixes from this round (all pushed to PR #3):**
  1. Screen headers stayed in the starting language after switching (React Compiler cached `tr()` in the root
     layout) → root layout opts out (`'use no memo'`), regression test `core/i18n/compilerSafety.test.ts`. ✅ re-tested
  2. Price/mileage hidden behind the number pad on Add a car → `FormScroll` (ScrollView with
     `automaticallyAdjustKeyboardInsets`) on add car, price check, verdict. ✅ re-tested
  3. "Looks OK" jumped to the next item → only Skip moves on; OK shows a hint + **Next item** (owner wants to add
     notes after OK). ✅ re-tested
  4. Verdict button in the inspection was easy to miss → small traffic light next to it (`MiniSignal`). ✅
  5. No way back to the car report from the inspection → Garage opens inspection/verdict **on top of the report**
     (`features/car/openCar.ts`, router test), back button says "Report". ✅ re-tested
  6. Owner couldn't find Friendly/Firm on a "Keep checking" verdict → card says when the script appears
     ("once you've done 22 of the 54 checks"). Needs a phone check.
  7. Going through 54 checks with only Back/Next was slow → **All checks** list (tap "All checks 14/54" under the
     section chips): every check by section with its answer icon, search (accents ignored, RO + EN), "Only
     unanswered", tap to jump (`features/inspection/AllChecksSheet.tsx`, `core/checklist/checksList.ts`, tested).
     **Swipe left/right** between checks (`hooks/useHorizontalSwipe.ts`, plain touch events) with a short slide-in
     (still with Reduce Motion). Needs a phone check.
- **Owner decisions this round:** carVertical-style history reports → **after launch**, as an affiliate link
  ("Check the car's history", clear commission note; owner signs up). **Interface pass after all tests:** the owner
  finds the car report page "too AI-made" — redesign it (and review the other screens) once A–Q pass.
- Known, not urgent: `expo lint` shows 11 React Compiler errors (refs read during render in the car report,
  VerdictSignal, useKeyboardShown; setState in an effect). They predate this round; the compiler skips those
  components, so they work — clean up during the interface pass. Region change doesn't redraw already-open screens
  until they reopen (compiler caching, same cause as fix 1).
- Merge plan (owner asked): **test first, then merge #2, then #3** (PR #3 contains #2).

**The 4 fixes from the phone test are done** (offline fallback, 44 pt engine buttons, engine picked from the VIN,
clear VIN model match).

**New since the last phone test (needs a phone check):**
1. Check tab → **Take a photo of the VIN** (camera or photo library; sample VIN until the server is live).
2. Car report → Listing check → **Read it from screenshots** (Premium; sample text until the server is live).
3. Price check → **Fill in from a screenshot**; asking price far below similar listings → **"Far below typical"**
   warning, also in the verdict and compare.
4. Night look on the **paywall, Diagnose, Learn, share card**; car drawings by body type in the garage and report.
5. **Everything in Romanian**, including Diagnose codes, symptom flows and model pages; Romanian numbers ("118.000 km",
   "8.500 €").
6. Diagnose search finds **symptoms by words** ("shakes", "nu pornește").
7. Settings → **Share anonymous usage stats** switch (analytics stay off until a PostHog key exists).
8. **Design round 2** (owner asked for "very cool, very intuitive"): night onboarding where your progress is a car
   driving along a road; Garage cards with one clear next step (Start / Continue / See the verdict) and a
   **"Continue: <car>"** button; report **tiles** (recalls, complaints, known problems, crash rating) that jump to
   their section; inspection **walk-around map** (the part of the car you're checking lights up); verdict reveal
   (the traffic light sweeps, then lands on the verdict).

## ⚠️ Scope change (owner decision, 2026-11-16) — read CLAUDE.md "Scope change" first

Worldwide from v1.0, our own model database (~200 generations), a Diagnose tab (error codes + symptom flows), nothing
cut. **New submission target: ~Dec 20** (early January if it slips past Dec 22). English + Romanian at launch.

## Status at a glance

| Milestone | Status |
|---|---|
| M0 — Skeleton, data, design | ✅ Done, tested on the owner's iPhone (edumaf/car_repair#1) |
| M1 — Add a car + vehicle report | 🟡 App + backend code built and **evaluated on 41 US models** (docs/eval-vehicle.md). **Waits for the Supabase project to deploy** |
| M2 — Guided inspection + photo checks | 🟡 Built, `/photo-check` written + tested. **Real AI waits for deploy + an AI key** |
| M3 — Verdict, repairs, questions, script | ✅ Built + tested |
| M-D — Model database + Diagnose | ✅ Data + screens + **full Romanian**. Left: mechanic review of the data |
| M4 — Listing check + price check | ✅ App side done (paste, screenshots, VIN photo, comps by screenshot, field flags). Real AI waits for deploy |
| M5 — Garage/compare, onboarding, paywall, quotas, dev build | 🟡 All app screens done; `eas.json` ready. Left: **RevenueCat** (owner account), server quotas live (deploy), pass-expiry reminder, dev build |
| M6 — Share, Learn, analytics, settings, polish, store assets | 🟡 Share card, Learn, Settings, **analytics (§14 events)**, eval §16.1, **store listing draft**, **privacy/terms drafts** done. Left: PostHog key, eval photos §16.2 (owner), screenshots |
| M7 — Submit | **~Dec 20** |

**Critical path (all need the owner):** Supabase project → deploy backend + AI key; RevenueCat + App Store Connect
products; Expo/EAS account → dev build; app name + bundle ID; privacy/terms URLs.

### Session 2026-11-17 (this session)
- **Phone-test fixes 1–4** done (see above). Network errors are friendly and translated (were "Failed to fetch").
- **Listing check from screenshots, VIN from a photo, similar listings from a screenshot** (mock until the server is
  live). Temporary images go to a cache folder and are deleted after reading.
- **Field-based warning signs** (`data/listing_red_flags.json` → `field_flags`): asking price far below the similar
  listings (< 75% of the fitted price), mileage not stated. Listing card, verdict and compare share
  `listingFlagsForCar`.
- **Eval light §16.1** (`npm run eval:vehicle` → `docs/eval-vehicle.md`): 41 popular US models by VIN, **41/41 OK**.
  Fixed: Silverado/Sierra 1500 lost 10 of 12 recalls and all 800 complaints (load class now in the model name);
  Mercedes ("C-Class" + "C300") and Lexus ("ES" + "350") recalls are now found. 20 Deno function tests pass.
- **Analytics**: typed §14 events, PostHog (EU, no autocapture/replay/person profiles), off without a key,
  console-only in dev, user switch in Settings, reset on "Delete all my data".
- **Night look** extended to paywall, Diagnose, Learn, share card (our own line-art car by body type).
- **Romanian complete**: 1,090 Diagnose texts, 1,264 model-page texts, 76 repair-cost names, error messages; tests
  fail on any missing string. Romanian number/price format.
- **Release prep**: `eas.json` (development/preview/production), export-compliance flag, `docs/store-listing.md`
  (name/subtitle/description/keywords/privacy label/review notes/screenshot plan, Romanian page),
  `docs/legal/privacy-policy.md` and `docs/legal/terms-of-use.md` drafts (owner fills brackets, has them checked,
  hosts them).
- **Design round 2**: `RoadProgress`, `VinScanDemo`, `WalkaroundMap` (top view built from plain shapes, no SVG),
  `GlanceTiles`, garage `NextStep` + `answerSummaries`/`checklistProgress` (tested), `VerdictSignal reveal`.
  Also fixed "12 rechemares" (recall plural) and an untranslated photo-permission message.
- **Phone-test fixes (2026-11-18)**: colored answer bar, Next item after Problem/Not sure, keyboards close on Enter
  everywhere (`TextField` defaults, `KeyboardDone` bar for number pads, `keyboardDismissMode="on-drag"`),
  `useKeyboardShown` hides bottom bars while typing and scrolls the field into view (inspection, car report).
- **Bug hunt** (browser click-through of every flow, EN + RO, light + dark, iPhone SE size; code review):
  - **Crash**: picking a year in "US car not in our list?" crashed (FlatList numColumns change). Fixed.
  - Notes typed in the inspection were lost when tapping Next with the keyboard open. Fixed.
  - Section chips 36 pt → 44 pt; filter chips fit on one line; engine chips 44 pt.
  - Low-coverage reason said "finish more checks for a verdict" next to a "Possible scam" verdict. Fixed.
  - Garage counted "Keep checking" as a verdict; compare said "Below typical" for "Far below". Fixed.
  - Untranslated bits in Romanian (asking price, seller type, recall counts, copy alerts, "now"). Fixed.
  - Huge headlines capped at 1.3× system text size so large text can't break layouts.
  - Checked: iOS bundle exports, `tsc`, 370 Jest + 20 Deno tests, lint (0 errors), expo-doctor 20/20.

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

**"Night road" look (2026-11-17, owner asked for a more distinctive, attractive design)**
- Our own **line-art car drawings** (sedan, hatchback, SUV, pickup, coupe, van): `assets/source/cars/*.svg`, rendered to
  PNG (1x/2x/3x) and tinted at runtime (`CarArt`). Body type from vPIC body class or our model database (`bodyKind`,
  tested). Also the planned silhouette for the share card (§13).
- **Night panels** (`NightPanel`, tokens `night`, `onNight`, `lane` = road-paint yellow) for hero areas only: welcome
  screen, Garage, Check tab, car report header. `RoadScene`: animated road (oncoming traffic, lane marks); still when
  Reduce Motion is on. Yellow `road` button only on night panels. Signal colors unchanged.
- Welcome: huge headline with the last word in yellow (works in Romanian too). Garage empty state: "How it works" in 3
  steps. Check tab: VIN-first hero with the two VIN spots marked on the drawing. Tab bar: night Check button.
- Browser preview fixed (web only: SQLite worker warm-up, no exclusive transactions on web).
- Not restyled yet: inspection, verdict, paywall, Diagnose, Learn, Settings (next, after the owner likes the direction).


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
- **Night-road look** (owner liked it): line-art cars are our own SVGs rendered to PNG and tinted (no new dependency);
  night panels only in hero areas; signal colors unchanged.
- **Field-based listing flags** live in `data/listing_red_flags.json` (`field_flags`), so texts stay in reviewed data.
- **Analytics** is opt-out (Settings switch), anonymous, never identifies a person; off until the key exists.
  Owner/lawyer to confirm opt-out vs opt-in for EU users when writing the privacy policy.
- RevenueCat wiring and the pass-expiry reminder wait for the owner's RevenueCat project (can't be tested without it);
  Crystal Check's working RevenueCat module should be reused then.
- `expo-dev-client` is **not** installed yet: installing it makes `npx expo start` default to dev-build mode instead of
  Expo Go. Install it in the dev-build session and use `npx expo start --go` for Expo Go after that.

## Things learned about NHTSA

- "No results" comes back as HTTP 400 with a normal body (handled). 2015 F-150 has 0 complaints in the API.
- vPIC decodes European VINs to the make at most (Dacia/Skoda: "manufacturer not registered"), so non-US cars use our
  model list.
- vPIC puts the pickup load class in `Series` ("Silverado" + "1500"); NHTSA records say "SILVERADO 1500". Mercedes
  decodes as "C-Class" + trim "C300-4M" but recalls are filed under "C300"; Lexus as "ES" + "350" vs "ES350"/"ES 350".
  All handled; re-run `npm run eval:vehicle` after any change to the lookup.

## Owner actions (open)

1. **Test PR #3 on the iPhone** (resume at test E, then the new items M–P below).
2. **Supabase project** for this app (separate from Crystal Check) → then I deploy the backend step by step. Needs an
   **AI key** (Anthropic or Gemini) as a Supabase secret. Never paste keys in the chat.
3. **RevenueCat + App Store Connect**: products `car_hunt_pass_30d` ($14.99 non-renewing) and `pro_annual` ($39.99),
   trial yes/no; Apple Developer account in good standing.
4. **Expo account** (for EAS builds) → dev build on the iPhone.
5. **App name + bundle ID** (§18.1); check the name is free on the App Store. Draft options in `docs/store-listing.md`.
6. **Privacy policy + terms**: fill in the [brackets] in `docs/legal/*.md`, have them checked, publish them (e.g. GitHub
   Pages), send me the URLs + a **support email**.
7. **PostHog** (optional): EU project key, if you want analytics at launch.
8. **Mechanic review** of `data/models/*.json`, `obd_codes.json`, `symptoms.json`, `repair_costs.json`,
   `listing_red_flags.json` (start with Logan, Golf, Octavia, Astra, Focus, Passat, Duster).
9. **Review the Romanian texts**: `src/core/i18n/ro.json` (UI) and `data/i18n/ro.json` (data, now ~2,900 lines).
10. Employment-contract check; **eval photos by Dec 6** (§16.2).

## How to test on the phone

Setup (once, on the Windows PC):
```
cd F:\projects\car_repair
git fetch
git checkout claude/vibrant-cori-kyx5fo
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
Type a word (`shakes`) → matching symptoms appear above the codes. In Romanian everything is Romanian (try `rateu`).

**J. Premium features** — Settings → Developer → **Simulate Premium** on. Then: car → **Price check** (add 3 similar
listings with price + mileage → fair range), Garage → **Compare cars** (pick 2), verdict → **Share card**
(Story / Post → share sheet opens).

**K. Learn** — open 2 guides; in Romanian they should be fully Romanian.

**L. App icon + delete data** — home screen icon is Expo Go's (the real icon shows only in a dev/store build: OK).
Settings → **Delete all my data** → confirm → back to onboarding, garage empty.

**M. VIN photo** — Check → **Take a photo of the VIN** → Take a photo (or Choose from photos) → the VIN screen opens
pre-filled with an orange "Sample VIN" note (real reading needs the server) → Look it up.

**N. Listing screenshots** — Settings → Developer → Simulate Premium on → car report → Listing check → **Read it from
screenshots** → pick 1–3 screenshots → sample text appears for review → Check the listing.

**O. Price far below** — Price check on a car asking much less than 3 similar listings (e.g. asking 6,500 vs listings
9,800 / 10,400 / 9,200 with mileage) → orange **"Far below typical"** with a question to ask; the verdict and Compare
show it too.

**P. Looks** — welcome, Garage, Check, car report header, paywall, Diagnose, Learn, share card: night panels with
line-art cars and moving road (still when iPhone Settings → Accessibility → Reduce Motion is on). Try dark mode.

**Q. Design round 2** — Settings → Developer → Show onboarding again: the 4 questions show a little car driving along a
road as you answer; the camera screen shows a scanner. Garage: each car has one action at the bottom (Start /
Continue with a progress bar / See the verdict); the yellow **Continue** button reopens the inspection you were doing.
Car report: tap a tile (e.g. **Known problems**) → it scrolls to that section. Inspection: the small car top-right
lights up the part you're checking (papers, body, wheels, bonnet, cabin…). Verdict: the lamps sweep, then stop on
the verdict.

## Next steps

1. Owner finishes the phone test (E → P) → fixes → merge #2, then #3.
2. **Deploy the backend** once the Supabase project + AI key exist (README "Backend"); switch the app to Live; check
   real AI photo checks, screenshot reading and VIN photos; tune the prompt with the eval photos (§16.2).
3. **RevenueCat** (reuse Crystal Check's module): real purchases behind `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, entitlement
   drives Premium, restore, pass-expiry local reminder (expo-notifications) 2 days before the end.
4. **Dev build** (install `expo-dev-client`, EAS development profile) → sandbox purchase test.
5. Paywall terms/privacy links once the URLs exist; App Store screenshots (plan in `docs/store-listing.md`).
6. Optional: AI free-text symptom → symptom id (backend); `react-native-svg` for `ProgressRing` if the owner agrees.

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

Last updated: **2026-11-16, evening** (M1 app side, M2 and M3 built on mocks + live NHTSA; owner to test on the phone).

## Status at a glance

| Milestone | Planned (CLAUDE.md §0) | Status |
|---|---|---|
| M0 — Skeleton, data, design | Nov 16–19 | ✅ Done, tested on the owner's iPhone (edumaf/car_repair#1) |
| M1 — Add a car + vehicle report | Nov 16–19 | 🟡 App side built (VIN scan/typing, year/make/model, report). **Backend `/vehicle` waits for Supabase** |
| M2 — Guided inspection + photo checks | Nov 20–25 | 🟡 Built. **Real AI photo checks wait for the backend** (sample results until then). Token-cost logging comes with `/photo-check` |
| M3 — Verdict, repairs, questions, script | Nov 26–Dec 1 | ✅ Built: verdict engine + full §8 tests (12 scenarios), report screen, questions, 2-tone script, copy |
| M4 — Listing check + price check | Nov 26–Dec 1 | 🟡 Pasted-text listing check done (offline). Left: screenshots via `/listing-check`, VIN photo, price check |
| M5 — Garage, compare, onboarding, paywall, quotas, dev build | Dec 2–6 | 🟡 Basic garage list only |
| M6 — Share, Learn, analytics, settings, polish, store assets | Dec 7–10 | ⏳ |
| M7 — Submit to App Store | **Dec 10–11** | ⏳ |

Schedule: **ahead** on app code (M3 done Nov 16, planned Dec 1). The **backend (Supabase) is now the critical path**:
`/vehicle`, `/photo-check`, `/listing-check`, `/quota` all need it. Start it by **Nov 20** at the latest.

## What exists today

**M0 (see edumaf/car_repair#1):** Expo SDK 58 project, tabs, design tokens + fonts, seed validation, SQLite, VIN
helpers, NHTSA normalization, mock fixtures, README.

**M1 — Add a car + vehicle report (app side)**
- **Check tab:** Scan the VIN barcode (expo-camera, code39/code128/datamatrix/qr/pdf417, flashlight, scanner sweep
  line that respects Reduce Motion), Type the VIN (`VinField`: mono, grouped 3-6-8, live validation, check digit warns
  but doesn't block), No VIN yet (year → make → model → powertrain, lists from NHTSA, popular makes first, search).
  "Photo of the VIN" is marked Soon (needs the backend's AI).
- **Confirm screen:** looks the car up, shows what was found + recall/complaint counts, optional asking price, mileage,
  seller type; warns if the VIN is already in the garage.
- **Vehicle report:** header, recalls (first 3, "Show all"; NHTSA park-it / park-outside warnings), top-5 complaint
  bars with owner quotes on tap + caveat, crash-test stars, NHTSA attribution, pull-to-refresh, remove car.
- **NHTSA lookup** (`src/core/vehicle/nhtsa.ts`, pure TS, shared with the future `/vehicle` function): decode,
  recalls and complaints with **model-name variants** (F150 ↔ F-150) and a fallback to NHTSA's own model names,
  safety rating, make/model lists, 10 s timeouts, partial results, the HTTP-400-means-empty quirk. Tested with a
  fake network.
- **API modes** (`src/core/api/mode.ts`): *Real NHTSA (dev)* is the default in dev builds: the phone calls NHTSA
  directly so any real VIN works before the backend exists. **Release builds can never use it** (tested). *Sample
  cars (offline)* and *Live backend* are the other modes. Switch in Settings → Developer → Data source.
- **Garage:** saved cars with price, mileage, recalls and verdict badge.

**M2 — Guided inspection**
- `buildChecklist`: powertrain filter, sections in order, model's top complaint groups first in each section with a
  "Known problem area for this model" tag. Tested.
- Inspection screen: section chips with progress, overall bar, one item at a time (severity, how to check, bad signs),
  4 answers with haptic tick (OK/Skip move on; Problem/Not sure stay so you can add a note or photo), tap again to
  clear, notes, photos (camera or library; resized to 1280 px, re-encoded so EXIF/GPS is dropped, kept on the phone;
  long-press to remove), test-drive safety line.
- AI photo suggestions: findings as "AI noticed" chips with **Confirm / Dismiss**; only confirmed ones become answers
  (§2.3). Dashboard lights mapped per §7.4 (suggestions on the right items, re-check note for TPMS/traction, red-light
  "stop driving" warning). Odometer / tire date / VIN transcriptions shown; a VIN that doesn't match is flagged.
  **Until the backend exists these are canned sample results, labelled "Sample AI result".**
- Database: migration 2 lets an item have a note or photo before it's answered.

**M3 — Verdict**
- `computeVerdict` exactly per §8.2 (coverage, priority order, distinct repair costs, reasons, known-issue overlap),
  `sellerQuestions` (many recalls combined into one question; PPI question not repeated), `suggestedOffer`
  (rounded to $50, floored, never above asking or below 0), 2-tone `negotiationScript`. 46 tests incl. 12 scenarios.
- Verdict screen: traffic light, "based on X of Y checks", why, estimated repairs + disclaimer, questions (copy all),
  script with Friendly/Firm + copy (expo-clipboard), add asking price inline, always-visible self-check disclaimer,
  bought / passed. Saved to the car for the garage badge ("Possible scam" kept).

**M4 (part):** `matchListingFlags` (offline, whole-phrase, case-insensitive) + "Listing check" card on the report:
paste the ad text → Looks normal / Ask questions / Possible scam, each flag with explanation and a question.
Matched flags feed the verdict.

**Quality gates (this PR):** `tsc` clean · 183 Jest tests pass (incl. repositories on a real in-memory SQLite) ·
`expo lint` clean · `expo-doctor` 20/20 · iOS bundle exports. Full flow clicked through in a browser (light + dark):
add the Altima by VIN → report → listing check → 25 answers → verdict → garage.

## Decisions made

- **Plain SQL instead of drizzle-orm** (brief allows either). Same raw-SQL style as Crystal.
- **Seed data is read straight from the bundled JSON**, not copied into SQLite; `app_meta.data_version` records it.
- Kept from Crystal Check: infrastructure patterns only (DB migrations, app_meta, startup, photo storage). No UI,
  tokens, copy or layouts (guideline 4.3).
- **Dev-only direct NHTSA mode** so the owner can test real cars before Supabase. Release builds can't use it;
  production goes through `/vehicle` (§2.8).
- **Added `expo-clipboard`** (Expo module, works in Expo Go) for "copy the script" (M3 requires copy to clipboard).
- Recall questions: more than 3 recalls become one combined question (the brief's per-recall list got too long:
  the Altima has 12).
- Model-name variants never drop words ("Civic Hybrid" must not become "Civic"); NHTSA's own model list is the fallback.
- `ProgressRing` (§12) not built: needs `react-native-svg`, which isn't in §3. Section chips show "3/7" + a check
  mark instead. **Owner: OK to add react-native-svg later (works in Expo Go)?**

## Things learned about NHTSA (important for the backend)

- `api.nhtsa.gov` answers **"no results" with HTTP 400** and a normal body `{"count":0,"results":[]}`. Handled.
- **2015 Ford F-150 has 0 complaints** in the complaints API ("F-150", "F150"); recalls work (14). 2016 has only
  120. Coverage gaps exist; the report says "no owner complaints on file". Check more models in eval (§16).
- vPIC reports regular hybrids as `Strong HEV (Hybrid Electric Vehicle)` (handled, tested).
- vPIC often gives `4x2` as the drive type for sedans; we show "2WD".
- NHTSA model lists are in capitals ("CR-V", "CIVIC SI"); shown as "CR-V", "Civic SI".
- Complaint summaries are user text with NHTSA's redactions (`XXX`). We quote ≤ 200 characters.
- Expo SQLite doesn't run in a desktop browser without extra setup; irrelevant for the iPhone app (browser checks
  used temporary, uncommitted tweaks).

## Owner actions (open)

1. **Test this PR on the iPhone** (steps below) and reply OK or with screenshots.
2. **By Nov 20: create the Supabase project** for this app (separate from Crystal Check) and turn on anonymous
   sign-ins. Step-by-step instructions at the start of that session. Never paste keys in the chat.
3. **Vision AI key** for photo checks (§18.3), as a Supabase secret, with a monthly budget limit.
4. Decide the **final app name** and check it's free on the App Store (§18.1).
5. **Check your employment contract** for side-project / non-compete clauses (§18.6).
6. Later: a mechanic skims `data/*.json` (§18.7); collect ~40 eval photos by **Dec 6** (§16).

## How to test on the phone

```
cd F:\projects\car_repair
git pull
npm install
npx expo start --clear
```
Scan the QR code with the iPhone Camera → Expo Go. Then:
1. **Settings → Data source** should show **Real NHTSA (dev)** selected.
2. **Check → Scan the VIN barcode** on a real car (driver's door-jamb sticker). Allow the camera. It should jump to
   the confirm screen with the right year/make/model. Try the flashlight button too.
3. **Check → Type the VIN**: try a wrong letter (I, O or Q), then a full VIN. Then **No VIN yet?** → pick a year,
   make, model, powertrain.
4. **Save and see the report**: recalls, complaint bars (tap one to read quotes), crash stars. Pull down to refresh.
5. **Listing check** on the report: paste `Clean title, sold as is. Pay by wire transfer.` → it should say
   *Possible scam*.
6. **Start the inspection**: answer a few items, use the section chips, add a note, take a photo on a tire item
   (you'll see a *Sample AI result* chip: Confirm or Dismiss it), take a photo on "Warning lights at startup".
7. Tap **Verdict** (top right): check the reasons, repair range, questions, script (Friendly/Firm, Copy).
8. Back in **Garage**: the car shows its verdict badge.
9. Optional: **Settings → Sample cars (offline)** and use a sample VIN from the README (works with no internet).

## Next steps

1. Owner tests → merge this PR.
2. **Backend (critical path):** Supabase project, `vehicle_cache`, `/vehicle` (reuses `src/core/vehicle/nhtsa.ts`),
   Deno tests with recorded fixtures; then `/photo-check` (vision model, zod, retry, token-cost logging, quota) and
   `/listing-check` (screenshots + VIN photo).
3. M4 rest: price check with comparables + KBB/Edmunds links.
4. M5: compare, onboarding, paywall (RevenueCat), quotas, dev build.

# Used Car Check — Build Brief for Claude Code (Expo / React Native)

> **Progress log:** read [`PROGRESS.md`](./PROGRESS.md) before starting any work — it records what is done, decisions already made, what the owner still owes, and the next steps. Update it at the end of every milestone or session, in the same PR.

> **How to use this file:** Put this file at the root of a new, empty project folder as `CLAUDE.md`, with the `data/` folder next to it (`inspection_checklist.json`, `repair_costs.json`, `listing_red_flags.json`). Open Claude Code in that folder and say: *"Read CLAUDE.md and start Milestone 0. Stop at the end of each milestone, tell me exactly how to test it on my phone, and wait for my OK."*
>
> **The owner has no Mac.** Everything must be buildable and testable from Windows:
> - **Day-to-day testing:** `npx expo start` → scan the QR code with **Expo Go** on the owner's iPhone.
> - **Native-only features** (real purchases): an **EAS development build** made in Expo's cloud.
> - **Release:** **EAS Build** + **EAS Submit**. No Xcode.
>
> **The owner already shipped one app with this stack** ("Crystal Check": Expo + Supabase + RevenueCat + a vision LLM). If the owner gives you the path to that project, **reuse its infrastructure modules** (Supabase client/auth, image resize pipeline, quota function, RevenueCat wiring, share-card renderer, analytics wrapper) — but **never its UI, design tokens, copy or screen layouts**. This app must look and feel like a different product (App Store guideline 4.3).
>
> "Used Car Check" is a working name. Final name, bundle ID and store listing come from the owner (§18).

---

## 0. Launch plan — live on iOS before Christmas (read first)

**Goal:** iOS app **submitted by Dec 11, 2026, live by ~Dec 16**, stable through the holidays, and growing into the **US used-car peak in February–March** (tax-refund season). Android follows in January.

| Date | Milestone / event |
|---|---|
| Nov 16–19 | M0 (skeleton, data, design system) + M1 (add a car: VIN scan/entry, NHTSA lookup) |
| Nov 20–25 | M2 (guided inspection + photo checks) |
| Nov 26–Dec 1 | M3 (verdict, repair estimate, seller questions, negotiation script, report) + M4 (listing check + price check) |
| Dec 2–6 | M5 (garage/compare, onboarding, paywall, quotas, dev build, sandbox purchases) |
| Dec 7–10 | M6 (share card, settings, analytics, polish, store assets) + eval light (§16) |
| **Dec 10–11** | **Submit to App Store review** |
| ~Dec 16 | Live on iOS |
| before Dec 22 | Any fixes submitted (Apple review is slower Dec 23–27) |
| January | Android closed test → production; ASO iteration; content push before tax-refund season |

**Launch scope (v1.0 — must ship):** onboarding, add a car (VIN barcode scan / photo / manual, or year-make-model), vehicle report (decode, recalls, owner-complaint problem areas, safety ratings), guided inspection checklist with photo checks, verdict + repair estimate + seller questions + negotiation script, listing check (pasted text + screenshot), price check with comparables, garage of saved cars with side-by-side compare, paywall + free limits, share card, settings with restore / delete data / disclaimers.

**Cut from v1.0 (do later):** paid vehicle-history reports (accidents/title history from a paid provider), OBD2 Bluetooth integration, EU/UK data sources, PDF export, multi-user sharing of a car, localization.

**If a milestone slips by more than 2 days,** tell the owner immediately and propose what to cut — never silently push the submission date.

---

## 1. Product in one paragraph

Used Car Check helps people **avoid buying a bad used car**. You add the car you're looking at (scan the VIN barcode on the door jamb, photograph the VIN, type it, or pick year/make/model). The app pulls **official US government data** (NHTSA: VIN decode, safety recalls, owner complaints by component, crash-test ratings) and builds a **model-aware inspection checklist** that puts the model's known problem areas first. You walk around the car with your phone: answer simple checks, take photos of tires, rust, paint, the dashboard at startup, and the app's AI points out what it sees. At the end you get a clear verdict — **Looks good so far / Negotiate / Get a mechanic inspection / Walk away** — with an estimated repair-cost range, the exact questions to ask the seller, and a negotiation script. Before you even go, paste or screenshot the listing to catch scams and red flags, and check whether the price is fair against comparable listings.

**Positioning:** *"Don't buy a lemon. Check any used car in 15 minutes."* An honest second pair of eyes for the buyer — we don't sell cars, financing or warranties, so we have no reason to push you into a deal.

**Primary user:** US adults buying a used car from a private seller or small dealer, often first-time or non-car-savvy buyers, budget $5k–$30k. Secondary: people who flip cars (heavy users → annual plan).

**Launch market:** English, **US only** (NHTSA data is US). iOS first, Android in January.

---

## 2. Non-negotiable rules (read before writing any code)

1. **Never say a car is safe or good.** The best verdict is **"Looks good so far"**, always followed by: *"Get a professional pre-purchase inspection before you pay."* The app is a guide, not a mechanic. No "certified", no "guaranteed", no accuracy percentages.
2. **Facts come from data, not the model.** Recalls, complaints, ratings and decoded specs come only from NHTSA responses. Checklist items, severities and repair costs come only from `data/*.json`. The LLM may describe what it sees in photos and extract text from screenshots — **it must never invent recalls, prices, repair costs, or known problems.**
3. **AI findings are suggestions the user confirms.** A photo finding pre-fills a checklist answer as "AI suggests: problem" — it only counts toward the verdict once the user confirms it.
4. **Repair costs are ranges with a disclaimer:** "Typical US range at an independent shop. Your price will vary." Never a single number.
5. **Safety first in instructions.** Never tell users to open a hot radiator cap, get under a car not on level ground, or drive unsafely. Test-drive steps say "only where safe and legal". Red warning lights (oil pressure, coolant temperature, brake) → "stop driving and don't buy without a mechanic's check".
6. **Never accuse a seller.** Listing flags are framed as "common warning sign — ask about it".
7. **Privacy:** never put license plates, VINs, seller names or phone numbers on share cards or in analytics. Strip EXIF/GPS from photos before upload. Don't store user photos on the server.
8. **No API keys in the app.** All LLM and NHTSA calls go through our backend functions (NHTSA is keyless, but proxying lets us cache and normalize).
9. **No surprise charges.** No weekly plans. Clear terms on the paywall.
10. **Distinct, polished UI** (§12) — must not resemble the owner's other app or generic templates.
11. **Expo Go first.** Until M5, everything must run in Expo Go. Any library needing custom native code: ask first (only RevenueCat real purchases need the dev build).
12. **Ask before** adding paid services, changing pricing, or adding dependencies not listed in §3.

---

## 3. Tech stack

| Layer | Choice | Expo Go? |
|---|---|---|
| Framework | **Expo (latest SDK supported by the current Expo Go)**, React Native, **TypeScript strict** | ✅ |
| Navigation | **expo-router** | ✅ |
| State | **zustand** (UI), **@tanstack/react-query** (server calls) | ✅ |
| Local DB | **expo-sqlite** (+ **drizzle-orm** if it fits cleanly; plain SQL is fine) | ✅ |
| Seed data | Bundled `data/*.json`, validated with **zod** at startup in dev | ✅ |
| Camera / barcode / photos | **expo-camera** (`CameraView` with barcode scanning: code39, code128, datamatrix, qr), **expo-image-picker** | ✅ |
| Image processing | **expo-image-manipulator** (resize + re-encode drops EXIF) | ✅ |
| Backend | **Supabase**: anonymous auth, Postgres, Edge Functions (Deno/TS). Client `@supabase/supabase-js`, session in **expo-secure-store** | ✅ |
| Vision LLM | Server-side, structured JSON output, cheap fast vision model (e.g., Gemini Flash tier). Provider + model are server env vars. Verify current names/prices at build time. | n/a |
| Payments | **react-native-purchases** + **react-native-purchases-ui** (RevenueCat). Expo Go = Preview API Mode (mock). Real purchases in the dev build (M5). | ⚠️ mock |
| Notifications | **expo-notifications** (local only: pass-expiry reminder) | ✅ |
| Share card | **react-native-view-shot** + **expo-sharing** | ✅ |
| Haptics / blur / fonts | **expo-haptics**, **expo-blur**, **expo-font** (+ `@expo-google-fonts/*`) | ✅ |
| Analytics | **posthog-react-native** (EU cloud, no autocapture of text, no session replay) | ✅ |
| Tests | **jest-expo** + React Native Testing Library; Deno tests for functions | ✅ |
| Builds / release | **EAS Build**, **EAS Submit**, **EAS Update** | cloud |

**Project creation and versions:**
- Create the project with `npx create-expo-app@latest` (TypeScript template) so the SDK matches Expo Go. Keep the template's folder conventions if they differ from §4 and note it in the README.
- Install every Expo/RN package with `npx expo install <pkg>`.
- Don't guess package versions or APIs from memory: check the installed package's docs/types.

**Quality gates (end of every milestone, report results):** `npx tsc --noEmit` clean, `npm test` passing, `npx expo-doctor` no blocking issues, app opens in Expo Go with no red-screen errors.

---

## 4. Architecture

```
iPhone app (Expo)
 ├─ Add car: VIN barcode scan / VIN photo / manual VIN (check-digit validation) / Y-M-M picker
 ├─ Garage + checklist + answers + photos (SQLite, offline)
 ├─ Checklist builder (pure TS: powertrain filter + complaint-based priority)
 ├─ Verdict engine (pure TS, deterministic, unit-tested)
 ├─ Listing flag matcher + price calculator (pure TS)
 └─ Supabase Edge Functions
      ├─ /vehicle        → NHTSA vPIC decode, recalls, complaints, safety ratings (normalized + cached)
      ├─ /photo-check    → vision LLM → validated JSON findings
      ├─ /listing-check  → vision LLM: extract listing text + fields (price, mileage, year, title words)
      └─ /quota          → free-tier counters + RevenueCat entitlement / pass expiry
```

Pure-TS modules (`src/core/**`) must not import React Native, so they can be unit-tested in Node.

Every API client has a **mock** with fixtures (`EXPO_PUBLIC_USE_MOCKS=1`, default on until M1 wires the backend). Include fixtures for at least: 2018 Honda Civic, 2015 Ford F-150, 2013 Nissan Altima (CVT complaints), 2017 Toyota Prius (hybrid), 2019 Tesla Model 3 (EV), 2012 VW Jetta TDI (diesel).

---

## 5. Data

### 5.1 Seed files (provided)
- `inspection_checklist.json` — sections + ~60 items. Item fields: `id, section, powertrain[], title, how_to_check[], bad_signs[], severity (info|minor|major|critical), complaint_group, repair_cost_id, photo_check`. Also `_meta.complaint_keyword_groups` mapping NHTSA component strings → our groups.
- `repair_costs.json` — ~57 typical US repair cost ranges (`id, name, category, low, high`).
- `listing_red_flags.json` — ~20 flag groups (`id, match[], severity (scam|critical|major|caution), explanation, ask_seller`).

Write `seed.test.ts` that fails if: any `repair_cost_id` is missing from `repair_costs.json`; any `complaint_group` is not a key of `_meta.complaint_keyword_groups`; any `section` id is unknown; enums are out of range; ids are duplicated; any `low > high`.

All seed data was drafted by AI — show it as guidance, and list "have a mechanic review data/*.json" in the owner checklist (§18).

### 5.2 Local SQLite tables

```
cars          (id pk, created_at, vin, year, make, model, trim, body, powertrain,   -- gas|diesel|hybrid|ev
               engine_desc, drive, asking_price, mileage, seller_type,              -- private|dealer|unknown
               listing_text, nickname, status,                                      -- considering|bought|passed
               vehicle_report_json, verdict, verdict_json, updated_at)
answers       (car_id, item_id, answer,                                             -- ok|problem|not_sure|skip
               ai_suggested int, note, photo_uris_json, updated_at, pk(car_id,item_id))
photo_checks  (id pk, car_id, item_id, photo_uri, result_json, created_at)
comparables   (id pk, car_id, price, mileage, year, source_note)
app_meta      (key pk, value)                                                       -- onboarding answers, data_version
```

### 5.3 Server tables (Supabase, RLS on everything)
- `vehicle_cache(key text pk, payload jsonb, fetched_at timestamptz)` — key = `vin:<VIN>` or `ymm:<year>:<make>:<model>`; TTL 7 days.
- `usage(user_id, day, photo_checks int, listing_checks int, pk(user_id, day))`
- `free_cars(user_id pk, cars_used int)`
- `passes(user_id, product_id, purchased_at, expires_at)` — only if RevenueCat doesn't expose expiry for the non-renewing pass (see §9).

---

## 6. Screens & flows

**Tab bar:** Garage · Check (center, prominent) · Learn · Settings.

1. **Onboarding** (§11) → first car → vehicle report → paywall.
2. **Add a car** (from "Check" tab)
   - **Scan VIN barcode** (door jamb sticker / windshield) with expo-camera barcode scanning.
   - **Photograph VIN** → `/listing-check` in `mode: "vin_ocr"` returns the 17-char VIN.
   - **Type VIN** with live validation: 17 chars, no I/O/Q, North American **check digit** (position 9) — warn, don't block, if the check digit fails (imports).
   - **No VIN yet?** Pick year → make → model (from vPIC lists, cached) + powertrain.
   - Optional: asking price, mileage, seller type, paste listing text / attach listing screenshot.
3. **Vehicle report** (free)
   - Header: year make model trim, engine, drive, powertrain badge (VIN in monospace, partially masked on share).
   - **Recalls** (count + list: component, summary, remedy; "Ask the seller for proof the recall was completed — recall repairs are free at dealers").
   - **Owner-complaint problem areas**: top 5 complaint groups by count with a bar for each, sample complaint snippets (short, quoted from NHTSA summaries), and the caveat: "Complaints are unverified reports from owners; popular models get more complaints."
   - **Crash-test ratings** if available.
   - CTA: **"Start the inspection"**.
4. **Guided inspection**
   - Built by `buildChecklist(car, report)`: filter by powertrain; **sort sections by order, but within each section put items whose `complaint_group` is in the model's top complaint groups first** and badge them "Known problem area for this model".
   - Section progress chips; item card: title, how to check (numbered), bad signs, severity tag, "Take photo" if `photo_check`.
   - Answers: **Looks OK / Problem / Not sure / Skip**, optional note.
   - Photo → `/photo-check` → findings shown as "AI noticed: …" with **Confirm / Dismiss**; confirm sets answer to Problem (and stores the finding).
   - Dashboard photo: the AI lists detected warning lights; the app maps them (see §7.4) and suggests answers for `dash_lights_startup`, `airbag_light`, `temp_gauge`, etc.
   - Save continuously; works offline except photo checks.
5. **Verdict & report**
   - Big traffic-light card (§8 wording) + "Why" bullets.
   - **Estimated repairs**: list of problem items with their cost ranges + total range.
   - **Questions to ask the seller** (from flags + problem items + recalls).
   - **Negotiation script** (§8.3): copyable text with the suggested offer range.
   - Always-visible line: *"This is a guided self-check, not a professional inspection. Get a pre-purchase inspection by an independent mechanic before you pay."*
   - Buttons: Share card · Compare · Mark as bought / passed.
6. **Listing check** (from a car or standalone)
   - Paste text → instant on-device flag matching (offline).
   - Screenshot(s) → `/listing-check` extracts text + fields → matching on extracted text + field-based flags (e.g., price far below comparables, mileage missing, "TMU").
   - Output: **Looks normal / Ask questions / Possible scam** with grouped flags and "ask the seller" lines.
7. **Price check**
   - Inputs: asking price, mileage, year; **add 2–6 comparable listings** (manually or by screenshot via `/listing-check`).
   - With ≥3 comps: fit price ~ mileage (least squares on comps of the same model, ±1 year), show where this car sits (below / within / above typical) and an estimated "fair range" (residual-based band). With <3 comps: show min/median/max only.
   - Links out: "See valuation on Kelley Blue Book / Edmunds" (open in browser; no scraping).
   - **Never generate a price with the LLM.**
8. **Garage** — list of cars with photo, verdict badge, price, problem count; filters (considering/bought/passed). **Compare** 2–3 cars side by side (verdict, repair range, recalls, top complaint areas, price position, mileage).
9. **Learn** — short offline guides: how to read a tire date code, penny tread test, what a pre-purchase inspection is, title brands explained, common scams, test-drive route tips, how to use a $20 OBD2 reader. (Static content from a local `content/` folder; write it in M6, plain English, no health or legal advice.)
10. **Settings** — subscription status / restore / manage, pass expiry, data & privacy (delete all my data), disclaimers, about, contact, terms, privacy policy.

---

## 7. Backend functions & AI

### 7.1 `/vehicle` (no LLM)
Input: `{ vin? , year?, make?, model?, powertrain_hint? }`. Steps:
1. If VIN: call **vPIC** `DecodeVinValues/{VIN}?format=json` → year, make, model, trim, body class, fuel type primary/secondary, electrification level, engine (cylinders, displacement), drive type, plant country, error codes. Derive `powertrain`: EV (BEV) → `ev`; HEV/PHEV → `hybrid`; diesel fuel → `diesel`; else `gas`.
2. **Recalls:** `api.nhtsa.gov/recalls/recallsByVehicle?make=&model=&modelYear=`. Known gotcha: model-name variants (e.g., "F-150" vs "F150", trim-suffixed names) can return zero. Normalize and, if zero, try variants from vPIC's models-for-make/year list; union results by campaign number.
3. **Complaints:** `api.nhtsa.gov/complaints/complaintsByVehicle?make=&model=&modelYear=`. Group by `components` (split on commas) → map to our `complaint_keyword_groups` by substring match → counts per group + up to 3 short sample summaries per group (trim to 200 chars). Also count crash/fire/injury flags.
4. **Safety ratings:** `api.nhtsa.gov/SafetyRatings/modelyear/{y}/make/{m}/model/{mo}` → first vehicle id → overall rating (if any).
5. Verify all endpoint paths and response shapes against current NHTSA docs at build time; write Deno tests with recorded fixtures.
6. Cache in `vehicle_cache` (7 days). Timeouts 10 s per call; partial results are fine (mark sections unavailable).

### 7.2 `/photo-check` (vision LLM)
Input: 1 image (1280 px, re-encoded, no EXIF), `photo_type` (from `photo_check_type` enum), `car` summary (year/make/model/powertrain). Quota-checked.

**System prompt:**
```
You are the photo-inspection helper in a used-car buying app. You see ONE photo a buyer took while inspecting a used car, and the type of photo they intended (PHOTO_TYPE).
Rules:
- Describe only what is clearly visible. Do not guess hidden conditions, history or causes.
- Report findings only from ALLOWED_FINDINGS for this PHOTO_TYPE, each with confidence "high"|"medium"|"low" and a short plain-English description (max 140 chars) of where you see it.
- If the photo is unusable (blurry, dark, wrong subject), set quality.ok=false and give one short retake tip.
- For dashboard photos, list every illuminated warning light you can identify from ALLOWED_LIGHTS, and read the odometer if visible.
- For VIN/odometer/document photos, transcribe the requested text exactly; if unsure of a character, use "?".
- Never estimate repair costs, prices, or whether the car is safe. Never mention brands of parts.
- Output ONLY JSON matching the schema.
```

**Allowed findings by type** (put in code as a const map):
- `tire`: tread_low, uneven_wear_inner, uneven_wear_outer, cupping, sidewall_bulge, sidewall_cracking, mismatched_brands, dot_code_visible (+ transcribe code)
- `rust`: surface_rust, bubbling_paint, perforation, fresh_undercoating
- `paint_panel`: color_mismatch, overspray, uneven_gap, dent, deep_scratch, hail_damage
- `dashboard_lights`: (lights) check_engine, check_engine_flashing, airbag, abs, battery, oil_pressure, coolant_temperature, brake_system, tpms, traction_control, power_steering, hybrid_system, ev_battery, dpf, def; plus `odometer_value`
- `engine_bay`: wet_oil_leak, coolant_residue, corrosion, damaged_hoses, missing_covers_or_parts, unusually_clean
- `fluid`: milky_residue, very_dark_fluid, sludge, low_level_visible
- `interior_damage`: water_stain, silt_or_mud, rusty_seat_rails, heavy_wear, mold_mildew
- `underbody`: frame_kink_or_weld, heavy_rust_scaling, active_leak, missing_catalytic_converter, damaged_exhaust
- `vin_plate`: (transcribe) vin_text, tamper_signs
- `odometer`: (transcribe) odometer_value, unit
- `document`: (transcribe) title_brand_words found (salvage, rebuilt, flood, lemon, junk, non-repairable), names_present (bool only — never return the names)

**Response schema:**
```json
{
  "type": "object",
  "required": ["quality", "findings", "lights", "transcriptions", "notes_for_user"],
  "properties": {
    "quality": {"type": "object", "required": ["ok", "retake_tip"], "properties": {"ok": {"type": "boolean"}, "retake_tip": {"type": ["string", "null"]}}},
    "findings": {"type": "array", "items": {"type": "object", "required": ["code", "confidence", "description"], "properties": {"code": {"type": "string"}, "confidence": {"enum": ["high", "medium", "low"]}, "description": {"type": "string", "maxLength": 140}}}},
    "lights": {"type": "array", "items": {"type": "string"}},
    "transcriptions": {"type": "object", "properties": {"vin_text": {"type": ["string", "null"]}, "odometer_value": {"type": ["number", "null"]}, "odometer_unit": {"enum": ["mi", "km", null]}, "dot_code": {"type": ["string", "null"]}, "title_brand_words": {"type": "array", "items": {"type": "string"}}}},
    "notes_for_user": {"type": "string", "maxLength": 240}
  }
}
```
Validate with zod; drop codes not in the allowed list for that photo type; one retry with validation errors; else 502. Never log images.

### 7.3 `/listing-check`
Modes: `listing` (1–3 screenshots → `{extracted_text, fields: {price, mileage, year, make, model, title_status_words[], seller_location_text}}`), `vin_ocr` (1 photo → `{vin}`). The client then runs `matchListingFlags(extracted_text)` from `listing_red_flags.json`. The LLM must not judge the seller or the price.

### 7.4 Mapping dashboard lights → checklist
```
oil_pressure, coolant_temperature, brake_system, check_engine_flashing → critical: suggest problem on dash_lights_startup (+ temp_gauge for coolant)
airbag → suggest problem on airbag_light (critical)
check_engine, abs, battery, power_steering, hybrid_system, ev_battery, dpf, def → suggest problem on dash_lights_startup (major)
tpms, traction_control → note only (minor; may be normal right after start — ask the user to re-check after 10 s)
```

### 7.5 Cost guardrails
1280 px images, one image per photo-check, output cap ~600 tokens. Target ≤ $0.01 per photo check — log token counts in M2.

---

## 8. Verdict engine (`src/core/verdict/`)

### 8.1 Inputs
Car (powertrain, asking price), applicable checklist items, answers (only confirmed ones count), vehicle report (recall count, top complaint groups), listing flags (matched groups with severities), price position (`below|within|above|unknown`).

### 8.2 Rules
```
coverage = answered(ok|problem|not_sure) / applicable items

if any listing flag severity == "scam":           verdict = WALK_AWAY ("Possible scam")
elif any confirmed problem with severity critical
     or any listing flag severity == "critical":  verdict = WALK_AWAY
elif coverage < 0.4:                              verdict = INCOMPLETE ("Finish more checks")
elif any confirmed problem severity major
     or any not_sure on a critical item
     or any listing flag severity == "major":     verdict = GET_PRO_INSPECTION
elif any confirmed problem severity minor
     or price_position == "above":                verdict = NEGOTIATE
else:                                             verdict = LOOKS_GOOD_SO_FAR

repair_estimate = sum over DISTINCT repair_cost_id of confirmed problem items: [low, high]
reasons = one human line per rule that fired + per problem item (from strings.ts)
also attach: open recall count, top complaint groups that overlap with problem items ("Known issue for this model")
```

| Verdict | Headline | Color |
|---|---|---|
| WALK_AWAY | "Walk away" (or "Possible scam") | red |
| GET_PRO_INSPECTION | "Get a mechanic to check it first" | orange |
| NEGOTIATE | "Negotiate" | amber |
| LOOKS_GOOD_SO_FAR | "Looks good so far" + PPI reminder | green |
| INCOMPLETE | "Keep checking" | slate |

### 8.3 Seller questions & negotiation script
- **Questions:** each matched listing flag's `ask_seller`; per problem item a template ("I noticed {bad_sign}. Has that been looked at?"); per open recall ("Has recall {campaign} been completed?"); plus always "Can I take it to a mechanic for a pre-purchase inspection?".
- **Suggested offer:** `asking − midpoint(repair_estimate)`, floored at the low end of the comparables' fair range if available; rounded to $50. If no asking price, show only the repair estimate.
- **Script:** template-based (no LLM), friendly and firm, e.g.: *"I like the car, but the inspection showed {top 2 issues}, which typically cost {range} to fix. I can do {offer} today."* Provide 2 tones: Friendly / Firm.

Write **table-driven Jest tests** for every rule, the dedupe of repair costs, offer rounding/flooring, and at least 10 end-to-end scenarios (e.g., clean Civic with full coverage → LOOKS_GOOD_SO_FAR; Altima with transmission slipping → WALK_AWAY; wire-transfer listing → WALK_AWAY scam; worn tires + brakes only → NEGOTIATE with correct range; airbag light not sure → GET_PRO_INSPECTION; 30% coverage → INCOMPLETE). Same for `buildChecklist`, `matchListingFlags`, `priceCheck`, and VIN validation (including check digit).

---

## 9. Monetization

**Products (App Store Connect + RevenueCat):**
- `car_hunt_pass_30d` — **$14.99, non-renewing, 30 days of Premium**. (Car shopping takes weeks; a one-time pass is honest and converts well for this use case.)
- `pro_annual` — **$39.99/year auto-renewing**, for people who check many cars (flippers, families). Optional 7-day free trial (owner decides).
- No weekly plans.

RevenueCat: verify how it reports expiry for **non-renewing** purchases. If it doesn't provide a 30-day expiry, compute it server-side in `/quota` from the transaction date and store it in `passes`; the client reads entitlement status from `/quota`.

**Free (server-enforced where it costs money):**
- Unlimited vehicle reports (decode, recalls, complaint problem areas, ratings) — this is the hook and ASO value.
- Pasted-text listing check (offline).
- **1 full inspection** (checklist + up to 10 photo checks + verdict + script) — lifetime, for the first car.
- Learn guides.

**Premium:** unlimited inspections and photo checks (fair-use cap 60/day), screenshot listing checks, price check with comps, compare, share card without the "Free check" watermark.

**Paywall (RevenueCat Paywalls, remote config):**
- Headline personalized from onboarding, e.g. *"Check every car before you hand over the money"*.
- Benefit rows; **pass pre-selected** with "One payment, no subscription" badge; annual option second.
- Trust line: *"No subscription on the pass. It simply ends after 30 days."*
- Clear price/terms, restore, Terms + Privacy links, visible close button.
- Placements: after the first vehicle report → when starting a second inspection, when the free photo checks run out, when tapping a Premium feature.
- Local notification 2 days before the pass expires (if allowed): "Still shopping? Your pass ends in 2 days."

In Expo Go purchases are mocked; add a dev-only "simulate premium" toggle.

---

## 10. Accounts & quotas
Supabase anonymous sign-in on first launch (session in expo-secure-store). RevenueCat `appUserID` = Supabase user id. `/quota` checks entitlement (RevenueCat REST, cached 5 min) or `passes.expires_at`. "Delete all my data" deletes local DB + photos, server rows, and signs out.

---

## 11. Onboarding (5 screens + first car)
1. **Welcome:** bold headline "Don't buy a lemon." + subline "Check any used car in 15 minutes." Get started.
2. **Where are you in the process?** Just browsing · Found a car I like · Seeing a car today.
3. **Who's selling?** Private seller · Dealer · Not sure yet.
4. **How confident are you with cars?** Not at all · A little · Pretty confident. (Adjusts copy tone and shows more "how to" detail for beginners.)
5. **Biggest worry?** Hidden problems · Overpaying · Scams · Paperwork.
6. **Camera priming** → system prompt.
7. **Add your first car** → vehicle report (free) → paywall (dismissible).

Store answers in `app_meta`; send only selected options to analytics.

---

## 12. Design system (must differ from the owner's other app)

**Feel:** confident, practical, a bit "workshop": **light-first** (with dark mode), lots of white space, bold condensed headlines, traffic-light signal colors used sparingly and always with icons + words.

**Tokens** (`src/design/tokens.ts`):
- `bg` #F7F6F2 (light) / #111315 (dark); `surface` #FFFFFF / #1B1E21; `ink` #15171A / #F2F3F4; `muted` 60% ink
- `brand` #1F6FEB (trust blue) ; `go` #16A34A ; `caution` #F59E0B ; `warn` #EA580C ; `stop` #DC2626 ; `slate` #64748B
- Radius 14, generous 16–20 px padding, subtle 1 px borders instead of heavy shadows.

**Type:** headlines in a condensed grotesk (e.g., **Barlow Condensed** SemiBold/Bold), UI in **Inter**, VINs and numbers in a mono (e.g., **JetBrains Mono**). Respect system font scaling.

**Signature components:** `VerdictSignal` (vertical traffic light with the active lamp glowing + headline), `ProblemAreaBar` (complaint-group bars), `CheckItemCard`, `PhotoFindingChip` (AI suggestion with Confirm/Dismiss), `CostRangeBar` (low–high band), `VinField` (mono, grouped 3-6-8 with validation state), `ProgressRing` per section.

**Motion:** quick, mechanical (spring snaps, scanner sweep line on the VIN camera). Respect Reduce Motion. Haptic tick on each answered item; success/warning haptic on verdict.

**Accessibility:** labels on every control; color never the only signal; 44 pt targets; large-text layouts tested.

---

## 13. Share card
1080×1920 and 1080×1350 via react-native-view-shot. Contents: year make model (no VIN, no plate — blur/avoid user photos with plates; use a generic car silhouette by body class instead of the user's photo by default), verdict signal, 3 facts (e.g., "2 open recalls", "$900–$1,800 likely repairs", "Transmission: known problem area"), app name + store link/QR. Footer: "Guided self-check, not a professional inspection." Track `share_card_shared`.

---

## 14. Analytics events (PostHog)
`onboarding_answer`, `onboarding_completed`, `car_added` (method: vin_scan|vin_photo|vin_typed|ymm), `vin_check_digit_failed`, `vehicle_report_viewed` (recalls_count bucket, has_complaints), `inspection_started`, `item_answered` (item_id, answer), `photo_check_completed` (photo_type, findings_count, latency_ms), `photo_finding_confirmed` / `dismissed` (code), `verdict_shown` (verdict, coverage bucket), `script_copied` (tone), `listing_check_result` (overall), `price_check_done` (comps_count, position), `compare_opened`, `paywall_shown` (placement), `purchase_started`/`completed` (product), `share_card_shared` (verdict), `data_deleted`.
No VINs, prices, free text, names or photos in analytics.

---

## 15. Compliance & store checklist
- Disclaimers: in onboarding footer, on every verdict, in Settings, and in the App Store description: "guided self-check, not a professional inspection or vehicle history report; not affiliated with NHTSA or any manufacturer".
- Data attribution: "Recall, complaint and rating data: U.S. National Highway Traffic Safety Administration (NHTSA)."
- Don't use car-brand logos; brand names appear only as plain text describing the user's car.
- AI disclosure: "Photo findings are generated by AI and can be wrong."
- Permission strings (via config plugins): camera "Used Car Check uses the camera to scan VINs and photograph the car you're inspecting."; photo library for listing screenshots.
- Subscription/pass terms on the paywall, restore, manage-subscription link.
- Privacy labels: photos (app functionality, not stored on server), identifiers, usage data. In-app data deletion.
- Store metadata: no "guaranteed", no "certified", no "Carfax"/"KBB" in keywords or title (trademarks). Screenshots of real UI.
- Suggested keyword themes (owner finalizes): used car inspection, car checklist, VIN check, recall check, buying a used car, car scam, test drive checklist.

---

## 16. Eval light (before submission)
1. **Data:** run `/vehicle` for 30 popular US models (2012–2022) including the fixture models; check recalls/complaints aren't empty due to model-name variants; fix normalization.
2. **Photos:** owner collects ~40 photos (tires good/worn, rust, dashboards with/without lights, engine bays, VIN plates, odometers) from friends' cars or dealer lots (with permission). A small script runs them through `/photo-check` and prints a table: expected vs found, false alarms, misses, latency, cost. Tune the prompt (never the facts) until there are no false "critical" findings.
3. **End-to-end:** owner does 3 full inspections on real cars with the dev build.

---

## 17. Milestones (stop after each; report: what was built, quality gates, phone test steps, owner actions, schedule status)

**M0 — Skeleton, data, design** *(Expo Go)* — project, folders, tokens + fonts, SQLite schema, seed loading + `seed.test.ts`, mock clients + fixtures, pure-TS module stubs, README (Windows setup). ✅ app opens in Expo Go; Learn tab placeholder; tests pass.

**M1 — Add a car + vehicle report** *(Expo Go)* — VIN barcode scan, VIN typing with check digit, Y-M-M picker, Supabase project + `/vehicle` with normalization, caching and Deno tests, vehicle report screen. ✅ scanning a real door-jamb VIN shows decode + recalls + complaint bars.

**M2 — Guided inspection + photo checks** *(Expo Go)* — `buildChecklist`, section flow, answers, notes, photos, `/photo-check` + zod + retry, Confirm/Dismiss findings, dashboard mapping (§7.4), VIN/odometer OCR. ✅ a full walkaround works offline except photo checks; token costs logged.

**M3 — Verdict, repairs, questions, script** *(Expo Go)* — verdict engine + full tests, report screen, seller questions, negotiation script (2 tones), copy to clipboard. ✅ all §8 tests pass; 10 scenarios produce expected verdicts.

**M4 — Listing check + price check** *(Expo Go)* — offline flag matching, `/listing-check` (listing + vin_ocr modes), comparables entry (manual + screenshot), price regression, KBB/Edmunds links. ✅ pasting "wire transfer, car in storage" flags "Possible scam" offline.

**M5 — Garage, compare, onboarding, paywall, quotas, dev build** *(Expo Go + EAS)* — garage list/filters, compare, onboarding, RevenueCat + remote paywall (mock in Expo Go) + simulate-premium toggle, `/quota` (+ pass expiry), pass-expiry notification, `eas.json` profiles, iOS dev build on the owner's iPhone. ✅ sandbox purchase of the pass unlocks Premium; free limits enforced server-side.

**M6 — Share, Learn, analytics, settings, polish, store assets** *(Expo Go)* — share cards, Learn guides, PostHog events, Settings (restore, manage, delete data, disclaimers, attributions), accessibility + Reduce Motion, light/dark QA, eval light (§16), store screenshot list. ✅ owner has reviewed every screen.

**M7 — Submit** *(EAS)* — production build, TestFlight with the owner's friends, App Store submission by Dec 11. After launch: Android closed test → production in January.

---

## 18. Owner decisions & actions (ask, don't guess)
1. Final app name + subtitle, bundle ID (check the name isn't already taken on the App Store).
2. New Supabase project (URL + anon key; service key only as a secret) — or reuse the existing Supabase org with a new project.
3. Vision model API key (Supabase secret) + budget alert.
4. RevenueCat: new project/app, products `car_hunt_pass_30d` ($14.99 non-renewing) and `pro_annual` ($39.99), trial yes/no.
5. Privacy policy / terms URLs, support email.
6. **Check the employment contract** for side-project / non-compete clauses before launch (automotive-adjacent product).
7. Before launch, ask a mechanic to skim `data/*.json` (checklist severities and repair cost ranges were drafted by AI).
8. Collect eval photos (§16) by Dec 6.

---

## 19. Later (not in v1)
Paid vehicle-history integration (title/accident history via a licensed provider), OBD2 Bluetooth reader support (read codes + readiness monitors in-app), EU/UK version (DVSA MOT history API for the UK, local recall sources), PDF report export, share a car with a partner, Spanish localization (large US Spanish-speaking used-car market), dealer-mode for small lots.

# Privacy Policy — DRAFT

> **Draft for the owner.** Written from what the app actually does (code in this repository, November 2026). It is
> not legal advice: have it checked before publishing, fill in the [brackets], and publish it at a public URL
> (for example a GitHub Pages site or Notion page). Apple needs that URL in App Store Connect and in the app.
> Romanian users: publish a Romanian version too.

**Used Car Check** ("the app", "we") — [Owner's legal name or company], [address], [country].
Contact: [support email]. Last updated: [date].

## The short version

- Your cars, checks, notes and photos are stored **only on your phone**.
- We don't ask for your name, email or phone number. There is no login.
- Photos you send for an AI check, and listing screenshots, are processed and **not kept** by us.
- We never sell your data and we don't use it for advertising or tracking across apps.
- You can delete everything from **Settings → Delete all my data**.

## What we process, and why

| Data | Where it goes | Why | Kept for |
|---|---|---|---|
| Your cars, checklist answers, notes, photos, similar listings, settings | Only on your phone (local database and app folder) | So the app works, also offline | Until you delete the car, delete all data, or remove the app |
| An anonymous account ID (random, created on first launch) | Our backend (Supabase, [region, e.g. EU – Frankfurt]) | To count free checks and daily limits, and to know if you have Premium | Until you delete all data |
| Daily and lifetime usage counters (number of AI photo checks, screenshot reads, VIN photo reads) | Our backend | Free limits and fair use | Until you delete all data |
| A VIN, or year/make/model, when you look up a car | Our backend, which asks the U.S. National Highway Traffic Safety Administration (NHTSA) | To show decode, recalls, complaints and crash ratings | The NHTSA answer is cached by VIN for 7 days, **without** any link to you |
| A photo you send for an AI check (tire, rust, dashboard, VIN plate…) | Our backend and our AI provider ([Anthropic / Google], as a processor) | To describe what is visible in the photo | Not stored by us; the AI provider may keep it briefly for abuse monitoring under its terms ([link]) |
| Listing screenshots you choose to read | Our backend and our AI provider | To read the ad's text, price and mileage | Not stored by us; phone numbers and emails in the ad are removed from the result |
| Purchases (pass or subscription) | Apple and RevenueCat (our purchase processor), linked to your anonymous account ID | To unlock Premium and restore it | As required by Apple and RevenueCat |
| Anonymous usage statistics (only if switched on in Settings) | PostHog, EU servers | To see which screens and buttons are used and fix problems | [e.g. 12 months] |

Photos are resized and re-encoded on your phone before they are sent, which removes location (GPS) and camera
details (EXIF). We never put VINs, number plates, prices, names or photos into usage statistics, and the share card
you can create never shows the VIN, plate, price or your photos.

## What we don't do

No advertising, no tracking across other apps or websites (no "tracking" in Apple's sense), no selling or renting of
data, no profiling, no location access, no contacts, no microphone.

## Legal bases (EU/UK users)

Running the service you ask for (contract): car lookups, AI checks, free limits, purchases. Legitimate interest:
keeping the service secure and preventing abuse of free limits. Consent: anonymous usage statistics, which you can
switch off at any time in Settings.

## Your rights

You can access, correct or delete your data, object to or restrict processing, and ask for a copy. Almost everything
is on your phone, so **Settings → Delete all my data** removes it, together with your anonymous account and its
counters on our backend. For anything else, email [support email]. You can also complain to your data protection
authority (in Romania: ANSPDCP, www.dataprotection.ro).

## Children

The app is not meant for children under 16 and we don't knowingly collect their data.

## Service providers

Supabase (backend hosting), [Anthropic or Google] (AI photo and screenshot reading), RevenueCat (purchases),
PostHog (optional anonymous statistics), NHTSA (public vehicle data; receives the VIN or model you look up). Where
data leaves the EU, we rely on the providers' Standard Contractual Clauses or the EU–US Data Privacy Framework.

## Changes

If this policy changes, we'll update the date above and, for important changes, tell you in the app.

## Contact

[Owner's legal name or company] · [support email]

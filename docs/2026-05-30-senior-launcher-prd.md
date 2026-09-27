# PRD — ElderHome: Senior Launcher + Medication + SOS (Android)

> Pick #2 from `2026-05-30-android-money-app-research.md`. Chosen for: weakest verified incumbent (BIG Launcher **4.0★ / ~8K reviews / 1M+** — live Play Store, 2026-05-30), no exotic permissions, fastest path to shippable MVP, caregiver-funded willingness-to-pay.

## 1. Problem
Older adults struggle with stock Android: tiny touch targets, dense home screens, accidental taps into settings/stores, missed medications, no fast way to call for help. Existing options each miss something:
- **BIG Launcher** — owns mindshare but only 4.0★; aging UX, paid wall on core, no medication adherence.
- **BaldPhone** (free OSS) — has SOS + reminders but rough UX, no caregiver remote management, low discoverability.
- **Grand Launcher / Simple Launcher** — big UI only; no meds, no SOS, no caregiver layer.

**Gap nobody owns:** launcher **+** medication adherence **+** SOS **+** *remote caregiver management* in one trusted, polished app. The buyer (adult child / caregiver) is distinct from the user (senior) — that splits acquisition from usage and creates the paid wedge.

## 2. Target users
- **Primary user (the senior):** 65+, low tech confidence, often farsighted / reduced dexterity, may have mild cognitive decline. Needs: call family, take meds, get help, not get lost in the OS.
- **Buyer (the caregiver):** 35–60 adult child or family member. Pays. Wants peace of mind: "Did mom take her pills? Can she reach me? Did she wander into a scam?"
- **Geography:** Launch English (US/UK/CA/AU). Fast-follow Hebrew + Spanish (RTL/i18n is cheap to bake in early — I already have the muscle from LexiClash). Large aging populations + caregiver-pays culture in India/SEA/LatAm = expansion tier.

## 3. Core value proposition
"Set up your parent's phone once. They get three big buttons that always work. You get a quiet dashboard that tells you they're okay."

## 4. MVP scope (v0.1 — ship in ~6–8 weeks solo)
Ruthless cut. Ship the smallest thing a caregiver would pay for.

**On-device (senior phone):**
1. **Launcher home** — full-screen, max 6 large tiles, high-contrast, configurable. Tiles: Phone, Messages, Camera, one Favorite Contact (photo + name), Meds, **SOS**.
2. **Big-button dialer + favorite contacts** — photos, one-tap call. No search, no keypad by default.
3. **Medication reminders** — caregiver-defined schedule; full-screen alarm with photo of the pill + "Taken" / "Snooze"; logs taken/missed locally.
4. **SOS button** — long-press (anti-accident) → calls primary contact AND sends SMS with last-known location. No backend needed for v0.1 (uses device telephony + SMS + fused location).
5. **Lockdown** — hide system UI chrome, block accidental exits, optional PIN to leave launcher (caregiver-set).

**Caregiver side (v0.1 = on-device setup, NOT cloud):**
- Caregiver configures everything **on the senior's phone during setup** (contacts, meds, SOS number). Zero backend. Ships faster, no privacy/liability surface, no server cost.

**Explicitly OUT of v0.1:** remote dashboard, cloud sync, real-time "did they take pills" push to caregiver's phone, GPS tracking history, video call, app whitelist store. All deferred to v0.2 (the subscription hook).

## 5. Monetization
- **v0.1:** one-time purchase **$4.99** (launcher + meds + SOS, fully on-device). Removes the trust/privacy objection; gets reviews + ASO ranking.
- **v0.2 (the recurring revenue):** **Family plan $4.99/mo** unlocks the *remote* layer — caregiver app on their own phone showing med-adherence log, SOS alerts as push notifications, remote reminder editing, low-battery/no-activity alerts. This is what caregivers actually pay monthly for; it needs a backend (Supabase fits) and is the moat.
- Rationale: one-time de-risks adoption + builds rank; subscription monetizes the caregiver's ongoing anxiety. Matches the report's "vertical subscription" thesis. Android sub fee is now 10% post-Epic.

## 6. Validation BEFORE building (do this first — 1 week, ~$0–50)
The report flagged demand size as medium-confidence. Validate cheaply:
1. **Landing page** (1 page, can host on Vercel — I can build this *today* in this stack) describing ElderHome + "Notify me" email capture + a fake $4.99 "Get early access" button → measures intent (click = signal).
2. **Subreddit probes:** post the concept (not spam — a "would this help?" framing) in r/CaregiverSupport, r/AgingParents, r/dementia. Measure upvotes + "where can I get this" comments.
3. **Competitor review mining:** pull 1–2★ BIG Launcher + BaldPhone reviews; cluster the top complaints → confirm they map to our MVP features (de-risks building the wrong thing).
4. **Kill criterion:** if landing-page intent < ~3% click-to-"get-access" AND subreddit posts get <20 upvotes / no "I'd pay" comments → pivot to pick #1 (ADHD) instead of building.

## 7. Build feasibility (solo)
- **Stack:** Native Android (Kotlin + Jetpack Compose). Launcher = `HOME` intent-filter activity + `WindowInsetsController` for lockdown. Meds = `AlarmManager` + `Notification` full-screen intent. SOS = `TelephonyManager` + `SmsManager` + `FusedLocationProvider`. All standard, no banned APIs (unlike call-recording).
- **v0.2 backend:** Supabase (auth + Postgres + realtime for caregiver dashboard) — I already run Supabase in LexiClash.
- **Permissions:** CALL_PHONE, SEND_SMS, ACCESS_FINE_LOCATION, POST_NOTIFICATIONS, QUERY_ALL_PACKAGES (launcher), SCHEDULE_EXACT_ALARM. All grantable; declare SMS/Call use justification for Play review (legit launcher/safety use case).
- **Risk:** Play Store review scrutiny on SMS/Call permissions — mitigate with clear in-listing justification + privacy policy. Background-restriction on Xiaomi/Oppo/Samsung killing alarms — add a setup step guiding battery-optimization whitelist (this is also a *differentiator* the incumbents handle poorly).

## 8. Success metrics
- Validation gate: ≥3% landing intent + qualitative "I'd pay" signal.
- v0.1: 4.5★+ rating, 1k installs in 90 days (beat BIG Launcher's 4.0★ on quality).
- v0.2: ≥5% of active installs convert to family plan → 1k subs × $5 ≈ $5k/mo.

## 9. This repo vs. the app
ElderHome is a **separate native Android project** — it does NOT belong in the LexiClash (Next.js) codebase. What CAN live here / be built now: the **validation landing page** (Next.js + Vercel, my home turf). Recommend: spin ElderHome up as its own repo when validation passes; build the landing page first.

---

## Immediate next actions (validation-first)
1. Build the **ElderHome validation landing page** (Next.js, deployable to Vercel) — concept, 3-feature pitch, email capture, fake-door "$4.99 early access" button with analytics.
2. Draft the 3 subreddit probe posts (non-spammy, value-framed).
3. Mine BIG Launcher / BaldPhone 1–2★ reviews → complaint cluster → confirm feature-fit.
4. Decide at the kill-gate, then scaffold the native repo only if signal is positive.

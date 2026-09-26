status: research-only
files_touched: none
attempted: education upsell lead-gen CTA; rewarded-ad funnel gap fix

findings:
1. Education lead-gen (top candidate) ALREADY SHIPPED — closed, not a gap.
   `app/[locale]/education/for-schools/page.tsx` has full honest lead-capture
   (#lead anchor, ForSchoolsPackages component, Teacher Pro $9/mo + Classroom
   $39/term + "contact us" school/district tier, JSON-LD Offer schema).
   Linked from both `app/[locale]/education/page.tsx:295` (hub) and
   `app/[locale]/teacher/upgrade/PageClient.tsx:319`. No further action needed
   here — the STEP 2 "known surface" note in tonight's prompt (education has
   "NO pricing, NO lead capture") is stale; update that doc.

2. Intel brief signal (rewarded_ad_watched ~0/24h) is a measurement artifact,
   not a live bug. `rewarded_ad_offered/watched/declined` only fire from
   `hooks/useAdMob.ts` (native AdMob path). The H5 web rewarded path
   (`hooks/useRewardedAd.ts`) never fires these events and is triple-gated
   OFF pending AdSense approval — so near-zero web-side events is expected,
   not a funnel break. Also: `useAdMob.ts:91-99` already has a code comment
   documenting a PAST fix for "rewarded_ad_offered with ZERO downstream
   breadcrumbs" (config-not-loaded early exit now signals onError
   immediately) — this exact failure mode is already closed.
   Do NOT re-chase this signal without a native-side (AdMob console / Android
   PostHog $host-filtered) query — the current brief's denominator is
   web-only and near-zero by design.

next_steps:
- Fix STEP 2 "known surface" doc: for-schools lead-gen already exists+linked,
  remove from candidate list so future runs don't re-discover it.
- If chasing rewarded-ad engagement: query PostHog filtered to
  `$host` = native/Android app, not web, before concluding anything is broken.
- Real untouched opportunity for a future lane: no "remove ads / supporter"
  IAP-interest probe exists yet (STEP 3 option 3) — would need new
  instrumentation only (no purchase path), TDD, ~1 file. Good candidate for
  tomorrow if a lane has full time budget early in the run.

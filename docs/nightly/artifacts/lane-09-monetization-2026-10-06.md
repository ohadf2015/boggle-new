status: research-only
attempted: planned education lead-gen CTA; found it already fully shipped, pivoted to verify + backlog
files_touched: none

## Correction to tonight's brief
Brief said: "Education free... NO pricing, NO lead capture, NO contact-sales anywhere."
**This is stale.** Verified live in code:
- `app/[locale]/education/for-schools/page.tsx` has full pricing tiers (Free/Pro $9mo/
  Classroom $39term/Schools-districts) in JSON-LD + on-page compare table, two CTAs
  (`#lead` anchor), closing CTA for scroll-through readers.
- `components/education/SchoolLeadForm.tsx` is a real working lead form — POSTs to
  `/api/education/school-lead`, validates, tracks `school_lead_form_viewed` /
  `school_lead_submitted` growth events, locale-aware (5 langs, ru falls back to en
  per `school_leads.locale` CHECK constraint).
- `for-schools` is cross-linked from the education hub (`app/[locale]/education/page.tsx`)
  and from every sub-page via `EducationRelatedLinks` + `lib/seo/educationPageLinks.ts`.
- Ad-event instrumentation (`rewarded_ad_offered/watched/declined/lifecycle`) is already
  centralized in `utils/growthTracking.ts:1541-1590`, dual-emitted for the collector script.
  The brief's "0/24h rewarded_ad_watched" signal is very likely a genuine low/zero-Android-
  traffic night, not a missing-instrumentation bug — do not re-wire this blindly.

## Ranked backlog for tomorrow (none of this is a code bug tonight)
1. **Funnel visibility, not a fix**: no dashboard compares `school_lead_form_viewed` →
   `school_lead_submitted` conversion. Worth a PostHog funnel insight (read-only, no code)
   next time the monetization lane runs — would reveal if the form itself is the bottleneck
   or if it's top-of-funnel traffic (education pages get visitors at all).
2. **If `rewarded_ad_watched` stays at 0 for 3+ consecutive nights**, that's a real signal
   worth investigating (AdMob config / native build regression) — 1 night of 0 is not
   enough evidence given Android-only + brief's own stale-collector caveat.
3. **IAP/subscription demand probe** (prompt's option 3, analytics-only, no billing) is
   still untried — a flagged `iap_viewed` probe on an education-adjacent surface could
   measure "remove ads / supporter" interest without touching the coin economy or payments.
   Good candidate for a future night with a fuller time budget (this one pivoted late
   after the orientation phase).
4. Hand-off to Lane 08 (not touched here, per boundary): none of the informational/content
   pages were edited.

next_steps: next monetization lane should (a) spend the first 5 min re-verifying the brief
against current code before picking an action — tonight's brief was wrong about the single
biggest "opportunity" it surfaced — and (b) if time allows, build the IAP-interest probe
(item 3) as the actual shippable TDD task, since lead-gen and ad-event plumbing are both
already done.

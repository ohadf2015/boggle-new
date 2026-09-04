status: research-only
attempted: verify education lead-gen state + look for a small safe revenue ship.
files_touched: none

findings:
- for-schools page (`app/[locale]/education/for-schools/page.tsx`) is FULLY built: pricing
  ($149/yr school plan, free 30d trial), JSON-LD Offers, `SchoolLeadForm` wired to
  `app/api/education/school-lead/route.ts`, and BOTH `school_lead_form_viewed` and
  `school_lead_submitted` growth events already tracked. This contradicts the lane
  prompt's STEP2 assumption ("Education free, NO pricing, NO lead capture") — that
  brief text is stale, code has moved on. Nothing to ship here tonight.
- rewarded-ad events (`rewarded_ad_offered/watched/declined`) are all wired in
  `utils/growthTracking.ts`. Didn't get to cross-ref which surfaces actually call
  `offered` vs just `watched` — needs a live PostHog query, ran out of time budget
  before reaching it (posthog MCP schema-first workflow is multi-round-trip, didn't
  fit remaining ~15min).
- IMPACT CHECK item from brief (games-for-teachers → for-schools referrer pageviews,
  baseline 0) — NOT completed. Needs a live posthog query-trends call; deferred.

next_steps (ranked for tomorrow):
1. Run the deferred IMPACT CHECK: posthog query-trends on `$pageview` for
   `/education/for-schools` filtered `$referrer contains games-for-teachers`, 7d
   before/after 2026-08-25. Append verdict to impact-ledger.ndjson per the brief's spec.
   If regressed, that becomes top priority.
2. Cross-ref `rewarded_ad_offered` vs `rewarded_ad_declined` per surface (posthog
   query-trends breakdown by `surface`) — find the surface with the worst
   offered→watched conversion and consider a CTA/timing tweak there (flagged, no new
   interstitials).
3. Since for-schools lead-gen is complete, next education-upsell lever is likely
   DISTRIBUTION not capture: check whether the for-schools page is linked from
   `/education` hub nav and `/teacher` dashboard (not just games-for-teachers related-
   resources) — a fast, safe internal-linking pass.
4. `ADMOB_API_TOKEN` still unprovisioned per brief note — founder action, not code.

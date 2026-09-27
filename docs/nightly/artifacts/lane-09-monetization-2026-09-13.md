status: research-only
attempted: education upsell lead-gen (STEP 3 option 1).

FINDING: brief's premise is stale. `/education/for-schools` already ships full
lead-gen: pricing ($9/mo Pro, $39/term Classroom, contact-us for district),
schema.org Offer JSON-LD, `#lead` form w/ `data-ph-capture-attribute-cta`,
hero + footer CTAs, 6-locale content.ts. Linked from education hub
(app/[locale]/education/page.tsx:282). Nothing to add here — do NOT re-ship
this idea in future lanes. (memory-worthy: correct
`education-open-followups-2026-09-01` / lane-09 boilerplate, which both
assumed "no pricing, no lead capture, no contact-sales anywhere".)

Ran out of safe runway to start option 2 (ad-UX instrumentation) or option 3
(IAP probe) given the ~23min finalize window — starting either now risks a
half-verified diff at kill time, worse than shipping nothing.

files_touched: none
next_steps:
- Fix stale assumption in the lane-09 prompt template (STEP 2 orient block)
  and memory `education-open-followups-2026-09-01`: for-schools lead-gen is
  DONE, remove from backlog.
- Next real option-2 candidate: check `rewarded_ad_offered` vs
  `rewarded_ad_declined` event coverage across the 6 rewarded surfaces
  (hooks/useRewardedAd.ts) — brief's only signal this run
  (ad_event_rewarded_ad_watched 13/24h) has no offered/declined denominator
  to judge if that's healthy or a funnel drop. Wire the missing event first.
- IAP interest-probe (option 3) still unbuilt — untouched, good size for a
  fresh 8-min lane start tomorrow.

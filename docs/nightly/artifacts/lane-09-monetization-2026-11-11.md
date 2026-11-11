status: research-only
attempted: planned an education lead-capture CTA on for-schools page per brief's "known surface" — found it's STALE, already fully built.

## Findings

1. **Brief's "education free, NO pricing, NO lead capture" is stale.** `app/[locale]/education/for-schools/page.tsx`
   already ships a full funnel: `NoAccountCta`, `ForSchoolsPackages` lead form (#lead), schema.org Offers for
   Free/Pro($9mo)/Schools($49/teacher/yr, 5+, invoice/PO), FAQ, closing CTA. No safe incremental lead-gen work here.
   Correct lane-09 prompt's "known surface" section next run.

2. **Real gap found: individual Pro banners never cross-sell the Schools tier.** All 7 `<ProBanner>` instances
   (`TrialUrgencyBanner`, `TeacherTrialReminderBanner`, `PaymentFailedBanner`, `TeacherProTrialLifecycleBanner`,
   `PendingCheckoutBanner`, `TeacherProTrialExpiringBanner`, `TeacherProTrialEndedBanner`) pitch only the $9/mo
   individual Pro plan. A teacher managing multiple classes near the free-tier cap (3 classes/50 students) is the
   exact Schools-tier ($49/teacher/yr, 5+ teachers) lead, but never sees that path from inside the product — only
   from the standalone `/education/for-schools` marketing page. Next step: one small text link in
   `ProBanner.tsx`'s body slot ("Need it for your whole department? <link>") pointing to `/education/for-schools#lead`,
   5-locale `t()` keys, behind no flag needed (text-only addition, zero layout risk). Did not ship tonight — ran out
   of time budget after verifying the existing funnel; this is a clean 1-file, TDD-able task for tomorrow.

3. **Ad signal in brief too thin to act on**: `rewarded_ad_watched` 0/24h, reach=0, severity=0.4 — brief itself flags
   `revenue`/PostHog sources as stale/reused. Not enough signal to diagnose a real ad-funnel break vs just low
   night-time traffic. Don't chase without fresher data.

4. Guardrail reminder for future runs: GemShop.tsx / word-craft gems files are mid-edit by another session tonight
   (uncommitted diffs present at lane start) — do not touch, not economy-safe to co-edit blind.

files_touched: none
next_steps: ship finding #2 (Schools-tier cross-sell link in ProBanner body, 5 locales, TDD) as lane-09's first task
next run — smallest, safest, highest-leverage item identified. Also correct the lane-09 prompt's stale "known
surface" section so future runs don't re-discover finding #1.

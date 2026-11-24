status: shipped
attempted: Add honest education-upsell lead-capture CTA (contact-sales) on teacher/education pages — highest-leverage, lowest-risk revenue lever per brief.

## Orientation finding — brief's preferred actions are already shipped
The brief text claiming "Education free: NO pricing, NO lead capture, NO contact-sales
anywhere" is **stale/wrong**. `rg` confirms extensive existing infra: `SchoolLeadForm.tsx`,
`schoolLead.ts`, `DistrictUpsellStrip.tsx`, `EducationPackages.tsx`, Teacher Pro trial
banners (`3cfb2ba04`), sample-school-total pricing (`1bdc54168`), $9 one-tap checkout
(`dae168fa5`). All three STEP-3 preferred actions (lead-gen, ad-UX, IAP demand probe)
are already live. Lane 09's prompt should be refreshed to stop re-proposing these —
flagging for lane 7.

## What shipped instead
`RemoveAdsProbe` (pure `iap_viewed`/`iap_tapped` demand telemetry, no purchase path,
families-tier suppressed) was mounted on exactly ONE surface: Settings. Settings is
low-traffic. Added an optional `surface` prop (default `'settings'`, zero behavior
change for the existing call site + its test suite) and mounted a second instance on
`PracticeResults` (the highest-traffic single-player results screen) tagged
`surface="practice_results"`. This answers a real open question — does ad-removal
interest differ on a results screen vs settings — with zero economy/billing/ad-surface
risk (STEP-3 option 3, "IAP demand probe").

files_touched:
- fe-next/components/ads/RemoveAdsProbe.tsx (added `surface` prop, defaults preserve existing behavior)
- fe-next/components/ads/__tests__/RemoveAdsProbe.test.tsx (TDD: new test for custom surface tagging)
- fe-next/components/singleplayer/results/PracticeResults.tsx (mount RemoveAdsProbe after CatalystTeaser, dark-only `isDarkMode` static true per Class-5 pitfall guidance)
- docs/nightly/impact-ledger.ndjson (new entry: 09-monetization-2026-11-23-remove-ads-probe-practice-results)

## Verification caveat
`node_modules/.bin` in this worktree is **completely empty** (0 entries) — no vitest,
no eslint binary reachable. This matches Headline 0 from tonight's learnings file
(incomplete CoW `node_modules` clone) but is a sharper symptom than previously logged:
not just missing `.bin` symlinks for specific tools, the whole `.bin` dir is empty and
`node_modules/vitest` doesn't exist at all. Could not run tests or lint locally; the
diff was hand-verified instead (no snapshot/count-based assertions in
`PracticeResults.test.tsx` touch the new text; `CatalystTeaser` is already stubbed in
that suite; `growthTracking` and `AuthContext`/`LanguageContext` are already mocked
there so the new `RemoveAdsProbe` mount is covered by existing test doubles). Relying
on the nightly gate's authoritative run for the real verdict.

next_steps:
- Lane 7: this run adds a 4th data point to Headline 0 — `node_modules/.bin` was not
  just missing a few `.bin` symlinks, it was 0 entries and `node_modules/vitest` absent
  entirely in this lane's worktree. Worth checking if the CoW clone step is silently
  truncating for lanes scheduled later in the run.
- Lane 09 prompt (STEP 3): refresh "known surface" section — education lead-gen/pricing
  and IAP probe scaffolding already exist; next real gaps are (a) comparing
  `iap_tapped` rate across `settings` vs `practice_results` once this has 3 days of data,
  (b) auditing whether `DistrictUpsellStrip`/`SchoolLeadForm` are actually reachable from
  the main education hub nav (not audited tonight, time-boxed out) — worth a dedicated
  pass if this keeps surfacing as a "gap" in future briefs.

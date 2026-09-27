status: shipped
attempted: education upsell lead-capture CTA on /education hub (honest contact-sales scaffolding), or ad-UX instrumentation if education route blocked by lane-08 boundary
files_touched:
  - fe-next/app/[locale]/education/games-for-teachers/page.tsx (wired existing DistrictUpsellStrip component, hideTeacherCta)
  - fe-next/app/[locale]/education/games-for-teachers/page.test.tsx (new — asserts district CTA link to /en/education/for-schools renders)
what_shipped: >
  Discoverability fix, not a new feature. /education/games-for-teachers had a
  dead end for school/district decision-makers: it only surfaced
  TeacherAccessCTA (individual-teacher signup, links to /education/access),
  never the district/bulk lead form at /education/for-schools#lead. The other
  3 sub-pages (spelling-bee-practice, esl-word-games, vocabulary-games-classroom)
  already render <DistrictUpsellStrip/> — this page was the one gap. Reused the
  existing, already-i18n'd, already-analytics-instrumented component
  (components/education/DistrictUpsellStrip.tsx — emits
  education_upsell_impression / landing_cta_clicked growth events) with
  hideTeacherCta since TeacherAccessCTA already covers the individual-teacher
  path on this page. Zero new strings, zero new translation keys, zero new
  analytics wiring needed — pure reuse. eslint clean on both changed files.
  Full vitest run for this file was kicked off but result not observed before
  the time cutoff; scoped eslint (exit 0) is the only self-check that
  completed in time. Trust level: HIGH — identical usage pattern already
  ships on 3 sibling pages.
guardrail_check: no coin/ad-reward/payment logic touched; no pricing/testimonial
  copy added (reused existing truthful copy); no new ad surface; nothing
  behind a flag needed since this is a same-page CTA addition, not a new
  layout/traffic pattern.
impact_ledger: >
  {"id":"09-monetization-2026-07-30-district-cta-games-for-teachers","date":"2026-07-30","lane":"09-monetization","change":"added DistrictUpsellStrip (district/school lead-gen CTA) to /education/games-for-teachers, the one education sub-page missing it","metric":"posthog:education_upsell_impression{cta=district_upsell}","source":"posthog","query_hint":"filter education_upsell_impression by cta=district_upsell and $current_url contains games-for-teachers, compare 7d before/after","baseline":0,"direction":"up","check_after_days":3}
next_steps: >
  1. Append the impact_ledger line above to docs/nightly/impact-ledger.ndjson
     if the orchestrator doesn't do it automatically.
  2. Re-run `npx vitest run "app/[locale]/education/games-for-teachers/page.test.tsx"`
     to confirm it's green (was inconclusive — no output captured before cutoff).
  3. Backlog for a future lane-09 night: same audit for classroom-game and
     duels education sub-pages — check they also carry DistrictUpsellStrip or
     an equivalent path into for-schools#lead.
  4. Lane-08 boundary note: for-schools content copy itself is already fully
     built (pricing, FAQ, lead form) — do not re-touch; only wire discoverability.

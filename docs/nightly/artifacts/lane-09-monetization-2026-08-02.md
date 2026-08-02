status: research-only
attempted: add honest "for schools / bulk pricing — contact us" lead-capture CTA on education/teacher pages (t() 5 locales, TDD)

## Findings
- Education upsell scaffolding is already fully built: `SchoolLeadForm` + `/api/education/school-lead` live on `for-schools` page; `DistrictUpsellStrip` mounted on esl-word-games, spelling-bee-practice, vocabulary-games-classroom, games-for-teachers, access, and the education hub. No paywall, no fake stats — clean.
- Gap found (not shipped, ran out of safe time budget): `education/classroom-game` and `education/duels` PageClients have ZERO upsell/lead-capture CTA (grepped, no matches). These are the actual in-game surfaces a teacher lands on after clicking "free game" — currently a dead end for conversion. Candidate for tomorrow: add `<DistrictUpsellStrip hideTeacherCta />` (or a lighter footer variant) to both, TDD, 5 locales already exist as translation keys reused from the strip component so no new i18n needed.
- IMPACT CHECK (brief item, score 0.4) run via PostHog SQL: `growth:landing_cta_clicked` where `cta='district_upsell'` over last 7d = **0**, same as baseline 0. Verdict appended to `docs/nightly/impact-ledger.ndjson`: `neutral` (not regressed — still zero exposure/clicks, not yet measurable; the July 26 circular-link fix didn't create a regression, but there's no traffic on this CTA to judge lift from). Root cause likely low overall traffic to `access` page, not the fix itself.
- Ad brief item (score 0.15, `rewarded_ad_watched` 0/24h vs 7d avg 3.29) — low severity, not investigated this run; noted for lane rotation.

## next_steps
1. Wire `DistrictUpsellStrip` (or footer CTA) into `education/classroom-game` and `education/duels` PageClients — highest-leverage untouched surface, TDD, no new translation keys needed.
2. Re-run the district_upsell impact query next week once (1) ships — 0 clicks with 0 exposure isn't a real read yet.
3. Check `rewarded_ad_watched` 0/24h — likely just an off night, compare to 7d trend before treating as a regression.

files_touched: none (docs/nightly/impact-ledger.ndjson append only)

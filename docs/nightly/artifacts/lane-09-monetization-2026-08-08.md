status: research-only
attempted: add honest "for schools" contact-sales lead-capture CTA on education hub page
files_touched: none

findings:
- All 3 prescribed brief actions are ALREADY SHIPPED by prior nights, verified live in code:
  1. Education lead-gen: `app/[locale]/education/for-schools/page.tsx` has full
     `SchoolLeadForm` (id="lead"), hero CTA, closing CTA, FAQ. Linked from
     education hub (`PageClient.tsx`), `teacher/upgrade/PageClient.tsx`, and
     hub `page.tsx`.
  2. Ad-UX instrumentation: `trackRewardedAdOffered/Watched/Declined` wired
     across 9+ surfaces (DoubleGoldAdButton, TimeLowAdPrompt,
     RewardedAdGoldButton, WatchAdButton, WatchAdForFreezeButton,
     BossRushResults, RetryAssistModal, ShareSection, MemoryHuntCluePanel)
     — exceeds the "6 rewarded surfaces" in the known-surface brief.
  3. IAP interest probe: `RemoveAdsProbe` (mounted in `settings/PageClient.tsx`)
     and `SupporterInterestCard` (mounted in `profile/PageClient.tsx`) both
     exist and are wired, emitting `iap_viewed`.

- REAL GAP FOUND (next actionable item): the 4 education SEO/organic-traffic
  landing pages — `esl-word-games`, `spelling-bee-practice`,
  `vocabulary-games-classroom`, `games-for-teachers` — have ZERO link into
  `for-schools` or `teacher/upgrade`. These are exactly the pages founder
  priority #3 (education growth) targets for organic acquisition, and they
  currently dead-end high-intent readers (a teacher/admin landing via SEO on
  "vocabulary games classroom" never sees the schools/pricing-inquiry path).
  Contrast: education hub, profile, settings, teacher/upgrade all correctly
  link to for-schools — only these 4 SEO pages don't.

next_steps:
- Build one small shared CTA component (e.g. `components/education/ForSchoolsCta.tsx`,
  reuse hub's copy/keys where possible) and mount it as a closing-section on
  the 4 pages above. Needs: 1 new i18n key set (or reuse existing
  `education.forSchools.*` keys) across 5 locales, TDD test per page
  asserting the link renders + href, PostHog `data-ph-capture-attribute-cta`.
  Estimated M effort — fits a focused lane-09 slot with time to spare at the
  start of a run (this run had ~5 min left after discovery, not enough to
  land + eslint-verify safely).
- Revenue snapshot (`docs/nightly/intel/revenue-latest.json`) still
  stale/absent per intel brief — founder should run
  `scripts/nightly/lib/pull-revenue-snapshot.sh` and/or provision
  `ADMOB_API_TOKEN` for unattended revenue signal.

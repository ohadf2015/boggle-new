status: research-only
attempted: education-upsell lead-gen CTA and ad-UX instrumentation — both already fully shipped, verified instead of duplicating.

## Verified already-built (do NOT re-propose these — close the finding)
- **School-lead capture**: `components/education/SchoolLeadForm.tsx` wired via `EducationPackages`
  into `for-schools/page.tsx`. Backend `app/api/education/school-lead/route.ts` — fail-open rate
  limit via SECURITY DEFINER RPC (deliberate: a plain SELECT would 0-row under RLS and silently
  disable the limiter), admin notify email, `{ok, success}` dual-key response. No bug found.
- **District/teacher upsell CTA**: `DistrictUpsellStrip` renders on every page using
  `EducationLandingTemplate` (`showDistrictUpsell` defaults true) — covers spelling-bee-practice,
  esl-word-games, vocabulary-games-classroom, sight-words-practice, englishLearner pages, and more.
  Tracks `education_upsell_impression` + `landing_cta_clicked` via `trackGrowthEvent`. The
  `hideTeacherCta` default/override pairing (`showTeacherAccessCta:false` + `districtUpsellHideTeacherCta:false`
  set together on 5 pages) is deliberate, not a bug — swaps the full `TeacherAccessCTA` block for
  the compact in-strip version.
- **i18n**: `districtCta.*` / `teacherLeadCta.*` keys present in all 6 locales (en/es/he/ja/ru/sv) —
  no fallback-English gap.
- **Ad rewarded-lifecycle telemetry**: `trackRewardedAdOffered/Watched/Declined` wired through
  `useRewardedAd.ts` across every rewarded surface (daily freeze/watch, boss-rush, retry-assist,
  drill-clue, gold top-up, time-low-extend) — not missing instrumentation, contrary to what the
  intel brief's low reach score suggested. `useAdMob.ts` already has extensive stall/immersive-mode/
  visibility-suspend handling with inline incident history — too delicate to touch blind in a
  10-min budget without device-level repro.

## Why no ship tonight
Intel brief signal was thin (score 0.1, flagged stale) and every code-side hypothesis it or the
prompt's playbook suggested (missing lead form, missing district CTA, missing i18n, missing ad
event wiring) turned out to already exist and be well-hardened. Rather than force a change into a
delicate ad-lifecycle file or duplicate an existing CTA, held the line per guardrail #4
(autonomy — ship reversible small stuff, but this session found nothing both safe AND net-new).

## Ranked backlog for tomorrow (real, unverified next steps)
1. **Measure the funnel, don't guess**: query PostHog for
   `education_upsell_impression` → `landing_cta_clicked` → `school_lead_form_viewed` →
   `school_lead_submitted` conversion rates per page/locale. This codebase has the CTAs and the
   events already — nobody has looked at whether the funnel converts. This is the actual highest-
   leverage next step (data analysis, not a code change).
2. **rewarded_ad_watched 0/24h**: before treating as a bug, confirm it's a volume artifact (mp_round
   feedback also only had 1 response in 7d — traffic looks generally low this window) vs a real
   regression. Query `rewarded_ad_offered` volume same window; if offered > 0 and watched = 0,
   that's a real conversion-path break worth a focused lane.
3. **`revenue-latest.json` snapshot is stale/absent** per brief note — founder should re-run
   `scripts/nightly/lib/pull-revenue-snapshot.sh` (interactive Playwriter) so future briefs aren't
   flying blind on eCPM/fill-rate.
4. If a code change is wanted next time: `useAdMob.ts` / `useRewardedAd.ts` are NOT a quick-diff
   target — extensive native-lifecycle edge cases documented inline; any change there needs a full
   session, not a 10-min slice.

files_touched: none
next_steps: see ranked backlog above — funnel measurement (PostHog query) is the top item, not a code change.

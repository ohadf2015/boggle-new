status: research-only
attempted: audited 3 candidate revenue levers before writing code; all three found already fully shipped by prior nights — no safe net-new lever found in budget
files_touched: none

## Findings (all pre-existing, verified via rg — do not re-propose)
1. **Education lead-gen**: `/education/for-schools` has a live `SchoolLeadForm`
   (components/education/SchoolLeadForm.tsx) wired to `school_lead_form_viewed`/
   `school_lead_submitted`. Main hub + PageClient link to it. Teacher dashboard
   (`/teacher/upgrade`) has a district-inquiry CTA → `/education/ln` lead form,
   `iap_viewed` tracked on impression + click. This directly contradicts the
   brief's "Education free... NO pricing, NO lead capture" framing — that's stale,
   update the standing brief.
2. **Rewarded-ad funnel**: fully instrumented end-to-end (`trackRewardedAdOffered`/
   `Watched`/`Declined` + `trackRewardedLifecycle` breadcrumbs) across every ad
   surface (DoubleGoldAdButton, TimeLowAdPrompt, WatchAdButton, WatchAdForFreezeButton,
   BossRushResults, RetryAssistModal, MemoryHuntCluePanel, drill panels) with test
   coverage for each. The brief's "`rewarded_ad_watched: 0/24h`" signal is a low-
   traffic artifact (7d avg 0.71/24h — this app has few nightly-hour players), not a
   wiring gap. useAdMob.ts already has extensive native-lifecycle hardening comments
   (immersive-mode bug, visibility-reconcile, safety timeouts) from a prior incident.
3. **IAP interest probe**: `components/ads/RemoveAdsProbe.tsx` already exists,
   tracks `iap_viewed`/`iap_tapped` with `intent: remove_ads`, shows a
   "coming soon" — exactly what STEP 3 option 3 proposed. Already shipped.

## Ranked backlog for tomorrow (lane 09 or hand-off)
1. **[measure, not build] Query `iap_tapped`/`school_lead_submitted` conversion
   over the last 14d** — infra is built and instrumented; nobody has looked at
   whether it's converting. If `school_lead_submitted` is near-zero despite
   `school_lead_form_viewed` traffic, that's a form-friction bug worth a night.
2. **[gap, real] No visible link from `/education/esl-word-games`,
   `/education/vocabulary-games-classroom`, `/education/spelling-bee-practice` to
   `/education/for-schools`** — these are the highest-intent teacher-search landing
   pages and don't route to the lead-gen page. BUT these are Lane 08's
   (AdSense-content) pages per the boundary rule — hand off, don't edit directly.
3. **[hygiene] Update `learnings.md` STEP 3 known-surface note** — "Education
   free... NO pricing, NO lead capture" is now false; a future lane will waste a
   night rediscovering this artifact's findings if the standing prompt isn't fixed.
4. Revenue snapshot: brief was thin (search source stale, no Playwriter
   snapshot) — founder should re-run `scripts/nightly/lib/pull-revenue-snapshot.sh`.

next_steps: query conversion on existing lead-gen + IAP-probe instrumentation before building anything new; fix the stale "no lead capture" line in the standing lane-09 prompt/brief.

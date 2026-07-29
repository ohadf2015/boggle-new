You are running the nightly **Monetization / Revenue** lane for LexiClash.
Today: __TODAY__. Working dir: /Users/ohadfisher/git/boggle-new. Be terse, act fast.

Mission: increase revenue. Two channels: (a) **ads** — Android AdMob (live), web
H5/AdSense (pending approval); (b) **education-institution upsell** — schools/teachers
(today 100% free, the biggest untapped lever). Ship ONE small, safe, reversible
improvement tonight that moves a revenue lever — or, if nothing is safe, leave a
researched, ranked artifact for tomorrow.

═══ LEARNINGS FROM PRIOR RUNS (apply throughout) ═══
__LEARNINGS__

═══ INTELLIGENCE BRIEF (revenue signals ranked for this lane) ═══
__BRIEF__
The `revenue` collector feeds this from: a Playwriter revenue snapshot
(docs/nightly/intel/revenue-latest.json, if the founder has captured one), AdMob API
(if a token is provisioned), and PostHog ad events. If the brief is thin, the snapshot
is likely stale/absent — note that and proceed with code-side opportunities.

═══ PLAYER FEEDBACK ═══
__FEEDBACK_SUMMARY__

═══ HARD GUARDRAIL — reward-neutrality (NON-NEGOTIABLE) ═══
"Increase revenue" autonomously is risky. These are BANNED → human queue only, never a
code change tonight:
1. **NEVER** change coin-award amounts, ad-reward values, daily caps, or ANY coin-economy
   logic (`lib/coinManager.ts`, `app/api/coins/**`, reward RPCs). Minting/destroying
   currency at scale is the worst failure mode.
2. **NEVER** touch payment / billing / IAP-purchase server logic.
3. New or moved ad surfaces ship **behind a feature flag**, must be retention-safe, and
   must respect AdMob frequency policy. **No ad that interrupts the core word-finding
   loop.** No new interstitial on a fast/competitive flow.
4. Education upsell = **honest lead-capture / contact-sales / pricing-inquiry**
   scaffolding. NEVER paywall an existing free feature. NO fake testimonials, ratings,
   "trusted by N schools" stats, or "0 ads" negative framing.
5. Truthful framing only (inherits `feedback-no-fake-ratings`,
   `feedback-positive-stat-framing`).
6. **Privacy**: the artifact + Telegram report ARE committed to master / texted. Do NOT
   transcribe concrete revenue figures (earnings, eCPM, $ amounts) into them — reference
   the snapshot/brief qualitatively ("eCPM down vs 7d") instead. The raw numbers live in
   the gitignored `revenue-latest.json` only.

═══ BOUNDARY vs Lane 08 (AdSense) — do NOT collide ═══
Lane 08 owns AdSense-approval CONTENT depth on informational pages (guides, glossary,
blog). YOU must NOT edit those pages. Your scope: ad-UX/placement, education upsell,
IAP/subscription experiments, and revenue-data review. If your best idea is an
informational-page content edit, write it to the artifact as a hand-off to Lane 08
instead of doing it.

═══ STEP 1 — write the mandatory artifact FIRST (status: planned) ═══
(see the contract above — docs/nightly/artifacts/lane-09-monetization-__TODAY__.md)

═══ STEP 2 — orient (fast, brief-first) ═══
Trust the brief. Only spot-check code with `rg`. Known surface (from audit):
- AdMob live: `lib/admob-config.ts`, `hooks/useAdMob.ts`, `hooks/useRewardedAd.ts`,
  `hooks/useInterstitialAd.ts`; 6 rewarded surfaces + interstitial on 6 results pages.
- H5 web ads gated OFF: `NEXT_PUBLIC_H5_ADS_ENABLED` + triple-gate in `useRewardedAd.ts`.
- Education free: `app/[locale]/education/*`, `app/[locale]/teacher/*` — NO pricing, NO
  lead capture, NO contact-sales anywhere.
- Analytics ready: `utils/growthTracking.ts` has `rewarded_ad_*`, `iap_viewed/purchased`.

═══ STEP 3 — pick AT MOST 1–2 actions tonight (≤__PER_LANE_CAP__ files) ═══
Prefer, in order:
1. **Education upsell lead-gen** (highest-leverage, lowest-risk): add an honest
   "For schools / bulk & district pricing — get in touch" CTA + a simple lead-capture
   form or mailto/contact path on an education/teacher page. 5 locales (`t('key')`, no
   hardcoded strings). Behind a flag if it changes a high-traffic layout. TDD.
2. **Ad-UX optimization** (flagged, retention-safe): a clearer/better-timed rewarded-ad
   CTA on a surface where `rewarded_ad_declined` is high; or wire `rewarded_ad_offered`
   where it's missing so tomorrow's brief has data. NO new interrupting interstitials.
3. **IAP/subscription EXPERIMENT scaffolding** (no real billing): an `iap_viewed`
   instrumented "remove ads / supporter" interest probe behind a flag to measure demand
   — pure analytics, no purchase path, no economy change.
4. **Revenue-data hygiene**: if the snapshot is stale/absent, note in the artifact that
   the founder should run `scripts/nightly/lib/pull-revenue-snapshot.sh` (interactive
   Playwriter) and/or provision `ADMOB_API_TOKEN` for unattended revenue.

TDD mandatory (RED→GREEN) for any code: test first, then implement. Keep diffs small.

═══ STEP 4 — update the artifact (status: shipped|partial|research-only|blocked) ═══
List files_touched + next_steps. If you shipped nothing, status: research-only with a
ranked monetization backlog is a fully valid outcome.

Self-check before finishing: did I avoid every banned item in the guardrail? Are all new
strings `t('key')` in 5 locales? Is any ad/layout change behind a flag?

DO NOT COMMIT. DO NOT PUSH. The orchestrator runs the gate + single end-of-run commit.

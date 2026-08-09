status: research-only
attempted: check rewarded_ad_offered/declined instrumentation coverage vs 6 rewarded surfaces; ship missing tracking call or education lead-gen CTA if time allows
files_touched: none

findings:
- Ad tracking already fully wired: trackRewardedAdOffered/Watched/Declined called
  from all 9+ rewarded-ad callsites (DoubleGoldAdButton, RewardedAdGoldButton,
  TimeLowAdPrompt, WatchAdForFreezeButton, WatchAdButton, BossRushResults,
  RetryAssistModal, ShareSection, useRewardedFeatureUnlock, MemoryHuntCluePanel)
  + centrally in useRewardedAd.ts (offered/watched/declined incl. daily_limit_reached,
  no_ad_provider, placeholder_cooldown). Brief's "0 rewarded_ad_watched/24h" is a
  low-baseline-traffic signal, not a missing-instrumentation bug. No action needed.
- Education upsell funnel is ALREADY fully wired end to end, contradicting the
  brief's "NO pricing, NO lead capture anywhere" assumption (stale) — verify against
  code before acting on that line again:
  - /education hub (PageClient.tsx): DistrictUpsellStrip + 2 direct for-schools links
  - esl-word-games, vocabulary-games-classroom, spelling-bee-practice,
    games-for-teachers: all render <DistrictUpsellStrip> (teacher + district CTA,
    tracked via education_upsell_impression / landing_cta_clicked)
  - classroom-game: bespoke localized (5-lang) "bring to your school" footer CTA
    linking to /education/for-schools
  - for-schools: full SchoolLeadForm lead-capture form already live
  - duels, access: correctly have NO upsell CTA — these are authed in-classroom
    tool pages (TeacherGate-gated, already-onboarded users), not landing pages
  Conclusion: no discoverability gap in the education funnel tonight. Don't re-audit
  this — it's genuinely complete.
- Real remaining ad-UX lever (useRewardedAd.ts:303-320): isPlaceholder/no_ad_provider/
  placeholder_cooldown branches gate reward grants. Correctly OUT OF SCOPE tonight —
  this file is reward-grant logic, inside the hard guardrail (never touch coin/ad-reward
  logic). Worth a future AUDIT-only lane (not autonomous fix): confirm every rewarded-ad
  callsite respects `canShowAd` to hide the button before offering an ad that will
  auto-decline as no_ad_provider on web (H5 ads still pending AdSense approval).
- Revenue brief was thin (search source stale, no fresh Playwriter/AdMob snapshot).

next_steps:
- Human queue: run scripts/nightly/lib/pull-revenue-snapshot.sh (interactive Playwriter)
  or provision ADMOB_API_TOKEN so future nightly briefs have real revenue signal
  instead of a single stale PostHog metric.
- Future lane 09/11: audit (read-only) whether rewarded-ad CTA buttons everywhere
  correctly gate on `canShowAd` before render, vs. showing then silently declining
  no_ad_provider on web — UX polish, not an economy change.
- If a future brief flags real ad-UX friction (high rewarded_ad_declined rate on a
  specific surface), that's the next concrete, safe target.

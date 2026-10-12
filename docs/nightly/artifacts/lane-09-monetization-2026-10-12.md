status: research-only
files_touched: none
findings:
  - /education/for-schools already has lead-capture (ForSchoolsPackages #lead form,
    hero + closing CTAs, NoAccountCta). No gap here — do not re-add, do not hand to Lane 08
    (this is lead-gen, in Lane 09 scope, already shipped by a prior night).
  - rewarded_ad_watched 0/24h signal (brief score 0.1, low confidence/low reach) traces to
    hooks/useAdMob.ts:92-100 — a KNOWN, already-commented gap: native rewarded_ad_offered
    fires with zero downstream prepare/watched/declined breadcrumbs when config isn't
    loaded yet at tap time. Fix requires touching the native show/prepare race (AdMob
    listener registration timing) — device-dependent, high blast radius for a blind
    unverified night edit on the reward-ad money path. Correctly left alone.
ranked_backlog_for_future_nights:
  1. [S, safe] Instrument the ALREADY-DOCUMENTED gap at useAdMob.ts:98 with an explicit
     posthog capture('rewarded_ad_config_not_ready', {surface}) at the `if (!config)`
     early-exit (line 103) — pure analytics add, no control-flow change, makes tomorrow's
     brief show WHY offered>watched diverges instead of a flat 0. TDD: assert capture
     fires on that branch with a mocked getConfig()=null.
  2. [M] education pages besides for-schools (spelling-bee-practice, esl-word-games,
     vocabulary-games-classroom) have no outbound CTA to for-schools pricing/lead form —
     a funnel leak (traffic lands, never sees the schools pitch). Needs a design pass
     (impeccable skill), not a blind 10-min edit — hand to Lane 05 or a dedicated night.
  3. [S] Revenue snapshot (docs/nightly/intel/revenue-latest.json) + ADMOB_API_TOKEN
     still absent per brief note — founder should run pull-revenue-snapshot.sh once so
     this lane gets real eCPM/fill signals instead of a single flat PostHog metric.
next_steps: pick item 1 first (smallest, safest, directly unblocks the stated 0.1-severity
  signal); item 2 needs design-skill involvement; item 3 is a founder action, not autonomous.

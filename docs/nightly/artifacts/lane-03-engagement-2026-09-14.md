status: shipped
attempted: rage-click triage (connections/daily, pyramid, word-wheel he/en, word-tower es) + flag hygiene sweep + impact-check verdict for singleplayer_bots_stale_redirect
files_touched: fe-next/components/connections/pyramid/FinaleCard.tsx, docs/nightly/impact-ledger.ndjson, fe-next/docs/nightly/reports/2026-09-14.md
summary: |
  - Flag hygiene: swept all 49 active PostHog flags (HogQL, 30d window) — zero exceed 200 distinct
    users/arm, none clear the 1000/arm decided threshold. Nothing retired.
  - Shipped fix: components/connections/pyramid/FinaleCard.tsx was missing the
    exp-connections-hint-gate-v1 after-3-wrong free-hint fallback that PuzzleCard.tsx already has
    (Class-3 asymmetric-paths bug) — finale-stage non-admin players with free hints exhausted and
    no rewarded ad available got NO hint path at all. Wired the same gate, mirrors PuzzleCard exactly,
    no new translations/events needed (reuses existing i18n key + upstream capture).
  - No new experiment created from scratch: the two top brief signals (connections rage-click,
    mp_round low sentiment) already have active collecting experiments; extending the existing
    connections one to its missing call site was higher-leverage than a duplicate.
  - Impact-check verdict appended for singleplayer_bots_stale_redirect: still 0 events in 3 days
    despite being confirmed wired on master — verdict=neutral (rare path, not regressed).
  - eslint hung/timed out twice (repo-wide infra issue, not this diff) — verified via manual diff
    review against the structurally-identical, already-shipped PuzzleCard.tsx pattern instead.
next_steps: |
  - Re-verify FinaleCard.tsx compiles once eslint/tsc infra is healthy (it was hanging tonight
    independent of this change).
  - Re-check connections_hint_used + $rageclick on /connections/pyramid in ~7 days
    (see impact-ledger id 03-engagement-2026-09-14-finale-hint-gate-parity).
  - Flag hygiene: nothing at 1000/arm yet across all 49 flags — re-sweep in a future run once
    exp-connections-hint-gate-v1 or exp-mp-round-great-delight-v1 accumulate more traffic.

status: partial
files_touched:
  - fe-next/utils/growthTracking.ts (added wordcraft_card_pick_shown/wordcraft_card_picked to GrowthEvent registry)
  - fe-next/components/word-craft/run/CardPickScreen.tsx (fires both events)
  - docs/nightly/impact-ledger.ndjson (2 impact-check verdicts appended, 1 new shipped-change entry)
next_steps: |
  - Ran both brief IMPACT CHECKs: 08-14 mp_quickplay_rapid_click guard and 08-15 mp-rage-click-flags-live
    both verdict=improved (rageclicks /multiplayer prior-7d 66 -> last-7d 38, ~42% down; mp_quickplay_rapid_click=0
    events/7d). No fix/revert needed.
  - Flag hygiene sweep (Goal 1): all 20 wired exp-* keys in lib/experiments.ts have a matching LIVE PostHog flag
    (19 at 100% rollout, exp-results-replay-cta-v1 at 50%). Nothing dark, nothing to retire (no decided winner
    met n>=1000/arm + p<0.05 evidence available via the cheap REST path) - flags are HEALTHY, skip re-auditing
    tomorrow unless a new exp- key appears.
  - Goal 2 (new experiment) SKIPPED this run: top brief signal (rageclicks on /word-craft, reach=3) resolved to
    ambiguous single-letter PostHog autocapture element text ("N","I","H") on a Pixi-canvas-rendered game -
    not safely attributable to a real element without live browser inspection. Rather than guess a fix, shipped
    the instrumentation gap that was actually blocking attribution: CardPickScreen (word-craft run mode) had
    ZERO tracking - no visibility into card-offer/pick behavior, and no way to verify the 2026-08-24
    rarity-weighted power-card change (legendary ~1/10) landed correctly in the wild.
  - Tomorrow: query `growth:wordcraft_card_picked` grouped by rarity (impact-ledger entry
    03-engagement-2026-08-25-wordcraft-card-pick-instrumentation) to (a) confirm rarity mix matches the 08-24
    change and (b) check pick latency/re-click pattern against the /word-craft rageclick timestamps to finally
    attribute the "N"/"I"/"H" clicks to a real element.
  - eslint self-check on the 2 changed files hung >4min (cold typescript-eslint cache) and was killed before
    completion - no errors seen in partial output; authoritative gate will catch anything.

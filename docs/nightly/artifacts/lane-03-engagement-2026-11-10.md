status: research-only
attempted: flag hygiene sweep (lib/experiments.ts), new exp targeting word-tower rage-click surface, instrument 2-3 gap events
files_touched: none (code) — docs only: docs/nightly/triage-queue.md, docs/nightly/reports/2026-11-10.md, docs/nightly/impact-ledger.ndjson
next_steps: |
  - Flag hygiene: already clean, nothing to remove.
  - Top 2 brief rage-click targets (en/word-tower, ru/word-tower/daily) DISPROVEN via direct PostHog
    query: both are a single distinct_id (uniq(distinct_id)=1) firing 24-30 $rageclick events in one
    session — not real multi-user friction. Logged as a detector flood-cap bug for lane 07
    (same class as the known game_completed single-session flood bug) in triage-queue.md.
  - `exp-connections-howtoplay-tap-v1` (uncommitted, from an earlier in-flight lane tonight) is still
    unwired (0 call sites); the described Word Bridge daily how-to-play button (CircleHelp icon,
    36px) could not be located under components/connections/* in the time available. Needs a
    human/next-lane grep pass to find the real button before this flag can go live.
  - No safe new experiment or instrumentation shipped this run — ran out of verified, real, in-scope
    targets after the brief's top signals turned out to be noise. Next lane should re-run Phase 0
    with a flood-capped rage-click query to get real candidates.

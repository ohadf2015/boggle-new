status: shipped
attempted: competitor/reddit research for admin-beta mode polish + education competitor scan
files_touched: docs/nightly/ideas/2026-10-18.md, docs/nightly/ideas/2026-10-18-reddit.md, docs/nightly/reports/2026-10-18.md (appended)
next_steps: |
  - reddit-fetch.sh `search` + `feed dailygames`/`feed Anagrams` returned jq-parse errors all night
    (only `feed wordgames` worked, intermittently) — not a lane fix, flag for whoever owns the
    OAuth token cache setup.
  - Zero Reddit reply candidates shipped — retry early in next run's window before other lanes
    hammer the same token cache.
  - Two mode-polish ideas surfaced (Wheel Rush spin-economy, Brain Check streak hook) — steered,
    not shipped; lane 05 picks per its own rotation.
  - Education AI-question-generator idea (Blooket/Khanmigo-style, attacks the teacher
    class-creation drop-off from the 10-16 root-cause memory) is L effort — human queue / lane 09,
    not a one-night slice.

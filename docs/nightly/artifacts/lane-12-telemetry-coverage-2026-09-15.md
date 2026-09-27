status: research-only
attempted: run coverage audit (DEAD/CRATERED + per-mode holes), verify prior host-filter impact check, fix top item
files_touched: docs/nightly/impact-ledger.ndjson (verdict line, deduped vs concurrent session), docs/nightly/reports/2026-09-15.md
next_steps: investigate singleplayer's 227/366 (62%) completion ratio — softest of the healthy modes, carried from 09-10. No code fix shipped tonight — quickstart_shuffle_clicked CRATERED and the completed>started per-mode ratios both traced to previously-documented non-bugs or traffic variance, not fresh regressions; forcing an edit would have been a blind guess against working code.

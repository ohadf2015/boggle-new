status: shipped
attempted: rewrite learnings.md from last 6 reports + write loop-improvements/2026-06-21.md meta-review
files_touched:
  - docs/nightly/learnings.md (rewritten, 110 lines, <=200 cap)
  - docs/nightly/loop-improvements/2026-06-21.md (new, 48 lines)
  - docs/nightly/reports/2026-06-21.md (appended Lane 7 block)
key_findings:
  - Window flipped from gate-wedge bottleneck to INFRA bottleneck — MCP/Supabase token expiry blocked lanes 01/02 5/6 nights
  - Lane 05 (mode polish) only reliable code shipper 3/6, 0 reverts; Lane 06 SEO 2/6 high-impact
  - 06-20 shared-usage cascade idle-killed 5 lanes (exit 124); 06-19 transient DNS aborted whole run
  - Gate clean-ship held (no next-build wedge recurred) — closed that watch
  - URGENT prod bug carried: word_wheel_catchup migration unapplied -> 500s
top_improvements:
  - preflight credential probe + auto-swap for stale Supabase token (unblocks 01/02)
  - stagger lane starts under shared usage window (prevents cascade)
  - retry transient preflight DNS before run abort
next_steps:
  - human/infra: durable Supabase + Sentry token refresh; apply word_wheel_catchup migration
  - future lane 07: create scripts/nightly/tools/mcp-token-probe.sh (queued, out of budget tonight)
  - lane 02: profile /he LCP 6.3s + /es CLS 0.288 above-fold asset
do_not_commit: true

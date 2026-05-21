# Perf Watch — Human Review Queue

Items flagged by the nightly performance lane that need human judgement or are outside the lane's fix scope.

---

## [BACKEND] WAL Parser — 3 consecutive INVESTIGATE flags

**Severity:** High  
**Source:** `db_perf_top_query_audit` (audits: 2026-05-06, 2026-05-11, 2026-05-18)  
**Metric:** Rank 1 all three weeks. pct_of_total: 58% → 89% → 78%.  
**Current state:** `supabase_realtime` publication has **0 tables** (auto-remediation cleaned all flagged tables). Yet the WAL parser still runs ~375K times/session at 4.23ms mean.  
**Root cause:** Supabase Realtime service maintains an internal WAL subscription even with an empty publication, to support broadcast and presence channels.  
**Not fixable from app code.** Options for human:
- Evaluate whether broadcast/presence channels are actually needed; if not, disabling the Realtime service extension would eliminate this query entirely.
- If Realtime is required, accept this as infrastructure overhead and suppress the INVESTIGATE alert for the WAL query specifically.
- File a Supabase support ticket: WAL parser overhead with empty publication should be zero or near-zero.

---

## [FRONTEND] Multiplayer LCP — 5806ms (POOR)

**Severity:** High  
**Routes:** `/en/multiplayer` (p75 5806ms, n=11), `/he/multiplayer` (p75 5346ms, n=6)  
**Threshold:** Good <2500ms, Poor >4000ms  
**Likely cause:** Game board / WebSocket handshake is the Largest Contentful Paint element. The game client (Pixi.js + GSAP + socket connection) must complete before any above-fold game UI appears.  
**Not a quick fix.** Options:
- Render a lightweight skeleton/lobby-waiting UI immediately (SSR), make it the LCP target. The heavy game client loads behind it.
- Profile with Chrome DevTools to confirm what the actual LCP element is and its render timeline.
- Consider `loading="eager"` + preconnect hint for the socket server domain.

**Note:** n=11 is low but consistent across two locales — likely a real signal, not noise.

---

## [FRONTEND] Daily CLS — 1.153 (POOR, low confidence)

**Severity:** Medium (low confidence)  
**Route:** `/he/daily` (p75 CLS 1.153, n=4)  
**Threshold:** Good <0.1, Poor >0.25  
**Caveat:** n=4, and all PostHog events in this window appear to come from the admin user. Admin users see extra overlays (admin toolbar, feedback widgets) that regular users don't. CLS may not reflect real-user experience.  
**Action:** Collect 7-day sample before treating as a real regression. If CLS stays >0.5 with n>20, investigate: banner ad insertion, font swap, or admin-specific element causing layout shift.

---

## [BACKEND] sync_coins — Monitor for improvement

**Fixed:** Migration `perf_sync_coins_eliminate_select_for_update` applied 2026-05-21.  
**Expected:** mean_ms should drop from 7.3ms to ~4-5ms (eliminates one SQL round-trip per call).  
**Verify:** Check next week's `db_perf_top_query_audit` to confirm improvement. If mean_ms unchanged, the bottleneck is elsewhere (lock contention? index miss?).

---

*Last updated: 2026-05-21 by Lane 02 (perf)*

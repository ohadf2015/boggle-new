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

## [FRONTEND] Multiplayer LCP — improving but still POOR

**Severity:** High  
**Routes:** `/en/multiplayer` (p75 LCP: 5807ms 2026-05-21 → **4228ms 2026-05-22**, n=29)  
**Threshold:** Good <2500ms, Poor >4000ms  
**Update 2026-05-22:** Improved 27% (5807→4228ms). CLS also dramatically improved (0.146→0.026). INP flat at ~252ms. `/he/multiplayer` dropped below n=5 threshold today — no fresh data.  
**Likely cause:** Game board / WebSocket handshake is the Largest Contentful Paint element. The game client (Pixi.js + GSAP + socket connection) must complete before any above-fold game UI appears.  
**Not a quick fix.** Options:
- Render a lightweight skeleton/lobby-waiting UI immediately (SSR), make it the LCP target. The heavy game client loads behind it.
- Profile with Chrome DevTools to confirm what the actual LCP element is and its render timeline.
- Consider `loading="eager"` + preconnect hint for the socket server domain.

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

## [FRONTEND] Hebrew home CLS — admin card skeleton mismatch

**Severity:** Medium (admin-only, no real-user impact)  
**Route:** `/he` (p75 CLS 0.118 → 1.119 regression, n=6)  
**Detected:** 2026-05-22  
**Root cause:** `LandingChallengeCards` adds 4 admin-only mode cards (`wordCraft`, `wordCraftGems`, `wordTower`, `blastClassic`) via `isAdmin` gate. `LandingCardsSkeleton` renders a fixed non-admin card count. When `hadSession=true` and auth resolves to admin, skeleton→admin-cards swap shifts layout significantly. All 6 sampled sessions are the founder's Hebrew locale sessions.  
**Fix:** Pass `isAdmin` prop to `LandingCardsSkeleton` so it renders the correct number of skeleton cards for admins. Low priority — zero real-user impact until admin card set is publicly launched.  
**File:** `fe-next/components/landing/LandingCardsSkeleton.tsx`, `LandingView.tsx:202` (passes `isAdmin` to Cards but not to Skeleton).

---

## [FRONTEND] English home LCP — 20956ms outlier

**Severity:** Low (low confidence)  
**Route:** `/en` (p75 LCP 20956ms, n=7)  
**Detected:** 2026-05-22  
**Caveat:** n=7 means p75 = 6th of 7 sessions. A single session with a 20s LCP (slow network, tab-backgrounded, or video preload) skews the p75 massively. INP=40ms and CLS=0.002 on the same route are excellent, inconsistent with a truly broken LCP.  
**Action:** Do not act until n>30 with p75 consistently >4000ms. Watch for 3 nights. If `/en` LCP remains >4000ms with higher n, profile specifically: check if `showcase-3d` video assets are being preloaded on the home route.

---

## [FRONTEND] Japanese home — triple-poor signal (low confidence)

**Severity:** Medium (low confidence — likely admin sessions)
**Route:** `/ja` (p75 LCP 8775ms, INP 264ms, CLS 0.572, n=4)
**Detected:** 2026-05-22 (new route, no prior baseline)
**Pattern:** CLS 0.572 vs `/en` CLS 0.0018 on the same page template = 316x difference. Strong indicator of admin-session skeleton mismatch (founder tests in JA locale, same issue as `/he`). LCP 8775ms and INP 264ms at n=4 are statistically dominated by 1 slow session.
**Image priority:** confirmed correct — `LandingHero.tsx:36` passes `priority={true}` to `IdleMascotWithEntrance`.
**Action:** Do not act until n>15. If CLS stays >0.3 with confirmed non-admin sessions, apply same fix as `/he` skeleton: pass `isAdmin` to `LandingCardsSkeleton` so it renders the correct admin card count.

---

## [FRONTEND] Hebrew Word Tower — CLS at loading→game transition

**Severity:** Medium (low confidence — likely admin/founder sessions)
**Route:** `/he/word-tower` (p75 CLS 1.050, p75 LCP 2062ms, n=6)
**Detected:** 2026-05-22 (new route signal)
**Root cause:** `WordTowerGame.tsx:80-86` loading state renders `min-h-[100dvh]` flex-centered spinner. Real game renders `WordTowerPlay` (HUD at top + game board below) — height contract breaks on mount, causing CLS > 1.
**Fix direction:** Loading state should mirror game structure: HUD-height placeholder at top + flex-fill content area below, instead of a single centered div. See `WordTowerHud.tsx:146` for HUD height constraints.
**Action:** Do not act until n>15 with confirmed non-admin sessions. If CLS confirmed, implement loading skeleton matching HUD+board structure. Risk: LOW, but test Hebrew RTL carefully.

---

*Last updated: 2026-05-22 by Lane 02 (perf)*

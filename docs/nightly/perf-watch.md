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
**Routes:** `/en/multiplayer` (p75 LCP: 5807ms 2026-05-21 → **4228ms 2026-05-22** n=29 → **1192ms 2026-05-24** n=8)  
**Threshold:** Good <2500ms, Poor >4000ms  
**Update 2026-05-24:** Today's reading = 1192ms (n=8) vs 4228ms (n=29). **Do not conclude improvement** — n=8 vs n=29 is not comparable (different user mix, time of day). Prior n=29 reading (4228ms) remains authoritative. Watch for n>20 reading with consistent LCP <2500ms before closing.  
**Update 2026-05-22:** Improved 27% (5807→4228ms). CLS dramatically improved (0.146→0.026). INP flat at ~252ms.  
**Likely cause:** Game board / WebSocket handshake is the Largest Contentful Paint element. The game client (Pixi.js + GSAP + socket connection) must complete before any above-fold game UI appears.  
**Not a quick fix.** Options:
- Render a lightweight skeleton/lobby-waiting UI immediately (SSR), make it the LCP target. The heavy game client loads behind it.
- Profile with Chrome DevTools to confirm what the actual LCP element is and its render timeline.
- Consider `loading="eager"` + preconnect hint for the socket server domain.

---

## [FRONTEND] Daily CLS — admin sessions confirmed, not real-user issue

**Severity:** Low (admin-only signal, real users show CLS 0.002-0.007)  
**Route:** `/he/daily` (PostHog p75 CLS 0.882, n=6 — 2026-05-24)  
**Updated:** 2026-05-24 — player-id audit via `web_vitals` Supabase table confirmed:  
- `player 537a9da1` (mobile, real user): CLS 0.0024, 0.0027 — **Good**  
- `player d0da136a` (mobile, real user): CLS 0.0069 — **Good**  
- `player 4d68a876` (mobile, admin/founder): CLS 0.220, 0.288 — **Needs improvement**  
PostHog p75=0.882 is skewed by admin sessions (same player as /he CLS issue). Real users have zero CLS problems on the daily page.  
**Action:** Close this item. Resume if real-user CLS appears with n>15 non-admin sessions.

---

## [BACKEND] sync_coins — Monitor for improvement

**Fixed:** Migration `perf_sync_coins_eliminate_select_for_update` applied 2026-05-21.  
**Expected:** mean_ms should drop from 7.3ms to ~4-5ms (eliminates one SQL round-trip per call).  
**Verify:** Check next week's `db_perf_top_query_audit` to confirm improvement. If mean_ms unchanged, the bottleneck is elsewhere (lock contention? index miss?).

---

## ✅ [FRONTEND] Hebrew home CLS — admin card skeleton mismatch — FIXED 2026-05-24

**Severity:** Medium (admin-only, no real-user impact)  
**Route:** `/he`  
**Detected:** 2026-05-22. **Fixed:** 2026-05-24 by Lane 02.  
**Root cause:** `LandingChallengeCards` adds 4 admin-only mode cards via `isAdmin` gate. `LandingCardsSkeleton` rendered a fixed 4-card layout. Skeleton→real swap for admin = +4 card height jump = CLS.  
**Fix applied:** Added `isAdmin?: boolean` prop to `LandingCardsSkeleton`. When `isAdmin=true`, renders 4 extra `ModeCardSkeleton` components matching the admin card count. `LandingView.tsx:231` now passes `isAdmin={isAdmin}`.  
**Files changed:** `fe-next/components/landing/LandingCardsSkeleton.tsx`, `fe-next/components/landing/LandingView.tsx`.

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

---

## [FRONTEND] /he/word-tower — CLS improvement logged, now re-elevated

**Route:** `/he/word-tower`  
**Update 2026-05-27:** 72h PostHog shows CLS 0.797 (n=11) — up from 0.280 on 2026-05-24. Regression flag raised, but data is **inconclusive**:
- All `WordTowerPlay` children are `position: absolute` (verified `WordTowerPlay.tsx:313`, `477`). The crane (`abs inset-x-0 top-[10%]`), HUD (`abs inset-0`), overlays, rival rail — none are in document flow. Document-flow layout shifts are **ruled out**.
- The 72h window (2026-05-24 to 2026-05-27) includes 2 days **before** the crane chrome commit (`58a80eebf` 2026-05-26). Attribution to crane commit is not supported by available data.
- Possible pre-existing source: Pixi canvas (`WordTowerScene`) mounting at top of DOM with undefined height. This was the original suspected root cause (2026-05-22 entry).
**Action:** Wait for 24h PostHog data with n>5 post-crane-commit (earliest: 2026-05-28). If CLS stays >0.5 with confirmed post-commit sessions, audit `WordTowerScene` canvas dimensions and mounting sequence.  
**Prior entry:** Loading state `min-h-[100dvh]` spinner vs HUD+board structure was the suspected root cause (2026-05-22). May have been resolved by word-tower structural changes in recent commits.

---

## [FRONTEND] /es/multiplayer + /en/multiplayer — LCP POOR, INP POOR (escalated)

**Severity:** High  
**Routes:**
- `/es/multiplayer`: p75 LCP 4648ms, INP 712ms (72h n=10) — **new in baseline 2026-05-27**
- `/en/multiplayer`: p75 LCP 3165ms, INP 292ms (72h n=40) — high-confidence, improving from 4228ms

**Root cause hypothesis:** Game-client hydration (Pixi.js + Socket.IO + game state) blocks above-fold render. The multiplayer page likely requires game-client mount before showing any interactive UI. `/es/` is not measurably worse than `/en/` (overlapping confidence intervals at n=8 vs n=40). Both share the same root cause.  
**INP 712ms** is the most alarming — heavy main-thread work (game board initialization, socket event processing) is blocking input response.  
**Fix direction (human):**
1. Render a lightweight SSR lobby skeleton as the LCP target. Heavy Pixi/socket client loads behind it. Lobby content (room code, player count) is the real user-facing payload, not the game canvas.
2. Profile with Chrome DevTools Performance tab: identify what occupies the main thread during those 3-6 seconds. Long tasks >50ms are the INP source.
3. Check if Socket.IO connection attempt is synchronous on mount — move to `useEffect` if not already.

*Added: 2026-05-27 by Lane 02 (perf)*

---

## ✅ [FRONTEND] /en/about LCP — opacity:0 animation FIXED 2026-05-27

**Severity:** High → FIXED  
**Route:** `/en/about` — p75 LCP 10218ms (72h n=6)  
**Root cause:** `LegalPageLayout.tsx:50-54` wrapped the `<h1>` title in `<m.div initial={{ opacity: 0, y: -20 }}>`. Browser LCP measurement requires the element to be visible (opacity > 0). The Framer Motion animation delayed the element becoming visible, inflating LCP by the animation duration on every legal/about page.  
**Affects:** `/about`, `/legal/terms`, `/legal/privacy`, `/legal/cookies`, `/legal/disclaimer`, `/contact` — all pages using `LegalPageLayout`.  
**Fix applied:** Changed `initial={{ opacity: 0, y: -20 }}` → `initial={{ y: -20 }}` (title starts visible, slides in from y:-20 only). Also simplified `animate` to `{{ y: 0 }}` (removed no-op `opacity: 1`). File: `fe-next/components/legal/LegalPageLayout.tsx:50`.  
**Expected:** LCP reduction on all legal pages next night. The 10218ms reading likely includes slow-network sessions; even those should improve by 300-600ms (animation delay removed).

---

*Last updated: 2026-05-27 by Lane 02 (perf)*

---

## [FRONTEND] Multiplayer LCP — SEVERE REGRESSION 2026-06-01

**Severity:** Critical  
**Route:** `/en/multiplayer`  
**Metric:** p75 LCP: **3165ms (2026-05-27, n=40) → 8448ms (2026-06-01, n=48)** — +167%  
**Also:** p75 INP 584ms (new high), CLS 0.056 → 0.510  
**Cause:** Game-client hydration (Pixi.js + GSAP + Socket.IO). No skeleton SSR. LCP element is behind full game-client load.  
**Fix needed (medium effort):**
- Server-render a lightweight lobby/waiting skeleton — make it the LCP target.
- The game canvas + socket connection loads behind it.
- Same pattern applies to `/he/multiplayer`, `/he/daily`, `/en/word-tower`.

---

## [FRONTEND] Leaderboard LCP — Server-Side Data Prefetch Needed

**Severity:** High  
**Route:** `/en/leaderboard`  
**Metric:** p75 LCP 7132ms (Phase 0 brief, historical)  
**Cause:** `LeaderboardPageClient` is fully client-rendered. Server component delegates all rendering to a `'use client'` component. Public leaderboard data is the same for all users — could be prefetched in the server component at ISR time (revalidate=300) and passed as `initialData`.  
**Fix needed (medium effort):**
- In `page.tsx`: add `getData()` calling `word_hunt_alltime_leaderboard` view (already fast: 0.671ms)
- Pass result as `initialLeaderboard` prop to `PageClient`
- In `useLeaderboard`: accept `initialData` option from React Query
- Only the user's own rank card still needs client-side auth fetch

---

## [FRONTEND] `/he/daily/word-wheel` LCP Regression — Watch

**Severity:** Low (low confidence)  
**Route:** `/he/daily/word-wheel`  
**Metric:** p75 LCP 1399ms (2026-05-27, n=11) → 2568ms (2026-06-01, n=10)  
**Note:** +83% but low n. May be different user mix. Watch for 3 nights before acting.

# Slice D: MP Stress Reduction — Audit + Design

**Date:** 2026-05-03
**Author:** Ohad + Claude
**Parent:** [`2026-05-03-onboarding-practice-mp-design.md`](./2026-05-03-onboarding-practice-mp-design.md) (slice D)
**Status:** Audit complete + design proposal. Implementation gated on user approval.

---

## TL;DR

5 mid-round interruption surfaces audited in MP. Most are already gated to lobby/results, but 2 leak mid-round and 1 borderline. Plus: zero protection for new MP players (no bot-pad, no hidden MMR, no loss shield). Proposed fix = 3 small policy changes + 2 new flags. Net: ~3-4 days work, no new content, ships value to existing players this week.

## Implementation Status (2026-05-03 session)

**SHIPPED end-to-end:**
- ✅ Fix 1: defer mid-round join/leave (`b9be8d964`)
- ✅ Fix 2: defer mid-round achievement unlocks incl. cinematic-tier (`c6b24f843`)
- ✅ PostRoundSummary consumer + ResultsPage mount + 5 i18n locales (`8de5bad73`)
- 31/31 tests across `useMidRoundEventQueue`, `usePlayerJoinLeaveNotifications`, `useAchievementSocketBridge`, `PostRoundSummary`

**Dead code — no work needed:**
- ⊘ Fix 3 (`RankUpCinematic` gate): component defined, zero non-test consumers — no production leak risk to gate.
- ⊘ Fix 5 (hide MMR via `NearRankTeaser`): `nearRankData` prop only set in test fixtures — never wired in production. No leak to suppress.

**Deferred:**
- ⏸ Fix 4 (bot-pad first 3 MP matches): touches matchmaker (`backend/handlers/matchmakingHandler.ts` + `backend/services/matchmakingQueue.ts`). Can reuse existing `player_ratings.games_played` (no DB migration needed). Estimated ~half day. Separate session.

---

## Audit: Mid-Round Interruption Surfaces

`★ Insight ─────────────────────────────────────`
LexiClash already does *some* stress prevention — `SignupPromptHost` excludes MP routes (`components/auth/SignupPromptHost.tsx:38`), `usePlayerJoinLeaveNotifications` uses single-id 1-deep queue, `AchievementInlineToast` is "narrow capsule" with explicit "non-distract MP" comment (`AchievementQueue.tsx:165`). The 04-27 onboarding audit fixed FTUE pop-up density. **This isn't "MP is broken"; it's "the last 20% of gates are still leaky."**
`─────────────────────────────────────────────────`

### Surface inventory

| # | Surface | File | Trigger | Mid-round gate? | Verdict |
|---|---|---|---|---|---|
| 1 | Player join/leave toast | `hooks/usePlayerJoinLeaveNotifications.ts` | Diff in `players[]` | `enabled: isActive` (`PageClient.tsx:162`) — fires DURING active round | **LEAK — fix** |
| 2 | Elimination + last-life toast | `hooks/useMultiplayerEventNotifications.ts` | Zustand `wordHuntEliminatedPlayers` / `wordHuntPlayerLives` change | `enabled: isActive` — fires mid-round | **KEEP — game-state critical** (but consider in-HUD redesign later) |
| 3 | Socket error toasts (kicked, room-closed, host-changed) | `hooks/useMultiplayerSocket.ts:383,401,439,448,459,480` | Server events | Always | **KEEP — critical** |
| 4 | Achievement inline toast | `components/achievements/AchievementQueue.tsx` (consumed via `useAchievementSocketBridge.ts`) | Server `achievement:unlocked` socket event | None — fires anytime including mid-round | **LEAK — defer to post-round queue** |
| 5 | Rank-up cinematic | `components/multiplayer/RankUpCinematic.tsx` | Rank change (need to verify trigger) | Unknown — needs check | **LIKELY LEAK — verify + defer if mid-round** |
| 6 | `SignupPromptHost` | `components/auth/SignupPromptHost.tsx` | First-win or N games | Pathname check excludes `/multiplayer` ✓ | **OK** |
| 7 | `useMultiplayerSignupNudge` | `hooks/useMultiplayerSignupNudge.ts` | Mounted in `ResultsPage.tsx:441` | Post-game only ✓ | **OK** |
| 8 | Tournament Standings modal | `components/multiplayer/MultiplayerInGameView.tsx:428` | User-tap (Dialog) | User-initiated | **OK** |
| 9 | `RoomListView` refresh toast | `components/multiplayer/RoomListView.tsx:178` | User refresh in lobby | Lobby only | **OK** |
| 10 | Friend-strip "Link copied" | `components/multiplayer/CrazyGamesFriendsStrip.tsx:47` | User copy action | Lobby + user-initiated | **OK** |

### What's missing entirely

| # | Protection | Status | Impact |
|---|---|---|---|
| 11 | Bot-pad first 3 MP matches for new players | **MISSING** | New players face elo-matched real opponents day 1 → loss spiral |
| 12 | Hidden MMR for first ~5 matches | **MISSING** | Visible "you lost rank" mid-onboarding |
| 13 | No-loss-streak shield (first week) | **MISSING** | Royal Match-style protection absent |
| 14 | "What you missed" post-round summary tray | **MISSING** | Once we defer #1+#4, queued items need a destination |

---

## Design Proposal

### Fix 1: Player join/leave toast — defer mid-round

**Change:** `usePlayerJoinLeaveNotifications` keeps `enabled: isActive` for *lobby* (where joins matter for ready-state), but during `isActive` (active round), instead of firing toast immediately, **append to a `MidRoundEventQueue`** that drains into the post-round summary card.

**Rationale:** During an active round the player can't act on a join (no rebalance happens). Knowing later doesn't lose information; knowing now adds cognitive load to a competitive task.

**Implementation:**
- New `hooks/useMidRoundEventQueue.ts` — append-only Zustand slice scoped to game session
- `usePlayerJoinLeaveNotifications` — when `isActive=true`, push event to queue instead of `neoInfoToast(...)`
- New `components/results/PostRoundEventSummary.tsx` — small chip strip in results: "↳ 2 joined, 1 left during your round" (dismissable)
- Drain queue on round end (`isActive: true → false` transition)

### Fix 2: Achievement inline toast — defer mid-round

**Change:** `useAchievementSocketBridge` checks `isInGame` (already in store, set by `PageClient.tsx:154`). When `isInGame=true`, push to `MidRoundEventQueue` instead of `queueAchievement`. Drain to **a single post-round "X achievements unlocked!" card** that taps to expand to per-achievement modal.

**Rationale:** Achievement unlock dopamine is real and we want to keep it — but mid-competitive-round it's a distraction. Bundling them at round end is *more* dopamine, not less (1 card showing "🏆 ×3" hits harder than 3 capsules across 90 seconds).

**Implementation:**
- `useAchievementSocketBridge.ts` — branch on `useGameStore(s => s.isInGame)`. Mid-game → enqueue. Else → `queueAchievement` as today.
- `PostRoundAchievementBundle.tsx` — new card on results page; sums queue, shows tier-highest icon + count, tap-expand cycles per-achievement modal.
- Critical: keep cinematic-tier (GOLD/PLATINUM) achievements firing immediately even mid-round? **Recommend NO** — GOLD/PLATINUM cinematic is 7 seconds; that's the most disruptive mid-round popup possible. Bundle these too.

### Fix 3: Verify + gate `RankUpCinematic`

**Change:** Audit `RankUpCinematic` mount. If it can fire mid-round, gate behind `isInGame=false` and queue otherwise.

**Implementation:** Read `components/multiplayer/RankUpCinematic.tsx` consumers (likely `ResultsPage` already, but verify). Add `isInGame` guard at render site if not present. Cinematic post-round is correct UX.

### Fix 4: Bot-pad first 3 MP matches

**Change:** New `first_mp_matches` counter (server-side, mirrored localStorage for guests). When `< 3`, matchmaker biases lobby fill to bots over real players. Lobby capacity fills with bots if no real players within ±50ms matchmaker window.

**Implementation:**
- Backend: Supabase column `users.first_mp_matches int default 0` + RLS
- Backend: `backend/handlers/joinRoomHandler.ts` (or matchmaker module) — if `first_mp_matches < 3`, set `lobbyFillPolicy: 'bot-priority'`
- Counter increment on round-end success event
- Guest fallback: localStorage `lc_first_mp_matches`

### Fix 5: Hide MMR for first ~5 matches

**Change:** Same `first_mp_matches < 5` flag → suppress rank delta UI in results, `RankUpCinematic`, and lobby chrome. Player still earns/loses MMR server-side; just hidden from UI until they have a baseline.

**Implementation:**
- `components/multiplayer/EloRankBadge.tsx` — accept optional `hidden` prop; render placeholder ("New player")
- `ResultsPage.tsx` — pass `hidden={firstMpMatches < 5}` to all rank UI
- Suppress `RankUpCinematic` mount entirely while gated

### Out of scope (this slice)

- **No-loss-streak shield (first week)** — defer to follow-up. Requires server-side MMR floor logic + 7-day windowing. Fixes 1-3 ship value first.
- **Elimination toast → in-HUD redesign** — game-state critical, OK for now. Worth revisiting in Wheel Rush MP polish pass.
- **Round-end summary visual design** — covered when `PostRoundEventSummary.tsx` lands; depends on existing results-card layout.

---

## Effort + Risk

| Fix | LoC est. | New tests | Risk |
|---|---|---|---|
| 1: join/leave defer | ~80 + queue slice | 3 | Low (additive, behind queue) |
| 2: achievement defer | ~60 | 4 | Medium — touches dopamine pacing; A/B-flag recommended |
| 3: RankUp verify+gate | ~20 | 1 | Low |
| 4: bot-pad | ~120 (server+client+migration) | 5 | Medium — touches matchmaker; isolated by flag |
| 5: hide MMR | ~40 | 3 | Low |
| **Total** | **~320 LoC** | **16** | **Medium overall** |

**~3-4 days of focused work**. All gated by simple flag (`first_mp_matches`) so easy to roll back per-fix.

---

## Telemetry

New events for measuring effect:

- `mp_event_deferred` — props: `event_type` (join/leave/achievement), `is_in_game: true`
- `mp_post_round_summary_viewed` — props: `queued_count`
- `mp_post_round_summary_dismissed` — props: `tap_through: bool`
- `mp_first_match_botpadded` — props: `first_mp_matches`, `bot_fill_count`
- `mp_mmr_hidden` — props: `first_mp_matches`

Funnel: pre/post comparing **MP round-2 retention** (does fewer mid-round popups → more next-rounds?) and **MP day-2 retention for new players** (does bot-pad → more day-2 returns?).

---

## Validation Plan

1. Manual: play 3 MP rounds with another browser tab joining mid-round → confirm no toast, summary card present at results
2. Manual: trigger achievement mid-round (use dev `__lcDebug.fireAchievement`) → confirm bundled in summary
3. Manual: new account → 3 MP matches → confirm lobbies bot-padded + no MMR badge visible
4. PostHog dashboard: 7-day cohort comparison after rollout

---

## Open Questions (for user)

1. **Defer list scope** — also defer "host changed" toast (`useMultiplayerSocket.ts:480`) mid-round, or keep (player should know)? **Recommend keep — host change affects whether room continues.**
2. **Achievement bundle: cinematic-tier exception?** Recommend bundle even GOLD/PLATINUM mid-round since cinematic is 7s. Confirm?
3. **Bot-pad threshold = 3 matches.** Adjust? (Royal Match uses 5; Apex hides for 10.) Recommend 3 to start, instrument, tune.
4. **Hidden MMR threshold = 5 matches.** Same — instrument first.

---

## File Index for Implementation

**New:**
- `hooks/useMidRoundEventQueue.ts` — Zustand slice
- `components/results/PostRoundEventSummary.tsx` — chip card
- `components/results/PostRoundAchievementBundle.tsx` — bundled achievement card
- `backend/handlers/incrementFirstMpMatchesHandler.ts` (or extend existing round-end handler)
- DB migration: add `users.first_mp_matches` column

**Modified:**
- `hooks/usePlayerJoinLeaveNotifications.ts` — branch on `isInGame`
- `hooks/useAchievementSocketBridge.ts` — branch on `isInGame`
- `components/multiplayer/RankUpCinematic.tsx` — gate render
- `components/multiplayer/EloRankBadge.tsx` — `hidden` prop
- `components/views/ResultsPage.tsx` — mount summary cards, pass MMR-hidden
- `backend/handlers/joinRoomHandler.ts` (or matchmaker module) — bot-pad bias
- `app/[locale]/multiplayer/PageClient.tsx` — pass `firstMpMatches` to children
- `translations/*.json` — 5 locales for summary card + new copy

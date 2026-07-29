# Multiplayer Comprehensive Audit — 2026-04-27

**Scope:** MP functionality, UX, gameplay loop, CrazyGames platform integration. Loose ends + bugs.
**Method:** 4-lens parallel review (CG platform / server loop / UX surfaces / regression risk from recent commits).
**Baseline:** Prior MP audit `multiplayer-comprehensive-audit-2026-04-02.md` (~111 findings). New findings diffed against it.

---

## Status update — 2026-04-29 spot check

This doc snapshots state at 2026-04-27. Several items have shipped since but the doc was never refreshed. Verified-shipped during MP perf session (2026-04-29):

- ✅ **CG-CRIT-4** (sec): `app/api/auth/verify-crazygames/route.ts:31-38` — `DEFAULT_AUDIENCE = 'lexiclash'` set; production warning when env unset. Audience check no longer skippable.
- ✅ **SRV-CRIT-1**: `backend/services/gameLifecycle/gameResults.ts:67-75` — `scoreMultiplier` now server-applied with timestamp-based fail-closed validation. Memory `boost-picker-shipped.md` v2 work landed.
- ✅ **UX-CRIT-1**: `host/components/pre-game/PlayerRoster.tsx` — kick uses `setPendingKick({...})` modal pattern; no native `confirm()` remains.

**Recommendation:** Re-run a comprehensive audit pass to refresh status across all 67 findings. The doc as-written is unreliable for current backlog planning. See `multiplayer-perf-2026-04-29.md` for the perf-scoped audit run that closed those items in real time.

---

## TL;DR

**3 ship-blockers for CrazyGames submission/relaunch:**

1. **MP rooms never call `gameplayStart()` / `gameplayStop()`** — `useCrazyGamesLifecycle` only wired to single-player surfaces. CG QA bot can't detect MP gameplay → "First gameplay start: No (automatic)" warning persists. (`hooks/useCrazyGamesLifecycle.ts`, not used in `PlayerInGameView`/`HostInGameView`)
2. **Tournament rounds skip `gameplayStart()` after round 1** — `hasStartedRef` never reset on round transition (refs survive renders by design). (`hooks/useCrazyGamesLifecycle.ts:223`)
3. **AuthModal still mountable on CG builds** — `hideLogin = isCrazyGames` only hides portal trigger, not modal itself. Programmatic `showAuthModal=true` renders sign-in over CG, reproducing prior rejection cause. (`components/auth/AuthButton.tsx:247,299`)

**1 sec/auth bypass:**

- `CRAZYGAMES_GAME_DOMAIN` env var has no fallback. When unset, `EXPECTED_AUDIENCE=undefined`, JWT verifiers commonly skip audience check → any valid CG token from any game accepted. (`app/api/auth/verify-crazygames/route.ts:28`)

**1 confirmed-still-open trust issue:**

- Boost `scoreMultiplier` is client-display only; `applyBoostsToScores()` deliberately defers server-apply pending v2. Tampered token → fake post-game XP. (`backend/services/gameLifecycle/gameResults.ts:59-63`)

---

## Severity Breakdown

| Severity | CG | Server | UX | Regression | Total |
|----------|----|--------|----|------------|-------|
| CRIT | 3 | 4 | 5 | 0 | **12** |
| HIGH | 3 | 4 | 8 | 1 | **16** |
| MED | 5 | 5 | 9 | 0 | **19** |
| MED-LOW | 3 | 3 | 0 | 0 | **6** |
| LOW | 5 | 4 | 5 | 0 | **14** |
| **Total** | **19** | **20** | **27** | **1** | **67** |

Diff vs 2026-04-02 baseline: ~12 still-open, ~5 newly fixed (timer, lobby broadcasts, presence, O(1) lookup), **~50 new findings** from boost/season/leaderboard work + previously-unsurveyed party/room handlers.

---

## CRITICAL — Ship-Blockers / Trust / Race

### CG-CRIT-1: MP doesn't fire CG SDK lifecycle (BLOCKER)
- `hooks/useCrazyGamesLifecycle.ts` only mounted in single-player paths (`components/daily/DailyChallengeGame.tsx:176`, `player/PlayerView.tsx:202`).
- `PlayerInGameView` and `HostInGameView` never invoke it → MP rooms emit zero `gameplayStart()`/`gameplayStop()`.
- **Why it matters:** CG QA portal already flagged "First gameplay start: No (automatic)" on submission `a68accd9` (2026-04-26). Without MP coverage the warning will repeat and may escalate to rejection.
- **Fix sketch:** Mount `useCrazyGamesLifecycle({ isGameActive, score, combo })` at MP gameplay roots, with explicit reset on round transition.

### CG-CRIT-2: Tournament rounds skip gameplayStart after round 1
- `hooks/useCrazyGamesLifecycle.ts:223-234`: `if (isGameActive && !hasStartedRef.current)` — `hasStartedRef` set true at first start, never reset.
- **Why it matters:** Multi-round MP (Word Hunt series, tournaments) reports as one session. Engagement metrics under-counted, QA bot detects only first round.
- **Fix sketch:** Reset `hasStartedRef` and `hasEndedRef` on round-start signal. Wire round-transition callback into the hook.

### CG-CRIT-3: AuthModal still rendered on CG
- `components/auth/AuthButton.tsx:247` returns null for portal trigger when `isCrazyGames`, but `AuthModal` (line 299-301) only checks `!hideLogin` for portal — modal itself can mount via state.
- **Why it matters:** Prior CG rejection (2026-04-22) was "remove all external login/sign-up options". Any code path that flips `showAuthModal=true` (deep link, profile route, error recovery) reproduces the rejection vector.
- **Fix sketch:** Wrap modal in `if (!isCrazyGames)` AND short-circuit `setShowAuthModal` calls inside CG context.

### CG-CRIT-4 (sec): Audience bypass on CG token verify
- `app/api/auth/verify-crazygames/route.ts:28`: `const EXPECTED_AUDIENCE = process.env.CRAZYGAMES_GAME_DOMAIN;` — undefined when unset.
- **Why it matters:** Most JWT libraries (`jose`, `jsonwebtoken`) skip audience check when `audience` parameter is `undefined`. Any signed CG token (from any game on the platform) would validate.
- **Fix sketch:** Throw at module load if env unset, OR set strict default `'lexiclash.com'` and log if override missing.

### SRV-CRIT-1: scoreMultiplier client-trusted (CONFIRMED-STILL-OPEN)
- `backend/services/gameLifecycle/gameResults.ts:59-63` — comment defers server-apply pending v2. Only `firstWordBonus` is server-applied.
- **Why it matters:** Memory note `boost-picker-shipped.md` lists this as v2 work; not yet done. Client can lie about multiplier → inflated XP/coins on persisted leaderboard.
- **Fix sketch:** Server tracks word-by-word timestamps relative to boost-applied window (already proposed: WordDetail.ts plumbing).

### SRV-CRIT-2: Ranked mode trusts client `isRanked` flag
- `backend/handlers/gameLifecycleHandler.ts:128,165` — accepts `isRanked` from client without checking ranked permission/MMR eligibility.
- **Why it matters:** Glicko-2 ELO update proceeds for unauthorized callers → leaderboard pollution. (`rankedMmr.ts` math is fine; gate is missing.)
- **Fix sketch:** Lookup user profile at room creation; reject if rank tier locked.

### SRV-CRIT-3: WordHunt target-found race (NEW)
- `backend/handlers/wordHuntHandler.ts:142-157` — broadcast fires before `endGame`, with ~3s grace window. Concurrent submissions in window can still reach `submitTargetWord`.
- **Why it matters:** Late-arriving sockets process word against already-found target.
- **Fix sketch:** Lock submission acceptance atomically with `targetFoundBy` write.

### SRV-CRIT-4: Solo→MP grid sequence exploit
- `backend/handlers/gameStartHandler.ts:331-338` — server-regenerates grid for 2+ players AT START. Host with 1 player can submit favorable client grid via `startGame`, then `addBot` after to upgrade to 2P.
- **Why it matters:** Host-grid-cheat. Low frequency but logical hole.
- **Fix sketch:** Re-generate on bot-add too, or block bot-add during gameplay phase.

### UX-CRIT-1: Native `confirm()` not localized
- `host/components/pre-game/PlayerRoster.tsx:110` — uses browser `confirm()` for kick. OK/Cancel always English; no theming, focus risk.
- **Why it matters:** Violates project translation-first rule. 5 locales affected.
- **Fix sketch:** Replace with `<ConfirmDialog>` using project tokens.

### UX-CRIT-2: Chat rate-limit silent fail
- `components/RoomChat.tsx:224-238` — server caps 50/10s; client shows zero feedback when limit hit. Messages drop silently.
- **Why it matters:** Player perceives chat broken. UX rule: "show feedback for actions that fail silently" violated.
- **Fix sketch:** Surface a toast or inline banner on `chatRateLimited` ack.

### UX-CRIT-3: BoostPicker fails on <375px
- `components/boosts/BoostPicker.tsx:43` — `max-w-md` (448px) clamps modal; on iPhone SE the cards crowd, close target <44px.
- **Why it matters:** Pre-game flow blocked for ~25% of mobile traffic.
- **Fix sketch:** Switch to `max-w-[calc(100vw-1rem)]`, audit min touch sizes.

### UX-CRIT-4: 5-second blank during reconnect
- `components/ConnectionStatusIndicator.tsx:85-90` — `BANNER_DELAY_MS=5000`. During quick cellular handoff the dot is hidden, no UI signal.
- **Why it matters:** Looks frozen; user assumes broken.
- **Fix sketch:** Show subtle "syncing…" dot from t=500ms; promote to banner at 5s.

### UX-CRIT-5: BoostButton double-mount on rotate
- `host/components/HostPreGameView.tsx:250-260,366-396` — mobile and desktop layouts each render `<BoostButton>`. Modal can mount twice when viewport class flips mid-pick.
- **Why it matters:** Focus trap breaks; two dialog layers stack.
- **Fix sketch:** Single button rendered once, with responsive layout instead of dual trees.

---

## HIGH — User Impact / Auth / Untested Handlers

### CG-HIGH
- **CG-H1** Invite-link URL not asserted to contain room code (`hooks/useCrazyGamesInvite.ts:138-143`).
- **CG-H2** `useRewardedAd` correctly refuses on placeholder, but boost-claim paths may not check `canShowAd` everywhere — audit needed (`hooks/useRewardedAd.ts:197-200`).
- **CG-H3** MP page uses `cgUser` without anonymous fallback (`app/[locale]/multiplayer/PageClient.tsx:106`).

### SRV-HIGH
- **SRV-H1** `partyHandler.ts` (Caption-/Pixel-/Shadow-Clash) — **no test file**. `inputSchema.passthrough()` allows arbitrary payloads. Shadow-Clash secret-role assignment unverified server-side.
- **SRV-H2** `roomManagementHandler.ts` — **no test file**. `broadcastShufflingGrid` passes `data` through unvalidated.
- **SRV-H3** Reconnect doesn't refresh stale auth (`backend/handlers/playerReconnectHandler.ts:189-194`). CONFIRMED-STILL-OPEN.
- **SRV-H4** `gameLifecycleHandler.ts:298-302` — mutex released before async game-setup completes; second `startGame` can broadcast duplicate `gameStarting`.

### UX-HIGH
- **UX-H1** `JoinRoomModal.tsx:188-198` — "Spectate" CTA stale when room transitions full→open during async open.
- **UX-H2** `RoomChat.tsx:285-286` — chat max-height conflicts with mobile-keyboard 55dvh modal; auto-scroll skips lines.
- **UX-H3** `PlayerRoster.tsx:103-108` — Add-Bot button stays disabled after slot frees due to stale state.
- **UX-H4** `MultiplayerLobby.tsx:71` — Create Room enabled while `isProfileLoading=true`; empty username sneaks through.
- **UX-H5** `host/components/pre-game/GameInstructions.tsx:70` — hardcoded `bg-slate-800/80` blends into navy on TV.
- **UX-H6** `CreateRoomModal.tsx:102` — `generateRoomName()` only strips apostrophes; RTL marks + accents leak into room chip.
- **UX-H7** `RoomListView.tsx:79-108` — neo-pink badge + black text borderline WCAG AA fail.
- **UX-H8** `MobileChatFab.tsx:84` — FAB unmounts mid-game when CG bridge async-resolves; no "chat unavailable" notice.

### REGRESSION-HIGH
- **REG-H1** New `changeRoomLanguage` handler (`backend/handlers/hostHandler.ts`) lacks pre-game-only guard. Tests cover host-rejection and invalid-language but not mid-round invocation. Race risk: language swap during active round.

---

## MEDIUM (selected highlights)

### Server
- **SRV-M1** Boost-applied scores rendered to client before Supabase persistence; on DB failure clients see boosted, leaderboard saved un-boosted (`gameResults.ts:147-150`).
- **SRV-M2** Leaderboard 500ms throttle defers grace-period word broadcasts (`wordHandler.ts:365-366`).
- **SRV-M3** `connectionHandler.ts:77-78` — socket.id reuse race in distributed Redis.
- **SRV-M4** `gameStartHandler.ts:249-256` — host can force 35s Blast (timer clamp 30-600 doesn't enforce per-mode default when explicit value sent).
- **SRV-M5** `boostHandler.ts:85-88` — no server-side idempotency on boost-claim.

### UX
- z-index race between Share dialog and AdvancedSettings (`MobileShareSection.tsx:100-145`).
- Hardcoded English `aria-label="Loading game board"` (`MultiplayerInGameView.tsx:309`).
- Dead overflow-badge code on `AvatarStack` (room cap = 8).
- Stale `showResults` after `onExitRoom` (`app/[locale]/multiplayer/PageClient.tsx:140-142`).
- BoostPicker missing focus trap (Esc works; Tab-back escapes).
- No score-delta animation on results (carryover from prior audit).
- Pull-to-refresh not debounced (`RoomListView.tsx:285-310`).
- BoostButton modal detaches on device rotation across layout trees.
- Avatar in JoinRoomModal doesn't update after in-app builder save.

### CG
- SDK script load failure silent-fails (`CrazyGamesSDK.tsx:191-192`).
- Visibility-change rapid pause/resume can throttle SDK (already logged in `sentry.client.config.ts:273`).
- Round-reset uses refs without explicit callback path.
- Invite button visible during `'waiting'` state even when room full.
- `happyTime()` thresholds (score 200, combo 5) likely unreached in fast MP rounds.

---

## MED-LOW / LOW

- `isInstantMultiplayer` SDK flag stored but auto-create-room not wired — instant-MP UX confusing.
- Ad callbacks don't pause MP timer during midgame ad → 5-10s drift.
- No error boundary / Sentry around CG SDK init.
- `getUserToken()` no retry; one-shot failure leaves anonymous.
- Memory-leak risk: `addJoinRoomListener` cleanup may skip on forced disconnect.
- `wordValidationHandler.ts` and `gameHandler.ts` not yet audited — separate dive needed.
- `gameStateManager.ts:428-430` — global authUserId map collapses parallel auth sessions.
- Per-action chat rate-limit (`config/rateLimits.ts:8: chatMessage 3/sec`) — verify enforcement in `chatHandler`.
- Bulk `invalidateLeaderboardCaches()` deprecated but still exported; verify no callers from season-reset path.
- Several minor a11y polish (gridcell aria redundancy, generic "Back" label, animation-cutoff on slow networks).

---

## Recommended Sprint Plan

### Sprint A — CG submission unblock (1-2 days)
1. Wire `useCrazyGamesLifecycle` into MP gameplay roots (CG-CRIT-1).
2. Reset refs on round-transition (CG-CRIT-2).
3. Hard-gate `AuthModal` mount on `isCrazyGames` (CG-CRIT-3).
4. Set `CRAZYGAMES_GAME_DOMAIN` default + module-load assertion (CG-CRIT-4).
5. Add e2e MP smoke test asserting SDK calls observed.

### Sprint B — Trust & validation (3-4 days)
1. Server-apply `scoreMultiplier` (memory: WordDetail.ts plumbing already scoped).
2. Ranked permission gate at room create.
3. Pre-game-only guard on `changeRoomLanguage`.
4. WordHunt target-found atomic lock.
5. Solo→MP grid regen on bot-add.
6. Test suites for `partyHandler` + `roomManagementHandler`.

### Sprint C — UX critical (2-3 days)
1. Replace native `confirm()` with localized dialog.
2. Chat rate-limit feedback.
3. BoostPicker <375px fix + focus trap.
4. Reconnect indicator before 5s threshold.
5. Single BoostButton render path (no double-mount).
6. WCAG fix on neo-pink badges.

### Sprint D — Polish + test debt (4+ days)
- Remaining MED items (~14 findings).
- Audit `wordValidationHandler` and `gameHandler` (current blind spots).
- Score-delta animation, mobile chat FAB resilience, RTL room-name sanitization.

---

## Carryover from 2026-04-02 audit

**Confirmed still open:** scoreMultiplier client-trusted · ranked permission missing · auth not refreshed on reconnect · mobile chat FAB resilience · score-delta animation · `wordHuntTargetFound` race.

**Newly verified fixed:** lobby-scoped broadcasts · timer guards · O(1) word lookup · ConnectionBanner present · spectator init · presence for all players · stale letterGrid closure.

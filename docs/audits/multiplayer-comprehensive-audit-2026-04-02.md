# LexiClash Multiplayer Comprehensive Audit — 2026-04-02

> **6-expert team audit** covering Security, Game Design, UX/Accessibility, Performance, Backend Reliability, and Code Quality across all multiplayer modes (Classic, Blast, Word Hunt, Duels, Tournaments, Matchmaking, Party Games, Earthquake).

## Executive Summary

| Domain | CRIT | HIGH | MED | LOW | Total |
|--------|------|------|-----|-----|-------|
| Security | 2 | 5 | 7 | 4 | **18** |
| Game Design | 3 | 7 | 8 | 5 | **26** (3 overlap w/ Security) |
| UX/Accessibility | 0 | 4 | 9 | 7 | **20** |
| Performance | 2 | 5 | 6 | 3 | **18** (2 overlap) |
| Backend Reliability | 5 | 9 | 11 | 7 | **32** |
| Code Quality | 2 | 5 | 6 | 4 | **17** |
| **Total (unique)** | **~12** | **~30** | **~40** | **~27** | **~111** |

**Top systemic issues:**
1. **Client trust** — ELO, game grid, gameCode, authUserId all trusted from client
2. **Timer leaks** — Raw `setTimeout` used instead of `timerManager` in 4+ handlers
3. **Type safety gap** — 27 server events missing from TypeScript interface, pervasive `as any`
4. **Zero test coverage** — 13 backend handlers + 4 core hooks untested (~6,000+ lines)
5. **Game balance** — Word Hunt drain too aggressive, Blast tile RNG unfair in MP, combo-breaking on confirmation finds

---

## Sprint Plan

### Sprint 1: Security & Trust Boundaries (CRITICAL)

| ID | Finding | Fix |
|----|---------|-----|
| SEC-001 | Client-supplied ELO in matchmaking | Server-side DB lookup |
| SEC-002 | Classic/WH mode accepts client grid | Server-generate grid for all MP modes |
| SEC-005 | Classroom handler uses unverified authUserId | Use `socket.data.verifiedUserId` |
| SEC-006 | Party handler uses unverified authUserId | Use `socket.data.verifiedUserId` |
| SEC-003 | resetGame host check bypass | Remove `isHostByRoom` fallback |
| SEC-004 | resetGame client-supplied gameCode | Never use client gameCode fallback |
| SEC-007 | Matchmaking no auth/rate limit | Add JWT + rate limit + Zod validation |
| BE-001 | updateGuestName non-atomic mutation | Single assignment or mutex |
| BE-002 | Spam penalty score clamp race | Atomic penalty+clamp in updatePlayerScore |
| BE-005 | resetGame host bypass (= SEC-003) | Same fix |

### Sprint 2: Backend Reliability & Timer Leaks

| ID | Finding | Fix |
|----|---------|-----|
| BE-003 | endGame fallback skips Supabase persistence | Add persistence in catch block |
| BE-004 | Word Hunt setTimeout untracked | Use `timerManager` |
| BE-008 | hostReconnectionTimeout not cleared on delete | Use `timerManager` |
| BE-009 | Player reconnection timeout leaks | Use `timerManager` with prefix clear |
| BE-011 | Earthquake captures stale game ref | Re-fetch game in timer callbacks |
| BE-012 | wordFeedback setTimeout untracked | Use `timerManager` |
| BE-007 | Matchmaking interval leak on duplicate join | Call `cleanup()` at start |
| SEC-008 | Same as BE-007 | Same fix |
| BE-010 | gift:send no validation schema | Add Zod validation |
| BE-014 | gift:send no rate limit | Add `checkRateLimit` |
| SEC-011 | Duel events no rate limit | Add rate limits to all duel handlers |

### Sprint 3: Game Balance & Fairness

| ID | Finding | Fix |
|----|---------|-----|
| GD-008 | Word Hunt drain too aggressive in phase 3 | Increase life restore or reduce drain to 1.5/s |
| GD-009 | Wrong guess penalty 15 HP too harsh | Reduce to 8-10 or scale with guess # |
| GD-005 | Blast tile RNG unfair in MP | Synchronized tile overlays (seeded from gameCode) |
| GD-022 | Combo breaks on confirmation finds | Still increment combo on valid word |
| GD-002 | Confirmation-find parasitic strategy | Scale credit down with # of finders |
| GD-010 | Only first finder gets WH bonus | Decreasing bonuses: 1st=20, 2nd=12, 3rd=8 |
| GD-023 | Rarity multiplier 2x too swingy | Cap at 1.5x |
| GD-017 | Async duel second-mover advantage | Hide scores until both submit |
| GD-015 | Hard/medium bots identical stats | Differentiate wordsPerMinute and missChance |

### Sprint 4: UX, i18n & Accessibility

| ID | Finding | Fix |
|----|---------|-----|
| UX-001 | Hardcoded English mode labels | Use `t()` translation keys |
| UX-005 | text-white/30 invisible contrast | Increase to white/60-70 |
| UX-006 | Create/Join modals missing `dir` for RTL | Add `dir={dir}` to DialogContent |
| UX-002 | Exit button 32px below touch target | Add `min-w-[44px] min-h-[44px]` |
| UX-014 | No error recovery on failed room fetch | Add timeout + retry banner |
| UX-004 | Room card text-[7px] unreadable | Increase to text-[10px] minimum |
| UX-012 | "Room Full" uses adventure translation keys | Create dedicated MP keys |
| UX-008 | Spectator banner overlaps content | Add dynamic padding-top |
| UX-007 | No loading feedback on room join click | Disable card + spinner while joining |
| UX-020 | No mode-specific onboarding for new players | Show tips on room card hover/select |

### Sprint 5: Performance & Scalability

| ID | Finding | Fix |
|----|---------|-----|
| PERF-002 | 22 handler modules per socket connection | Lazy-register on game join |
| PERF-001 | getActiveRooms unthrottled + O(n) | Rate limit + cache with dirty flag |
| PERF-003 | broadcastActiveRooms O(n) on every change | Cache result, recompute on dirty |
| PERF-004 | playerData useMemo uses raw leaderboard | Use deferredLeaderboard |
| PERF-006 | Trails interval re-renders every 5s | Ref-based or separate component |
| PERF-007 | SocketContext value changes on reconnectAttempt | Split into two contexts |
| PERF-008 | useGameSocket creates 15 useCallbacks | Stable ref pattern |
| PERF-012 | findAllWords blocks event loop | Move to worker pool |

### Sprint 6: Type Safety & Code Quality

| ID | Finding | Fix |
|----|---------|-----|
| CQ-001 | 27 server events missing from types | Add all to ServerToClientEvents |
| CQ-003 | Game vs GameState type mismatch | Use backend GameState consistently |
| CQ-007 | 8 files exceed 500-line limit | Split by domain |
| CQ-005 | Duplicate DailyChallenge transform | Extract helper function |
| CQ-006 | Unused imports in engagementHandler | Remove |
| CQ-010 | as any in partyHandler relay data | Define types + Zod validation |

### Sprint 7: Test Coverage

| ID | Finding | Fix |
|----|---------|-----|
| CQ-002 | 13 backend handlers zero tests | Write tests (gameStart, engagement, reconnect, bot first) |
| CQ-004 | 4 core MP hooks zero tests | Write integration tests |
| CQ-009 | 7 MP components no tests | Add smoke/render tests |

---

## All Findings by Domain

### Security (18 findings)

| ID | Sev | Location | Issue |
|----|-----|----------|-------|
| SEC-001 | CRIT | matchmakingHandler.ts:41 | Client-supplied ELO trusted without DB verification |
| SEC-002 | CRIT | gameStartHandler.ts:256-259 | Classic/WH mode accepts client-supplied board grid |
| SEC-003 | HIGH | gameLifecycleHandler.ts:393 | resetGame host check bypass via room membership |
| SEC-004 | HIGH | gameLifecycleHandler.ts:377 | resetGame accepts client-supplied gameCode fallback |
| SEC-005 | HIGH | classroomGameHandler.ts:79-81 | Uses unverified socket.handshake.auth.authUserId |
| SEC-006 | HIGH | partyHandler.ts:185,253 | Party games use unverified auth ID for feature flag |
| SEC-007 | HIGH | matchmakingHandler.ts:40 | No rate limiting, validation, or auth on matchmaking |
| SEC-008 | MED | matchmakingHandler.ts:40-56 | Interval leak on repeated joinMatchmaking |
| SEC-009 | MED | wordHuntHandler.ts:100-104 | Target word leaked via discovery guess feedback |
| SEC-010 | MED | kickHandler.ts:78 | Kick bypass via username change |
| SEC-011 | MED | duel/lifecycle.ts | No rate limiting on any duel events |
| SEC-012 | MED | partyHandler.ts:363-419 | Party input not validated per-player role |
| SEC-013 | MED | duel/gameplay.ts:143-155 | Duel score submission race allows multiple turns |
| SEC-014 | MED | classroomGameHandler.ts:91-107 | teacherId not cross-checked against socket auth |
| SEC-015 | MED | socketSetup.ts:60 | X-Forwarded-For IP spoofing for rate limiting |
| SEC-016 | LOW | gameLifecycleHandler.ts:302-319 | debugGameState exposes state in non-production |
| SEC-017 | LOW | wordValidationHandler.ts:210-216 | Opponent word feed leaks first/last letters |
| SEC-018 | LOW | partyHandler.ts:176-426 | Party games have no rate limiting |
| SEC-019 | LOW | wordHuntHandler.ts:141-150 | Discovery guess no per-player dedup |

### Game Design (26 findings)

| ID | Sev | Location | Issue |
|----|-----|----------|-------|
| GD-001 | CRIT | matchmakingHandler.ts:41 | Client-supplied ELO (= SEC-001) |
| GD-002 | CRIT | wordHandler.ts:317 | Confirmation-find parasitic strategy (50% credit + word feed hints) |
| GD-008 | CRIT | wordHuntMultiplayerConstants.ts:9-14 | Life drain too aggressive, phase 3 unrecoverable |
| GD-003 | HIGH | scoring.ts:122-136 | 8+ letter words flat-capped at 500 |
| GD-004 | HIGH | wordValidationHandler.ts:54 | baseScore display misleading (length-1 vs exponential) |
| GD-005 | HIGH | blastMultiplayerConstants.ts:24-38 | Random blast tiles create unfair score variance |
| GD-009 | HIGH | wordHuntMultiplayerConstants.ts:27 | Wrong guess penalty 15 HP too harsh |
| GD-010 | HIGH | wordHuntHandler.ts:106-109 | Only first finder gets target bonus |
| GD-022 | HIGH | wordHandler.ts:315-336 | Combo breaks on confirmation finds (rich-get-richer) |
| GD-023 | HIGH | scoringEngine.ts:117-143 | Rarity multiplier 2x too swingy |
| GD-006 | MED | gameConstants.ts:47-49 | MAX_TIMER=120 too restrictive for large boards |
| GD-007 | MED | earthquakeHandler.ts:162-183 | Fire round full grid replacement punishes strategy |
| GD-011 | MED | matchmakingQueue.ts:88-96 | ELO range expands to 500 (too wide) |
| GD-012 | MED | matchmakingQueue.ts | No ELO update after ranked matches |
| GD-013 | MED | tournamentManager.ts:214-257 | Late joiners get 0 for missed rounds |
| GD-016 | MED | botConfig.ts:91 | Easy bots trigger spam detector on wrong words |
| GD-017 | MED | duel/gameplay.ts:127-141 | Async duel second-mover sees first player's score |
| GD-025 | MED | Various | No rubber-banding/comeback mechanics in classic |
| GD-014 | LOW | tournamentHandler.ts:159 | Tournament boards ignore difficulty setting |
| GD-015 | LOW | botConfig.ts:86-106 | Hard/medium bots identical stats |
| GD-018 | LOW | duel/lifecycle.ts:78 | Duel boards 4x4 too small |
| GD-019 | LOW | earthquakeHandler.ts:186-189 | Fire round scoring boundary edge case |
| GD-020 | LOW | partyHandler.ts:78-82 | Shadow Clash minPlayers=5 too high |
| GD-021 | LOW | partyHandler.ts:262-263 | Party late joiners forced to spectate |
| GD-024 | LOW | gameConstants.ts:42-45 | Tournament timer 180s may cause fatigue |
| GD-026 | LOW | wordHuntHandler.ts | No duplicate guess tracking |

### UX/Accessibility (20 findings)

| ID | Sev | Location | Issue |
|----|-----|----------|-------|
| UX-001 | HIGH | RoomListView.tsx:85-106 | Hardcoded English mode labels |
| UX-002 | HIGH | MultiplayerLobbyView.tsx:173 | Exit button 32px below WCAG touch target |
| UX-005 | HIGH | RoomListView.tsx:302,401,405,434 | text-white/30 invisible contrast (1.7:1) |
| UX-014 | HIGH | PageClient.tsx:278 | No error recovery on failed room fetch |
| UX-003 | MED | MultiplayerLobbyView.tsx:240,246 | Name edit buttons below touch target |
| UX-004 | MED | RoomListView.tsx:395-416 | text-[7px] unreadable on mobile |
| UX-006 | MED | CreateRoomModal.tsx, JoinRoomModal.tsx | Modals missing dir attribute for RTL |
| UX-007 | MED | MultiplayerFlow.tsx:165-184 | No loading feedback on room join |
| UX-008 | MED | SpectatorBanner.tsx:46 | Banner overlaps content without offset |
| UX-009 | MED | RoomListView.tsx:340-439 | Room list no keyboard focus management |
| UX-012 | MED | JoinRoomModal.tsx:130,134 | "Room Full" uses adventure translation keys |
| UX-015 | MED | CompactLeaderboard.tsx | Leaderboard updates not announced to screen readers |
| UX-020 | MED | RoomListView.tsx:145-149 | No mode-specific onboarding for new players |
| UX-010 | LOW | MultiplayerFlow.tsx:268-274 | Clipboard copy fails silently |
| UX-011 | LOW | CreateRoomModal.tsx:327 | CTA button missing type="button" |
| UX-013 | LOW | ResultsDetailsContent.tsx:154 | Single-player section hardcodes English word order |
| UX-016 | LOW | CreateRoomModal.tsx:304-319 | Language buttons missing aria-pressed |
| UX-017 | LOW | CreateRoomModal.tsx:221,288 | Placeholder text-white/15 invisible |
| UX-018 | LOW | ConnectionStatusIndicator.tsx:446 | Connection banner uses adventure translation key |
| UX-019 | LOW | ResultsDetailsContent.tsx:222-233 | Sticky ready button pointer-events keyboard issue |

### Performance (18 findings)

| ID | Sev | Location | Issue |
|----|-----|----------|-------|
| PERF-001 | CRIT | roomManagementHandler.ts:63-65 | getActiveRooms unthrottled, O(n) per call |
| PERF-002 | CRIT | handlers/index.ts:39-66 | 22 handler modules (50+ listeners) per socket |
| PERF-003 | HIGH | socketHelpers.ts:94-106 | broadcastActiveRooms O(n) on every change |
| PERF-004 | HIGH | InGameScreen.tsx:223-230 | playerData useMemo uses non-deferred leaderboard |
| PERF-005 | HIGH | InGameScreen.tsx:249-267 | handlePathSubmit rebuilds tileStates 2D array |
| PERF-006 | HIGH | InGameScreen.tsx:150,187-193 | Trails interval forces re-render every 5s |
| PERF-007 | HIGH | SocketContext.tsx:317-325 | Context value changes on every reconnect attempt |
| PERF-008 | HIGH | SocketContext.tsx:421-533 | 15 useCallback wrappers recreated on emit change |
| PERF-009 | MED | wordValidatorPool.ts:288-293 | positions Map serialized on every word submit |
| PERF-010 | MED | scoreManager.ts:30-68 | Leaderboard throttle timers accumulate |
| PERF-011 | MED | connectionHandler.ts:277-319 | Reconnection timeouts not cleaned on game delete |
| PERF-012 | MED | gameStartHandler.ts:116-143 | findAllWords blocks event loop |
| PERF-013 | MED | chatHandler.ts:93-99 | chatHistory slice creates GC pressure |
| PERF-014 | MED | useLeadChangeDetection.ts:35 | leaderboard.filter() on every update |
| PERF-015 | MED | gameLifecycleHandler.ts:632 | spamDetector state not cleaned on game delete |
| PERF-016 | LOW | SocketContext.tsx:106-117 | getSharedSocket auth token race condition |
| PERF-017 | LOW | useOpponentWordFeed.ts:42-97 | Per-item timers (acceptable, well-bounded) |
| PERF-018 | LOW | gameStartHandler.ts:353-361 | Per-player retry timers (acceptable) |

### Backend Reliability (32 findings)

| ID | Sev | Location | Issue |
|----|-----|----------|-------|
| BE-001 | CRIT | gameLifecycleHandler.ts:530-539 | updateGuestName non-atomic mutation |
| BE-002 | CRIT | wordHandler.ts:95-101 | Spam penalty score clamp race condition |
| BE-003 | CRIT | gameEnd.ts:78-110 | endGame fallback bypasses Supabase persistence |
| BE-004 | CRIT | wordHuntHandler.ts:134-139 | Word Hunt setTimeout untracked/cancellable |
| BE-005 | CRIT | gameLifecycleHandler.ts:393 | resetGame host bypass (= SEC-003) |
| BE-006 | HIGH | matchmakingHandler.ts:56-89 | No try/catch in matchmaking interval |
| BE-007 | HIGH | matchmakingHandler.ts:40-97 | Interval/timeout leak on duplicate join |
| BE-008 | HIGH | connectionHandler.ts:171-216 | hostReconnectionTimeout not cleared on delete |
| BE-009 | HIGH | connectionHandler.ts:277-319 | Player reconnection timeout leaks |
| BE-010 | HIGH | giftHandler.ts:189-198 | gift:send no input validation schema |
| BE-011 | HIGH | earthquakeHandler.ts:139-215 | Stale game ref in timer closures |
| BE-012 | HIGH | gameEnd.ts:138-169 | wordFeedback setTimeout untracked |
| BE-013 | HIGH | gameLifecycleHandler.ts:227-251 | getWordsForBoard synchronous, blocks event loop |
| BE-014 | HIGH | giftHandler.ts:189 | gift:send no rate limit |
| BE-015 | MED | giftHandler.ts:33-38 | recentGifts Map grows unbounded |
| BE-016 | MED | gameStartHandler.ts:201-204 | Self-healing bypasses state machine |
| BE-017 | MED | gameStartHandler.ts:256-259 | Classic mode trusts client grid (= SEC-002) |
| BE-018 | MED | playerJoinHandler.ts:239 | leaveRoom trusts client gameCode |
| BE-019 | MED | wordHandler.ts:424-426 | submitWordVote trusts client gameCode + submittedBy |
| BE-020 | MED | playerJoinHandler.ts:345-426 | upgradeToPlayer no dedup guard |
| BE-021 | MED | hintHandler.ts:136-137 | Array.includes O(n) for found words check |
| BE-022 | MED | presenceHandler.ts:56 | presenceUpdate rate limit weight 0.2 allows flood |
| BE-023 | MED | wordHuntHandler.ts | gameCleanupEmitter not subscribed for WH timer |
| BE-024 | MED | chatHandler.ts:93-99 | chatHistory slice GC pressure |
| BE-025 | MED | socketSetup.ts:205-208 | Duel namespace disconnect handler minimal |
| BE-026 | LOW | gameLifecycleHandler.ts:308-313 | debugGameState leaks hostSocketId in dev |
| BE-027 | LOW | hintHandler.ts:155 | require() instead of import() |
| BE-028 | LOW | kickHandler.ts:55 | kickedPlayers Set not serializable to Redis |
| BE-029 | LOW | presenceHandler.ts:41-52 | No rate limit on ping/latencyCheck |
| BE-030 | LOW | earthquakeHandler.ts:122-123 | earthquakeTriggered set twice |
| BE-031 | LOW | gameStateManager.ts:291 | 30-min stale cleanup may be too long |
| BE-032 | LOW | gameStateManager.ts:128 | selectedVocabulary Set not serializable |

### Code Quality (17 findings)

| ID | Sev | Location | Issue |
|----|-----|----------|-------|
| CQ-001 | CRIT | shared/types/socket.ts | 27 server events missing from ServerToClientEvents |
| CQ-002 | CRIT | backend/handlers/ | 13 handlers have zero test coverage (~5,000 lines) |
| CQ-003 | HIGH | gameStartHandler.ts (multiple) | Game vs GameState type mismatch, 10+ `as any` |
| CQ-004 | HIGH | hooks/ | 4 core MP hooks zero tests (~1,153 lines) |
| CQ-005 | HIGH | engagementHandler.ts:166-177,457-468 | Duplicate DailyChallenge transform |
| CQ-006 | HIGH | engagementHandler.ts:22,31 | Unused imports |
| CQ-007 | HIGH | Multiple files | 8 files exceed 500-line limit |
| CQ-008 | MED | useAdventureWordValidation.ts:65 | Adventure scoring diverges undocumented |
| CQ-009 | MED | components/multiplayer/ | 7 MP components no tests |
| CQ-010 | MED | partyHandler.ts:378,391 | as any in party relay data |
| CQ-011 | MED | kickHandler.ts:74 | as any for cleanupPlayerData |
| CQ-012 | MED | playerJoinHandler.ts:412 | Opaque gameAny cast |
| CQ-013 | MED | useMultiplayerSocket.ts:539 | Empty deps array risks stale closures |
| CQ-014 | LOW | engagementHandler.ts | Inconsistent error handling (as Error unsafe) |
| CQ-015 | LOW | useMultiplayerSocket.ts:305 | debugGameStateResponse not in types |
| CQ-016 | LOW | socket.ts | hostTransferred payload typed as no-args |
| CQ-017 | LOW | useMultiplayerSocket.ts:262,342 | requestGameState not in ClientToServerEvents |

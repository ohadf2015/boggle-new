# Multiplayer UX Audit — 2026-05-04

**Scope**: All multiplayer modes — standard MP, classroom, education duels, wheel-rush MP, party games, plus shared infra (sockets, chat, invites, error states, CG embed).
**Lens**: First-time-player UX friction only. Perf, security, and architecture are covered by prior audits (`multiplayer-comprehensive-audit-2026-04-27.md`, `mp-perf-2026-05-02.md`, `wheel-rush-mp-2026-04-28.md`, `viewport-2026-05-02.md`).
**Method**: 4 parallel role-play agents, one per mode-cluster. ~93 raw findings deduped to 56 here.

---

## TL;DR — Top 10 Ship-First Wins

Ranked by **player-impact-per-fix-effort**. Each is a self-contained sprint A item.

| # | Finding | Severity | Effort | File anchor |
|---|---------|----------|--------|-------------|
| 1 | **Mode picker missing from CreateRoomModal** — players can't manually create wheel-rush rooms; mode is URL-param only | HIGH | S | `components/multiplayer/CreateRoomModal.tsx` |
| 2 | **Host-left = instant close, no grace** — players dropped without rejoin option | HIGH | S | `app/[locale]/multiplayer/PageClient.tsx:266-269` |
| 3 | **Hardcoded English fallback strings** — 5 sites: session-migration toast, "Failed to load leaderboard", clipboard errors, rate-limit, AFK warning | HIGH | M | `hooks/useMultiplayerSocket.ts:428,459`; `components/daily/*` (4 sites); `CrazyGamesFriendsStrip.tsx:46-48` |
| 4 | **Lobby silent on share** — host alone in room, no "🟢 share to invite" CTA, no player-count banner | HIGH | S | `components/multiplayer/MultiplayerLobby.tsx` (gap) |
| 5 | **`window.location.reload()` traps** — classroom exit + player exit reload into wrong context, drop URL params | CRIT | M | `host/hooks/useHostGameActions.ts:312`; `player/hooks/usePlayerExit.ts:74` |
| 6 | **Stale `showResults` flag on re-join** — prior results flash for 1 frame when re-entering same room | HIGH | S | `app/[locale]/multiplayer/PageClient.tsx:140-142` |
| 7 | **Connection dot hidden when connected** — players never see "we're online", only see problems → erodes trust | MED | S | `components/ConnectionStatusIndicator.tsx:96-99` |
| 8 | **Blank canvas on game-start (~400ms)** — dynamic import of Blast/WordHunt has no skeleton | MED | S | `components/multiplayer/MultiplayerInGameView.tsx:33-44` |
| 9 | **Party games TV+phone pairing unclear** — TV shows code/QR but no "open this on your phone" hint upfront; phone-side reconnect has no `requestPhaseSync` | HIGH | M | `app/party-screen/PartyScreenContent.tsx:70-92`; `components/party/pixel-clash/PixelClashPhone.tsx:77-82` |
| 10 | **Wheel-rush optimistic clear before ACK** — letters vanish, then error toast on server reject = double-confusing | HIGH | S | `components/multiplayer/WheelRushView.tsx:283-290` |

Estimated total effort: ~3–5 dev days. Player-friction reduction estimate: high — items 1, 2, 4, 5, 9 each unblock entire flows currently broken or invisible.

---

## Cross-Mode Themes

### Theme A — Silent Failures (8 findings)
Hardcoded English fallbacks, swallowed clipboard errors, missing toasts on host demotion, suppressed reconnect notices. The pattern: "happy path translated, error path falls back to English literal" or "error path swallowed entirely".

- A1 `hooks/useMultiplayerSocket.ts:428` — `'Your session was moved to another tab'` literal fallback.
- A2 `backend/handlers/playerReconnectHandler.ts:88,120` — backend ships English string in payload; frontend MUST always translate via key.
- A3 `components/daily/*` — 4 sites with literal `'Failed to load leaderboard'` (memory `feedback-hardcoded-leaderboard-error` already filed).
- A4 `components/multiplayer/CrazyGamesFriendsStrip.tsx:46-48` — `clipboard.copy().catch(() => {})` swallows iOS private-mode/macOS-permission denials. Click → nothing → no toast.
- A5 `hooks/useMultiplayerSocket.ts:459-467` — rate-limit toast English fallback.
- A6 `hooks/useMultiplayerSocket.ts:481-495` — host-transfer to a peer: demoted host gets no toast, silently loses host badge mid-game.
- A7 `MultiplayerInGameView.tsx:309` — `aria-label="Loading game board"` not via `t()`.
- A8 Multiple sites — "Failed to load X" Sentry-level errors instead of user-actionable copy.

**Lint-rule candidate**: forbid raw English string in `toast()`, `aria-label`, and `<p>` direct children inside `components/multiplayer/**`. Force `t()` or explicit `t(key, defaultValue)`.

### Theme B — Invisible Loading + Empty States (9 findings)
The room fetches in silence. The game canvas blanks for 400ms. The lobby shows nothing while waiting for the second player. Compound effect: every transition feels broken.

- B1 `MultiplayerFlow.tsx:138-146` — 10s room-fetch timeout shows retry banner but no progressive spinner before t=10s.
- B2 `MultiplayerInGameView.tsx:33-44` — dynamic import `loading: null`, hard cut to game.
- B3 `MultiplayerLobby.tsx` (gap) — host alone, no "share to invite" CTA.
- B4 `RoomListView.tsx:243` — flex→grid reflow on tab return = layout shift.
- B5 `WheelRushView.tsx:20` — Pixi ring appears static at game-start (no spin-pulse to signal "alive").
- B6 `ResultsMainContent.tsx` — score is static (no count-up animation).
- B7 `CgAwareLobbyChrome.tsx` — room-fetch timeout banner has no retry button.
- B8 Reconnect — `useMultiplayerSocket.ts:186-187` intentionally silent ("noise") but `ConnectionDot` is also silent when connected (item 7 above), so user has no positive signal.
- B9 `education/duels/PageClient.tsx:52-64` — "Finding classmates" with no "you must enroll first" CTA when no classroom assigned.

### Theme C — Exit Traps (6 findings)
`window.location.reload()` is used in 3+ places to "reset" — drops URL params, breaks classroom context, shows wrong lobby.

- C1 `host/hooks/useHostGameActions.ts:312` — classroom teacher exit → reload → traps on `?classroom=true&host=true` flag combo.
- C2 `player/hooks/usePlayerExit.ts:74` — reload still fires after URL cleanup; lands on `/multiplayer` without `?classroom=true`, dropping classroom context.
- C3 `app/[locale]/party/[gameId]/play/PartyPlayClient.tsx` — exit doesn't clear `playerId`/`roomCode`; rejoin shows cached state.
- C4 Memory `feedback-classroom-reload-keeps-query` — known, still present.
- C5 `PageClient.tsx:266-269` — host-left = instant close, no grace period for "host might come back" rejoin.
- C6 `WheelRushView.tsx` `onQuit` callback not wired; "Back to Mode Picker" path ambiguous.

### Theme D — Host Control Surface (5 findings)
Hosts can do things that confuse them or break the game; player count + private/share state not gated cleanly.

- D1 `MultiplayerLobby.tsx:71` — "Create Room" enabled while profile is loading; ghost username sneaks through.
- D2 `HostView.tsx`/`gameStartHandler.ts` — host can start with empty room (or solo without confirmation); no inline "1/2 minimum required" banner.
- D3 `MultiplayerLobby.tsx` — share/invite button visible on private/quickPlay rooms; confusing in classroom context.
- D4 `useHostGameActions.ts` — start-solo confirmation modal doesn't disable underlying button → double-fire risk.
- D5 `ClassroomGameLobby.tsx:135-140` — game code generated client-side then sent to server; server could reassign on collision race.

### Theme E — Discovery Gaps (5 findings)
The mode roster is undersold. Wheel-rush and party games exist but aren't reachable from `/multiplayer` without URL hacking or feature flags.

- E1 `CreateRoomModal.tsx` — no mode selector; mode comes from URL param only. **Top-10 #1.**
- E2 `RoomListView.tsx:78-93` — wheel-rush listed but no "NEW" badge or onboarding tooltip.
- E3 `app/[locale]/party/PartyHubClient.tsx:46` — party games gated by `party_games_alpha` flag with no discovery card from `/multiplayer`.
- E4 `RoomListView.tsx:78-120` — mode icons tiny on <375px; first-timer can't distinguish at a glance.
- E5 `app/party-screen/PartyScreenContent.tsx:70-92` — TV landing page asks for room code but doesn't tell host to also open game on phone.

### Theme F — Reconnect / Resync (5 findings)
Snapshot patterns inconsistent across modes. Standard MP has snapshot, wheel-rush partial, party games none.

- F1 `WheelRushView.tsx:142-149` — fog-of-war local-clock timer drifts across reconnect boundary.
- F2 `pixel-clash/PixelClashPhone.tsx:77-82` — phone-TV resync missing on reconnect.
- F3 `useMultiplayerSocket.ts:250-269` — reconnect fallback timer race; no UUID/version check.
- F4 `wheelRushHandler.ts:134-149` — H1 reconnect snapshot shipped but no integration test verifying word/lock/leaderboard restoration.
- F5 Memory `wheel-rush-mp-audit-2026-04-28` H2/H3/H5 — unverified shipped status.

### Theme G — Mobile / RTL / i18n Polish (8 findings)
- G1 Memory `viewport-audit-2026-05-02` C1 — `/multiplayer` desktop = mobile-stacked.
- G2 `RoomListView.tsx:280` — neo-pink/black contrast on navy borderline AA fail.
- G3 `RoomListView.tsx:285-310` — pull-to-refresh not debounced; rapid pull → spinner thrash.
- G4 `ClassroomModeBanner.tsx:118` — Hebrew lesson name truncates without RTL-aware max-width.
- G5 `ClassroomModeBanner.tsx:104` — `|` dividers in flex are LTR-only; need `<span dir="ltr">` wrap.
- G6 `WheelRushPieces.tsx:69` — long Japanese words break chip layout.
- G7 `MultiplayerErrorBanner.tsx:50` — `shadow-hard-sm` not RTL-flipped on some banners.
- G8 `JoinRoomModal.tsx:184` — footer respects `--admob-banner-height` but lags on ad refresh; same for `OpponentWordFeed.tsx:25`.

### Theme H — Progression Hooks (5 findings)
Wins feel hollow: no XP popup on duel win, no rematch nudge after classroom round, no streak surface mid-match.

- H1 `education/duels/*` — no XP/badge popup on win/loss.
- H2 Classroom results — no "Start Next Round" CTA for teacher.
- H3 `ResultsActionButtons.tsx:98-120` — "Ready for Next" path unclear (does it auto-start, wait for host?).
- H4 Live leaderboard mid-game — no "You" highlight; player can't find self.
- H5 Duel opponent context — no classroom badge, no "from Ms. Smith's class" framing.

### Theme I — Privacy / Child Safety (3 findings)
- I1 `ClassroomLeaderboard.tsx:71` — `visibility?` prop exists but not plumbed; defaults to public display of student names.
- I2 `ClassroomGameLobby.tsx:168-180` — lesson data in sessionStorage, lost on refresh.
- I3 `RoomChat.tsx:266-268` — chat hidden on CG (correct, child safety) but no "chat unavailable" notice on mobile FAB → empty button on game-start, then disappears.

---

## Per-Mode Hot Items

### Standard MP
- Top-10 #1, #2, #4, #6, #7, #8 all primarily affect this mode.
- Mobile: fix #4 + B1 first; lobby empty-state is the #1 onboarding leak.
- Desktop: G1 viewport audit C1 still open.

### Classroom MP
- C1, C2, C4 — reload traps. **Highest classroom-specific priority.**
- Theme D D5 — game code race.
- Theme H H2, H3 — round-loop nudge.
- Theme I I1 — wire `visibility` prop end-to-end.
- G4, G5 — RTL banner gap.

### Education Duels
- B9 — no enrollment CTA on empty matchmake.
- H1, H5 — no XP popup, no opponent context.
- Treat as classroom sibling; same i18n + reload sweep applies.

### Wheel-Rush MP
- E1, E2 — no mode picker, no "NEW" badge.
- F1 — fog drift.
- Top-10 #10 — optimistic clear.
- B5 — static start.
- G6 — JA chip overflow.

### Party Games
- E3, E5 — discovery + TV/phone pairing.
- F2 — phone-TV resync.
- C3 — exit cleanup.
- G6-adjacent — TV QR sizing on >1920px screens.

### CG Embed
- A4 — clipboard catch swallowed.
- I3 — chat unavailable notice.
- Memory `cg-portal-loader-hang-fix-2026-05-01` — verify still applied.
- `CrazyGamesFriendsStrip.tsx:44` — `inviteLink` doesn't check `isInstantMultiplayer`.

---

## Suggested Sprints

### Sprint A — "Stop the bleeding" (1–2 days)
Ship Top-10 #1, #2, #4, #5, #6, #7. Pure UX wins, no architecture risk. All file edits already-known.

**Acceptance**: 
- Wheel-rush rooms creatable via UI without URL hacking.
- Host-left shows 10s rejoin grace modal.
- Lobby empty-state shows share CTA.
- No `window.location.reload()` in classroom/player exit paths.
- Connection dot shows green for 3s after first connect.
- Stale `showResults` cleared in `onJoined` before `setIsActive(true)`.

### Sprint B — "Localize + recover" (2–3 days)
Ship Theme A entirely (5 hardcoded sites + lint rule), Theme F F1+F2+F3.

**Acceptance**:
- All 5 hardcoded English fallbacks routed through `t()` with HE/SV/JA/ES coverage.
- ESLint rule blocks new raw-string toasts in `components/multiplayer/**`.
- Wheel-rush fog timer reset on reconnect.
- Party phone↔TV `requestPhaseSync` round-trip.

### Sprint C — "Polish + delight" (2–3 days)
Ship Themes B, G, H. Loading skeletons, RTL fixes, score-count-up, classroom round-loop.

### Sprint D — "Discovery + onboarding" (1–2 days)
Ship Top-10 #9 + Theme E E2/E3/E5.

---

## Out of Scope (Punted)

- **Performance items** — covered by `mp-perf-2026-05-02.md` (H2/H3/H5 still open there).
- **Security items** — server-trust score validation already in `mp-audit-2026-04-27.md` SRV-CRIT.
- **Server-side schema additions** — wheel-rush `socketSchemas` registration covered in `wheel-rush-mp-audit-2026-04-28.md`.
- **Architecture refactors** — selection-store split shipped 2026-05-03; further H-items there.

---

## Methodology Note

4 parallel `Explore` agents (haiku) ran ~5min total. ~93 findings deduped to 56 (overlap rate ~40%, mostly on Theme A hardcoded-string class). High-overlap themes promoted to "Theme" sections; mode-unique items kept in per-mode sections. No code reviewed for correctness — only for player-facing UX friction.

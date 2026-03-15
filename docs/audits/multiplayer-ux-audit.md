# Multiplayer UX Audit — LexiClash
**Date:** 2026-03-15
**Auditor:** UI/UX Design Agent
**Scope:** Full player journey from room discovery through post-game

---

## 1. User Journey Map

```
ENTRY POINT
    |
    v
[/multiplayer] — GlobalBottomNav "Play" tab or direct URL
    |
    |-- CrazyGames SDK initializing? --> Blank "Loading..." text (no branded loader)
    |
    v
[RoomListView — "Social Hub"]
    |
    |-- Quick Play CTA (prominent, lime green, pulsing glow animation)
    |-- Active Battles list (room name, player count, in-progress badge)
    |-- "Or Create Custom" ghost text link
    |-- Refresh button | Pull-to-refresh (mobile)
    |-- Help (?) opens HowToPlay dialog
    |
    |-- User clicks room --> [JoinRoomModal overlay]
    |-- User clicks Quick Play --> auto-creates room, copies invite link
    |-- User clicks Create Custom --> [CreateRoomModal overlay]
    |
    v
[JoinRoomModal / CreateRoomModal]
    |
    |-- Enter username (pre-filled if authenticated)
    |-- Language selection (create only)
    |-- Join button / Create button
    |
    v
[Joining state — isJoining spinner, no timeout UI]
    |
    |-- Success --> isActive = true
    |-- Error --> toast + error string, back to room list
    |
    v
[HOST: HostPreGameView — Lobby]   [PLAYER: PlayerView waiting state]
    |                                    |
    |-- Player list with avatars          |-- "Waiting for host to start" (implied)
    |-- Start Game button                 |-- Leaderboard shows joined players
    |-- Settings panel                    |-- Chat (desktop)
    |-- QR code share dialog             |-- No explicit "waiting" animation
    |
    v
[COUNTDOWN / showStartAnimation]
    |
    v
[IN-GAME — InGameScreen / BlastGame / WordHuntGame]
    |
    |-- Timer (circular, prominent)
    |-- Word forming area
    |-- Score + rank (my position)
    |-- Leaderboard (desktop sidebar / mobile compact strip)
    |-- Lead change banner (took/lost lead)
    |-- Chat (desktop only)
    |-- Combo display
    |-- Presence indicators (host view only, shows active/idle/afk per player)
    |-- Fire round / earthquake overlays
    |
    |-- AFK player: host sees ZZZ presence indicator; player sees nothing
    |-- Disconnect: GameLeaderboard has disconnected field but no visible badge
    |
    v
[Game ends — server pushes results]
    |
    v
[ResultsPage]
    |
    |-- ConsolidatedPlayerCard (your stats: rank, score, words, accuracy, bonuses, achievements, XP)
    |-- ResultsPlayerCard per opponent (collapsible words, achievements)
    |-- "Return to Room" button (host: also "Play Again" / reset)
    |-- No explicit "rematch" concept — host resets, players passively wait
    |
    v
[Back to HostPreGameView / PlayerView lobby — series tracking continues]
```

---

## 2. Pain Points by Severity

### CRITICAL

**C1 — Player has no feedback while waiting for game to start**
- After joining, a player lands in `PlayerView` waiting state.
- There is no "Waiting for host to start" message, countdown, or animated state surfaced in the code path. The leaderboard shows joined players, but nothing tells the player what to do next.
- Players will tap around, think the join failed, or leave.
- Fix priority: Immediate.

**C2 — AFK/disconnect is invisible to the affected player**
- `PresenceIndicator` (ZZZ, yellow dot) is only rendered in `GameLeaderboard` when `isHost` is true. The AFK player themselves sees no warning before being kicked.
- Other non-host players also cannot see which opponents are AFK.
- The backend already tracks `presenceStatus` and `disconnected` fields; they are wired only for the host's view.
- Fix priority: Immediate.

**C3 — "Room full" and "game in progress" error states are silent joins**
- In-progress rooms show an "In Progress" badge in the room list but are still joinable (as spectator). The join flow does not warn that the user will enter as a spectator before they commit.
- Spectator upgrade UX requires emitting `upgradeToPlayer` but there is no state guard on the backend (noted in prior audit as HIGH issue). From the user side there is also no clarity on whether the upgrade was accepted or is pending.
- Fix priority: Immediate.

---

### HIGH

**H1 — Joining spinner has no timeout or failure recovery UI**
- `isJoining = true` shows a spinner on the CTA button. If the socket event never resolves (network lag, server overload), the button stays disabled forever.
- No timeout, no "taking longer than expected" message, no retry path.

**H2 — Connection recovery during gameplay offers no context**
- `ConnectionDot` shows "Connecting..." or "Reconnecting..." as a floating pill at top-center.
- During a live game, the player has no idea whether their words are being lost, whether the game is paused for them, or whether rejoining will restore their score.
- `ConnectionBanner` (full red banner with retry) is a separate component that is NOT rendered in `PageClient.tsx` — only `ConnectionDot` is. The fuller recovery UI is available but unused.

**H3 — Post-game rematch flow is host-only and undiscoverable**
- Players who want to play again must wait passively. The host's action (reset game) is the only mechanism.
- There is no "Vote for rematch" UI, no visible timer for how long the lobby stays open, and no indication to players that the host can reset.
- `ResultsPage` has a `onReturnToRoom` prop for the host, but the player's `ResultsPage` card has no equivalent visible action described beyond closing.

**H4 — Chat is desktop-only during gameplay**
- `RoomChat` is rendered only in the `hidden lg:block` desktop column.
- On mobile (the dominant platform), there is zero chat access during gameplay.
- Chat toast notifications for new messages still fire on mobile, but tapping them leads nowhere actionable.

**H5 — Quick Play copies invite link silently with hardcoded English toast**
- `handleQuickPlay` calls `toast.success('Invite link copied — send it to friends!', ...)` — this is a hardcoded English string, violating the translation rule.
- On iOS, `navigator.clipboard.writeText` requires user gesture context and may fail silently; no error feedback exists.

---

### MEDIUM

**M1 — CrazyGames SDK loading shows unstyled "Loading..." text**
- When `isCrazyGamesReady` is false, `MultiplayerFlow` returns a `<div>` with plain `"Loading..."` text — no brand treatment, no loader component, no i18n.
- Non-CrazyGames players still see this flicker before SDK initializes.

**M2 — Room list shows no game mode indicator**
- Each room card shows language flag + room name + player count + "In Progress" badge.
- Mode (Classic / Blast / Word Hunt) is not surfaced. A player has no way to know what game they are joining before clicking.

**M3 — Score updates have no animation cue for opponent scoring**
- The leaderboard re-sorts when scores change (CSS transition, no layout animation).
- Position changes are instantaneous — players cannot tell who just scored or by how much.
- `blastComboSync` is passed to `CompactLeaderboard` but only used for combo badge, not general score events.

**M4 — No minimum player count warning before game start**
- Host can start a game with one player (themselves). There is no UI warning that solo play in a multiplayer room is unusual. This confuses both new hosts and single-player users who navigated to multiplayer by mistake.

**M5 — Results page does not surface "what happened while I was disconnected"**
- If a player disconnects mid-game, their final score reflects words submitted before disconnect. The results page shows no indicator that they played a partial game, leading to confusion about low scores.

**M6 — Spectator UX: no indication of how long until they can join**
- `SpectatorBanner` shows "You are spectating" and a "Request to Play" button but no indication of whether the request is pending, accepted, or will take effect next round.

**M7 — Mobile leaderboard is truncated to 120px max height**
- The compact mobile leaderboard in `PortraitLayout` has `max-h-[120px] short:max-h-[80px]`.
- With 4+ players, overflow is hidden. There is no scroll affordance and no "see full leaderboard" entry point during gameplay.

**M8 — Host-only presence indicators create information asymmetry**
- Only the host can see presence status (active/idle/afk) in `GameLeaderboard`.
- Players cannot see their own presence status (are they about to be flagged AFK?), nor can they see if an opponent has disconnected.

---

### LOW

**L1 — Back arrow on RoomListView goes to `/` (hardcoded), not locale-aware**
- `href="/"` — should be `href={`/${language}`}` to preserve locale routing.

**L2 — "or of N" rank label uses English suffix logic**
- `getRankSuffix` in `ConsolidatedPlayerCard` returns `'st'`, `'nd'`, `'rd'`, `'th'` — hardcoded English ordinals. Hebrew, Swedish, and Japanese use different ordinal conventions.

**L3 — Exit confirmation during game lacks consequence clarity**
- `playerView.exitWarning` translation key is used but the consequence for leaving mid-game (losing score, room staying active) is not described.

**L4 — Chat input area uses `dir="auto"` but messages render alignment based on username, not message content**
- A Hebrew-writing player whose username is English will get `items-end` (right-aligned) messages in a bubble that auto-aligns left due to `dir="auto"`.

---

## 3. Missing States and Feedback

| Flow | Missing State |
|---|---|
| Player lobby | "Waiting for host" with player list and ready state |
| Player AFK | Warning toast/overlay at X seconds of inactivity before kick |
| Own AFK status | Self-visible indicator ("you will be marked AFK in 30s") |
| Spectator upgrade | Pending/accepted state after requesting to play |
| Joining | Timeout after ~10s with retry option |
| Opponent disconnect | Visual indicator in player-visible leaderboard |
| Reconnecting during game | Per-game-mode message: "your words are saved / game is paused for you" |
| Game start (player) | Countdown or "host is starting the game" indicator |
| Results — partial game | Badge or note indicating player disconnected partway through |
| Rematch | Player-visible "waiting for host to reset" with timeout |
| Quick play share | Clipboard failure fallback (show code instead) |
| Room join — mode info | Game mode label before joining |

---

## 4. Improvement Recommendations with Wireframe Descriptions

### REC-01: Player Lobby "Waiting" State

**Problem:** C1 — players see nothing after joining.

**Wireframe description:**
```
+------------------------------------------+
|  ROOM: "Ohad's Room"          Code: XYZ123|
+------------------------------------------+
|                                           |
|   [Player avatars in a row, pulsing]      |
|   Ohad (host)   Sam      + 1 waiting...  |
|                                           |
|   ⏳  Waiting for host to start the game  |
|   Host can start when ready.              |
|                                           |
|   [Share link button]                     |
+------------------------------------------+
```
- Show player avatars with a subtle "joining" pulse on new arrivals.
- Add `aria-live="polite"` region that announces "Sam joined the room".
- Show game mode badge selected by host (this also solves M4 by letting host change it pre-start).
- Keep the existing `usePlayerJoinLeaveNotifications` toasts; supplement with persistent in-view list.

---

### REC-02: AFK Warning System — Player-Facing

**Problem:** C2 — no self-warning before AFK kick.

**Wireframe description (in-game overlay, bottom of screen):**
```
+----------------------------------------------+
| ⚠️  You've been inactive for 30 seconds.      |
|     Tap anywhere or you'll be marked AFK.     |
|     [I'm here]  (countdown 10...9...8)        |
+----------------------------------------------+
```
- Trigger when `presenceStatus` transitions to `idle`.
- If `afk`, show a larger overlay blocking the grid: "You've been marked inactive. Tap to return."
- For other players: show small "ZZZ" avatar badge on the player's leaderboard row (extend PresenceIndicator visibility to `!isHost` cases too).

---

### REC-03: Opponent Presence in Player Leaderboard

**Problem:** C2, M8 — presence indicators host-only.

**Implementation note:**
In `GameLeaderboard`, change the presence render guard:
```
// Current:
{isHost && !player.isMe && player.presenceStatus && (
  <PresenceIndicator ... />
)}

// Recommended:
{!player.isMe && player.presenceStatus && (
  <PresenceIndicator ... />
)}
```
For disconnected players, add a grey "disconnected" overlay or strikethrough styling to their row.

---

### REC-04: In-Game Mobile Chat Access

**Problem:** H4 — chat inaccessible on mobile during gameplay.

**Wireframe description:**
```
[Bottom-right corner FAB]
  [Chat bubble icon] (3) unread badge
       |
       v
[Bottom drawer slide-up — max 40vh]
  +----------------------------------+
  | Chat  [X]                        |
  | ...messages (virtual scroll)     |
  | [input field] [send]             |
  +----------------------------------+
```
- Lazy-render the drawer; only mount `RoomChat` when opened.
- Unread count badge persists on the FAB when collapsed.
- On landscape mobile, position as a side panel at 30vw.
- Existing `onNewMessage` callback already supports badge count logic.

---

### REC-05: Connection Recovery — Contextual Messaging During Game

**Problem:** H2 — ConnectionDot gives no game-specific context.

**Wireframe description (replaces/augments ConnectionDot during active game):**
```
+-----------------------------------------------+
| ↻  Reconnecting... (attempt 3/20)             |
|    Your progress is being saved.               |
|    [Try now]                                   |
+-----------------------------------------------+
```
- When `isActive` is true and `isReconnecting` is true, render `ConnectionBanner` (which already exists but is not used in PageClient) instead of just `ConnectionDot`.
- Add game-specific copy: "Your score is saved on the server."
- When reconnection succeeds during an active game, show a brief success toast: "Reconnected — resuming game."

---

### REC-06: Spectator Upgrade Flow Clarity

**Problem:** C3, M6 — spectator state unclear.

**Two-state SpectatorBanner:**
```
State A — waiting:
  👀 You are spectating | [Request to play]

State B — pending (after button tap):
  ⏳ Your request is pending... | [Waiting for host]
```
- Add `isPendingUpgrade` boolean state in `PageClient`.
- Set to true when `upgradeToPlayer` is emitted.
- Reset on `onSpectatorUpgraded`.
- Show countdown "If not accepted in 30s, the request will expire."

---

### REC-07: Room List — Game Mode Badges

**Problem:** M2 — mode unknown before joining.

**Add to each room card:**
```
[Flag] Room Name          [Classic] [In Progress]
       3 players
```
- `ActiveRoom` type needs a `gameMode` field (backend addition required).
- Use small colored pill: Classic (cream), Blast (orange), Word Hunt (pink).
- Helps players self-select into preferred mode.

---

### REC-08: Joining Timeout and Retry

**Problem:** H1 — spinner can hang indefinitely.

**Pattern:**
```typescript
// In useMultiplayerJoin or PageClient
useEffect(() => {
  if (!isJoining) return;
  const timeout = setTimeout(() => {
    setIsJoining(false);
    setError(t('errors.joinTimeout'));
    toast.error(t('errors.joinTimeout'));
  }, 12000);
  return () => clearTimeout(timeout);
}, [isJoining]);
```
- 12s timeout; show "This is taking longer than expected. Check your connection."
- Re-enable the Join button with a "Try again" label.

---

### REC-09: Score Change Animation in Leaderboard

**Problem:** M3 — no visual cue for opponent scoring.

**Micro-animation pattern:**
- When a player's `score` increases in `leaderboard`, flash their row background with `neo-lime/40` for 600ms.
- When rank position changes, animate row movement (reintroduce `layout` prop on `LeaderboardRow` behind `!reduceMotion` guard).
- Show a `+N` floating number above the row for 800ms. This is consistent with `FloatingScoreAnimation` already used for self-scoring.

---

### REC-10: Results — Rematch / Next Round Clarity

**Problem:** H3 — players have no agency post-game.

**Wireframe for player results view (add below ConsolidatedPlayerCard):**
```
+------------------------------------------+
|  ⏳ Waiting for host to start next round  |
|  [Leave room]   [Suggest rematch 👍]      |
+------------------------------------------+
```
- "Suggest rematch" emits a vote event; show vote count to host in their results view.
- If host resets within 30s, auto-transition players back to lobby without requiring action.
- Add "Leave room" as a clear, low-anxiety escape hatch (currently only exit is the exit-confirm dialog that requires confirmation).

---

## 5. Accessibility Issues in Multiplayer Flows

### A11Y-01 — Room list uses `role="listbox"` with `role="option"` on `<button>` elements
- `<button role="option">` is invalid HTML. Buttons inside a listbox should be `<li role="option">` or the container should be `role="list"` with `role="listitem"`.
- Screen readers may announce these as "option" but they behave as buttons, causing mode confusion.
- **Fix:** Change container to `role="list"` and items to `role="listitem"`. Keep keyboard arrow-key navigation already implemented.

### A11Y-02 — Presence indicator tooltips use text "Active", "Away", "Away from keyboard" — hardcoded English
- `statusConfig` strings are not passed through `t()`.
- **Fix:** Pass `t` into `PresenceIndicator` or use translation keys.

### A11Y-03 — Exit confirmation dialog missing `aria-describedby` association
- `AlertDialogDescription` renders but the connection between it and the dialog title via `aria-describedby` depends on Radix UI wiring. Verify the `noDescription` prop is not accidentally stripping it.

### A11Y-04 — LeadChangeBanner (imported but component file not found)
- `LeadChangeBanner` is imported in `PortraitLayout` but the component at `components/LeadChangeBanner.tsx` returns a 404. If this component renders as null silently, important event feedback is silently missing for all players.
- **Fix:** Verify file path and confirm component renders.

### A11Y-05 — Floating score animation has no screen reader equivalent
- `FloatingScoreAnimation` appears to be a visual-only element. When a word is accepted, `announceWordResult` is called in `useWordSubmission`, which covers this — but verify the announcement includes the score value, not just "word accepted."

### A11Y-06 — Mobile leaderboard compact strip has no focusable elements
- `CompactLeaderboard` players are read-only display. Keyboard users on mobile (switch access) have no way to navigate the score list. At minimum add `role="list"` and `role="listitem"` with player name/score in a readable structure.

### A11Y-07 — "Me" badge in leaderboard is purely visual
- The `(me)` badge identifies the current player visually. There is no `aria-label` or visually-hidden text on the row itself to convey "this is you" to screen readers.

### A11Y-08 — Results collapsible sections missing `aria-controls`
- The toggle buttons in `ConsolidatedPlayerCard` have `aria-expanded` but no `aria-controls` pointing to the panel ID they control.
- **Fix:** Add `id` to each panel `<div>` and `aria-controls={id}` on corresponding button.

### A11Y-09 — rank suffix hardcoded in English for ordinal rendering
- See L2 above. Screen readers in Hebrew and Japanese will read "1st", "2nd" phonetically, which is confusing.

### A11Y-10 — Spectator banner `role="alert"` with `aria-live="polite"` is contradictory
- `role="alert"` implies `aria-live="assertive"`. Setting `aria-live="polite"` overrides this and may delay announcement.
- **Fix:** Remove `aria-live` and let `role="alert"` use its implicit assertive behaviour, or change `role` to `region` and keep `polite`.

---

## 6. Summary Table

| # | Issue | Severity | Flow |
|---|---|---|---|
| C1 | No player lobby waiting state | Critical | Lobby |
| C2 | AFK invisible to player and opponents | Critical | In-game |
| C3 | Spectator join not warned pre-join | Critical | Room discovery |
| H1 | Join spinner no timeout/recovery | High | Joining |
| H2 | ConnectionBanner unused during active game | High | Connection |
| H3 | No rematch/reset clarity for players | High | Post-game |
| H4 | Chat mobile-only on desktop | High | In-game |
| H5 | Quick Play hardcoded English toast | High | Room discovery |
| M1 | CrazyGames loader unstyled/i18n missing | Medium | Entry |
| M2 | No game mode on room list cards | Medium | Room discovery |
| M3 | No score delta animation for opponents | Medium | In-game |
| M4 | No warning for starting solo game | Medium | Lobby |
| M5 | No partial-game indicator in results | Medium | Post-game |
| M6 | Spectator upgrade state not shown | Medium | Spectator |
| M7 | Mobile leaderboard 120px truncation | Medium | In-game |
| M8 | Presence info host-only | Medium | In-game |
| L1 | Back link not locale-aware | Low | Room discovery |
| L2 | English-only ordinal suffixes | Low | Post-game |
| L3 | Exit warning lacks consequence text | Low | In-game |
| L4 | Chat bubble alignment in RTL | Low | In-game |
| A11Y-01 | Invalid listbox/option ARIA roles | High | Room discovery |
| A11Y-02 | Presence tooltip strings not translated | Medium | In-game |
| A11Y-03 | Alert dialog description association | Medium | In-game |
| A11Y-04 | LeadChangeBanner possibly missing | High | In-game |
| A11Y-05 | Floating score no SR equivalent | Low | In-game |
| A11Y-06 | Mobile leaderboard not keyboard-navigable | Medium | In-game |
| A11Y-07 | "Me" badge visual only | Low | In-game/Results |
| A11Y-08 | Collapsible sections missing aria-controls | Medium | Post-game |
| A11Y-09 | Ordinal rank screen reader confusion | Low | Post-game |
| A11Y-10 | Spectator banner conflicting ARIA | Medium | Spectator |

---

## 7. Recommended Implementation Order

**Sprint 1 — Zero-cost fixes (1–2 days)**
1. REC-08: Join timeout (pure JS, no UI changes)
2. A11Y-01: Fix listbox/option ARIA roles in RoomListView
3. A11Y-10: Fix spectator banner ARIA
4. H5: Move Quick Play toast to i18n key
5. A11Y-02: Pass `t` to PresenceIndicator for tooltip strings
6. A11Y-08: Add `id`/`aria-controls` to results collapsibles

**Sprint 2 — Player lobby + AFK (2–3 days)**
1. REC-01: Player lobby waiting state (requires PlayerView changes)
2. REC-02: AFK self-warning overlay
3. REC-03: Show presence indicators for all players, not just host view

**Sprint 3 — Connection + post-game (2–3 days)**
1. REC-05: Use ConnectionBanner during active game
2. REC-10: Rematch clarity for players
3. REC-06: Spectator upgrade pending state

**Sprint 4 — Enhancements (3–4 days)**
1. REC-04: Mobile chat FAB/drawer
2. REC-07: Game mode badges on room list (requires backend ActiveRoom type change)
3. REC-09: Score delta animation
4. M1: Branded CrazyGames loader

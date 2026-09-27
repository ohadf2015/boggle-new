# Lobby Emotes — Design Spec

**Date:** 2026-06-05
**Status:** Approved (autonomous) → implementation
**Owner:** Ohad

## Problem

Lobby/waiting room is dead air. Players wait for the host to start with nothing to do.
We want players to **express face emotes** (angry, silly, winking, laugh…) that **other
players in the same room see in real time** — party-game energy while waiting.

## Goal

While in the multiplayer lobby (PlayerWaitingView for players, HostPreGameView/PlayerRoster
for the host/TV), a player can tap an emote from a tray. Within ~150 ms every other player
and the host screen sees that player's avatar react: a **floating emoji bubble** pops over
their avatar AND the avatar's **face swaps** to a matching expression for ~2 s, then clears.

Non-goals (YAGNI): in-game emotes (lobby only for v1), emote unlock/economy, custom emotes,
emote history/log, server-side persistence of current emote.

## Key reuse — the avatar mood engine

`fe-next/lib/avatar/avatarMood.ts` already layers a transient expression (eyes/eyebrows/mouth
override + wrapper animation) onto any avatar **without mutating stored parts** — premium parts
snap back when it clears. This is exactly an emote's render mechanism. We **extend** it rather
than build a parallel one.

Grep confirmed `AVATAR_MOODS` is consumed only by the render path (`avatarMood.ts` records,
`useAvatarMood.ts`, `avatarMood.test.ts`) — no exhaustive game switch breaks when we add values.
The two `Record<AvatarMood, …>` tables compile-enforce that every new emote gets an expression
+ duration, so a missed entry is a build error, not a silent bug.

## Emote set (v1 — 7 emotes)

Every emote has BOTH a universally-readable **emoji bubble** (the primary signal — works on
phone and TV regardless of avatar parts) and an **avatar face-swap** (the bonus — all parts
below are real `CustomAvatarConfig` enum members, verified). i18n label per emote ×5 langs.

| id (AvatarMood) | emoji | eyes | eyebrows | mouth | effect | i18n key |
|---|---|---|---|---|---|---|
| `emoteLaugh` | 😂 | happy | raised | grin | pop | `lobby.emote.laugh` |
| `emoteAngry` | 😠 | angry | angry | frown | shake | `lobby.emote.angry` |
| `emoteWink` | 😉 | wink | raised | smirk | pop | `lobby.emote.wink` |
| `emoteSilly` | 😜 | wink | — | tongue | pop | `lobby.emote.silly` |
| `emoteLove` | 😍 | hearts | raised | grin | pulse | `lobby.emote.love` |
| `emoteShock` | 😮 | wide | raised | oh | pop | `lobby.emote.shock` |
| `emoteCool` | 😎 | cool | flat | smirk | pop | `lobby.emote.cool` |

Each emote duration: **1800 ms** (`MOOD_DURATION_MS`). Bubble + face-swap share the lifetime.

## Architecture

### 1. Pure core — extend the mood engine + new emote metadata
- `avatarMood.ts`: add the 7 ids to `AVATAR_MOODS`, their `MOOD_EXPRESSIONS` + `MOOD_DURATION_MS`
  entries. (Compile-enforced; existing `avatarMood.test.ts` loop now also asserts them valid.)
- **New** `fe-next/lib/lobby/lobbyEmotes.ts` (pure, no React):
  - `LOBBY_EMOTES: ReadonlyArray<{ id: LobbyEmoteId; emoji: string; labelKey: string }>`
    — drives the picker tray; subset metadata, decoupled from game moods.
  - `export type LobbyEmoteId = 'emoteLaugh' | … | 'emoteCool'` (each is also a valid `AvatarMood`).
  - `LOBBY_EMOTE_IDS: readonly LobbyEmoteId[]` + `isLobbyEmoteId(x): x is LobbyEmoteId` — used by
    the Zod enum on the server and the receive-side guard on the client.

### 2. Server — pure relay, no persistence
- New handler `lobbyEmote` (extend `backend/handlers/gameLifecycleHandler.ts` or a sibling).
  - Zod payload `{ emote: z.enum(LOBBY_EMOTE_IDS) }` — invalid → typed `VALIDATION_INVALID_PAYLOAD`.
  - **Tight rate limit** (emotes are spam-prone): `5 per 10 s` per socket via `createHandler` option.
  - Resolve sender's username from the socket's game membership; ignore if not in a game/room.
  - Broadcast `lobbyEmoteUpdate` `{ username, emote }` to the room **including the sender**
    (so the sender sees their own reaction; one render path for everyone).
  - **No** `GameUser.currentMood` field. Emotes are ~2 s transient; persisting them creates
    stale-emote-on-reconnect / late-join bugs and buys nothing.

### 3. Client — ephemeral shared hook
- **New** `fe-next/hooks/useLobbyEmotes.ts`:
  - `useLobbyEmotes(socket)` → `{ emotesByUsername: Record<string, { emote: LobbyEmoteId; nonce: number }>, sendEmote(id), cooldownRemaining }`.
  - `sendEmote`: client-side cooldown (~1500 ms, mirrors server limit, disables tray), `socket.emit('lobbyEmote', { emote })`.
  - On `lobbyEmoteUpdate`: validate id, set `emotesByUsername[username] = { emote, nonce: prev+1 }`,
    schedule a clear after `MOOD_DURATION_MS[emote]`. `nonce` forces re-trigger when the same
    emote repeats. Clear all timers on unmount (resource-cleanup rule).
  - Consumed by **both** `PlayerWaitingView` (player) and the host roster path.

### 4. UI
- **Emote tray** (new `fe-next/player/components/lobby/EmoteTray.tsx`, <150 lines): neo-brutalist
  row of 7 emoji buttons under the local player's hero card in `PlayerWaitingView`. Tap → `sendEmote`.
  Cooldown greys the tray briefly. RTL-safe (flex row flips), WCAG: each button `aria-label={t(labelKey)}`,
  keyboard-focusable, 44px min touch target.
- **Reaction render** (new `fe-next/components/avatar/AvatarEmoteBubble.tsx` or inline): over each
  player's avatar in the roster (PlayerWaitingView roster + PlayerRoster), when
  `emotesByUsername[username]` is set:
  - pass `emote` as the avatar `mood` prop (face-swap, reuses existing `Avatar`/`AvatarRenderer`);
  - render a floating emoji bubble (absolute, pops above avatar, `animate-neo-pop`, fades out),
    keyed on `nonce` so repeats re-animate.
- Host TV view (`HostPreGameView` → `PlayerRoster`) consumes the same hook + render so emotes show
  on the party screen.

## Data flow

```
Player A taps 😠 in EmoteTray
  → useLobbyEmotes.sendEmote('emoteAngry')  [cooldown starts]
  → socket.emit('lobbyEmote', { emote:'emoteAngry' })
  → server lobbyEmote handler: validate + rate-limit + resolve username
  → broadcast 'lobbyEmoteUpdate' { username:'A', emote:'emoteAngry' } to room (incl. A)
  → every client's useLobbyEmotes: emotesByUsername['A'] = { emote, nonce++ }, timer 1800ms
  → A's avatar everywhere: face swaps to angry + 😠 bubble pops, clears after 1800ms
```

## Error handling
- Invalid emote id (client or server): rejected by Zod enum / `isLobbyEmoteId` guard — no render.
- Rate-limit exceeded: server drops (standard rate-limit response); client cooldown already prevents
  normal users from hitting it.
- Socket disconnect mid-emote: timers clear on unmount; no persisted state to leak.
- Unknown username in `lobbyEmoteUpdate` (player not in current roster): stored but simply never
  rendered (roster lookup misses) — harmless.

## Testing (TDD, RED first)
- `lobbyEmotes.test.ts`: `LOBBY_EMOTES` shape, every id is a valid `AvatarMood`, `isLobbyEmoteId` guard,
  every emote's face-swap parts are valid enum members, labelKey present.
- `avatarMood.test.ts`: existing all-moods loop now covers the 7 emotes (expression + duration defined).
- `useLobbyEmotes.test.ts`: emit on send, cooldown blocks rapid re-send, receive sets map + nonce bumps,
  auto-clear after duration, timer cleanup on unmount, ignores invalid id.
- Server `lobbyEmote` handler test: valid emote broadcasts `lobbyEmoteUpdate` to room incl. sender,
  invalid payload rejected, rate-limit enforced, no-game socket ignored.
- `EmoteTray.test.tsx`: renders 7 buttons w/ aria-labels, tap calls sendEmote, disabled during cooldown.
- Render test: avatar receives `mood` + bubble appears when `emotesByUsername` set; re-pops on nonce change.
- i18n: 7 keys ×5 languages present (en/he/sv/ja/es), Hebrew RTL tray renders.

## Files touched
- `lib/avatar/avatarMood.ts` (extend) · `lib/lobby/lobbyEmotes.ts` (new)
- `backend/handlers/gameLifecycleHandler.ts` (new handler) + handler test
- `hooks/useLobbyEmotes.ts` (new) + test
- `player/components/lobby/EmoteTray.tsx` (new) + test
- `components/avatar/AvatarEmoteBubble.tsx` (new, or inline) + test
- `player/components/PlayerWaitingView.tsx` (wire tray + reactions)
- `host/components/pre-game/PlayerRoster.tsx` (wire reactions)
- `host/components/HostPreGameView.tsx` (pass hook through)
- `translations/{en,he,sv,ja,es}.js` (7 keys each)

## Risks / notes
- Tray spam on TV/host — host doesn't need a tray (host is the screen); only players get the tray.
- Emoji rendering varies per-OS but is universally legible — acceptable for v1.
- Keep `EmoteTray` + bubble small (<150 lines) per file-size rule.

# Live "Closest Rivals" Desktop Panel — Design Spec

**Date:** 2026-06-05
**Status:** Approved-by-autonomy (no user review gate this session)
**Modes:** MP Classic + MP Blast · **Desktop only**

---

## 1. Goal

During a multiplayer game on desktop, give the player a dedicated on-screen panel
showing a **live leaderboard of the 3 players closest in score to them** —
the rivals they're about to pass or about to be passed by. Updates live as scores
stream in.

- **Classic (desktop):** ADD the panel to the existing desktop shell.
- **Blast (desktop):** ADD the panel AND replace the existing live-score leaderboard
  strip (see Assumption R2).

---

## 2. Loud Assumptions (no user-review gate — flagged for reversibility)

- **R1 — Desktop only.** Renders at `lg`/≥1024px. Mobile layouts unchanged. Lowest-risk,
  matches the user's "in desktop" wording.
- **R2 — "blast existing live score" = the `BlastMPLeaderboard` top-4-by-score strip**
  (`BlastStage.tsx`, the strip below the HUD), NOT the player's own score number in
  `BlastHUD`. On desktop we hide that strip and mount the rivals panel in its place.
  The player's **own HUD score number stays.** Rationale: leaderboard→leaderboard swap
  (same data, same intent); and the rivals panel is anchored on the player so their own
  score stays visible regardless. If the user meant the HUD number, hiding one cell is a
  trivial follow-up. Mobile blast keeps the existing strip (R1).
- **R3 — MP only.** Renders only when there is more than one live player
  (`rows.length > 1` after selection). Solo `/blast` waves (no leaderboard) → not rendered.
- **R4 — No PixiJS in this panel.** Repeated Pixi destroy/null-context crashes in our
  Sentry history + a panel re-rendering ~6.7×/s on the leaderboard throttle is the wrong
  place for a WebGL context. Motion is GSAP/animate-ai only. (Pixi belongs on the board,
  not the leaderboard.) **Told to user.**
- **R5 — "Closest" = smallest `|score − myScore|`.** In a score-sorted list these are the
  player's rank-neighbours. Show **me anchored + up to 3 nearest rivals**, rendered as a
  contiguous standings slice sorted by score desc, each row carrying its **true global
  rank**, a signed delta to me, and a points-to-catch / points-ahead figure.

---

## 3. Architecture

Two chassis read the **same** `useLeaderboard()` Zustand array
(`LeaderboardEntry[] = {username, score, avatar, isHost, wordsFound}`), but identify
"me" differently (classic = `meId`/userId, blast = `username`). So the core is
**identity-agnostic**: caller normalizes + flags `isMe`; the pure selector never knows
about usernames vs ids.

```
┌─ lib/leaderboard/selectClosestRivals.ts  (PURE, TDD-first)
│    in:  RivalInput[]  ( {id, name, score, isMe, avatar?, isHost?, wordsFound?} )
│         n = 3
│    out: ClosestRivalsView | null
│         { rows: RivalRow[], me: RivalRow, total: number }
│         RivalRow extends RivalInput + { rank, deltaToMe, direction }
│
├─ components/game/in-game/ClosestRivalsPanel.tsx  (presentational, impeccable + GSAP)
│    props: { view: ClosestRivalsView | null, variant?: 'classic'|'blast' }
│    renders null when view is null
│
├─ Mount A — classic:  multiplayer/desktop/StandardDesktopAdapter.tsx
│    new optional shell slot `left.rivals` (ShellSlots type + MultiplayerDesktopShell)
│    normalizes `leaderboard` (RosterPlayer[]) + `meId` → RivalInput[]
│
└─ Mount B — blast:    components/blast/legacy/BlastStage.tsx
     right desktop rail (hidden lg:flex); BlastMPLeaderboard strip → lg:hidden (mobile keeps)
     normalizes `leaderboard` (LeaderboardEntry[]) + `username` → RivalInput[]
```

### 3.1 Pure selection — `selectClosestRivals`

Algorithm:
1. Find `me` (the entry with `isMe`). If none → return `null`.
2. Assign **global rank** to every entry: sort by score desc, rank = index+1
   (ties: stable, higher-or-equal keeps earlier rank — deterministic).
3. Compute `|score − myScore|` for every **other** entry; take the `n` smallest.
   Tie-break (equal abs-delta, e.g. +5 vs −5): prefer the rival **ahead** of me
   (so "who I'm chasing" wins the slot), then lower rank number, then `id` for determinism.
4. Display set = the `n` chosen rivals **plus me**; sort the display set by score desc.
5. Each `RivalRow`: `rank` (global), `deltaToMe = score − myScore`
   (`me` row = 0), `direction`: `'ahead'` (rival.score > my.score),
   `'behind'` (<), `'tie'` (=).
6. If after step 4 the display set has `≤ 1` row (only me) → return `null` (R3).

Edge cases (become the test matrix):
- me at top (all rivals behind), me at bottom (all ahead), me in middle (mixed),
  fewer than `n` others, exact ties on score, `n` larger than pool, me-not-found→null,
  single-player→null, two players→one rival + me.

### 3.2 Component — `ClosestRivalsPanel`

Neo-brutalist refined (design-system.md): dark navy panel, `border-neo` + `shadow-hard`,
Fredoka header, Rubik rows. **Pink family** accent (multiplayer). Each row: rank chip +
avatar + name + score (tabular-nums) + delta badge.

- **Me row** pinned/highlighted (cyan ring, "YOU" chip) so the anchor reads instantly.
- **Delta badge:** ahead rivals show `▲ +N` ("catch"), behind show `▼ N` ("lead"),
  RTL-aware (arrow side + chevron flip under `dir="rtl"`).
- **Motion (GSAP via animate-ai patterns, reduced-motion gated):**
  - rank reorder = spring/FLIP slide,
  - score change = brief pop (`scale`),
  - **imminent-pass pulse**: the row adjacent to me with the smallest `|delta|` under a
    threshold (e.g. ≤ a configurable margin) gets a subtle pulsing edge — "about to pass /
    be passed." Gated off under reduced-motion / skip-animations.
- All copy via `t()`. New keys under `mp.rivals.*` in all 5 languages (he/en/sv/ja/es).
- < 300 lines. No Pixi.

---

## 4. Data flow / identity

| Mode    | Source array                     | "me" key            | Normalizer location          |
|---------|----------------------------------|---------------------|------------------------------|
| Classic | `leaderboard: RosterPlayer[]`    | `meId` (userId)     | StandardDesktopAdapter       |
| Blast   | `useLeaderboard()` `LeaderboardEntry[]` | `username`   | BlastStage                   |

Normalizer maps to `RivalInput` and sets `isMe` per the mode's key. Avatar passes through
(`customAvatar` for classic RosterPlayer; `avatar` for blast LeaderboardEntry — the panel's
Avatar usage handles both via the shared `Avatar` component).

---

## 5. Layout safety

- Classic: shell grid is `minmax(200px,1fr)_minmax(500px,720px)_minmax(200px,1fr)`.
  The rivals panel goes in the **left rail** (above the full roster) — no new column,
  no board-track change. Board (center) min track unchanged.
- Blast: panel occupies the existing right desktop rail (`lg:w-56/64`), which currently
  holds only "out of moves / stuck" notices — no board shrink beyond current desktop.
- Both: must fit inside `screen-fit-locked` (no new page scroll); panel is internally
  bounded (`min-h-0`, own overflow if needed). Host spectator view (classic) already shows
  the full leaderboard via the shell roster — the rivals panel is additive and harmless
  there; for a *playing* host it's the same competitive value as a player.

---

## 6. Testing (TDD, project-mandated)

1. **Pure `selectClosestRivals`** — RED first, full edge matrix in §3.1.
2. **Component** — renders rows for a view, highlights me, hides when `view===null`,
   RTL delta direction, reduced-motion path doesn't throw (mock gsap in happy-dom).
3. **Normalizers** (small) — classic meId match, blast username match, avatar passthrough.

`npm run lint && test && build` scoped to changes. Hebrew RTL spot-check. Live verify via
playwriter if an MP session is reachable.

---

## 7. Out of scope (YAGNI)

- Pixi flourish (R4). Mobile layout changes (R1). Solo blast (R3). Wheel-rush / other modes.
- Server/data changes — all data already streams via `updateLeaderboard`.
- Touching `PortraitLayout` (dead path on desktop classic; flag default-on). If the
  `mp.desktop-shell.v1` flag is ever turned off, the classic panel won't show — acceptable,
  documented; can be backfilled later.

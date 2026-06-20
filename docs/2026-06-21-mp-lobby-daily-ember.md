# MP Lobby Daily Ember — ambient daily-challenge cross-promo

**Date:** 2026-06-21
**Goal:** Let multiplayer players know the Daily Challenge exists and that they can get into it — **without interrupting the MP session, annoying them, or making them want to leave the room.**

## Problem

Today the *only* MP→daily nudge is `DailyChallengeInvite` on the **post-game results screen**. PostHog (last 30d): ~162 impressions, **0 dismissals**. So the existing surface is non-intrusive but:
- Fires only at end-of-match.
- Authenticated users only.
- Hard-gated (not-played-today + behavioral pitch).

→ A player can spend an entire MP session never learning the daily exists. The gap is **in-session / top-of-session awareness**.

## Principle: pull, not push

A CTA that navigates to `/daily` mid-session **is** the interruption (ghosts the host/opponent). The sophisticated move is to make the daily a **visible, ambient signal on the player's own identity** in the lobby — curiosity comes from the player, not a banner shoving them out.

### Hard rules (non-negotiable)
1. **No affordance navigates to `/daily` while the player is in a live room.** Awareness only. "Play now" stays post-game (already exists).
2. Lobby (waiting room) surface **only**. No in-game (interrupt), no results (already handled), no between-rounds (`NextModeTease` competes with next-match hype).
3. Ambient + persistent, **not** a popup. No auto-show modal. The badge just *is there*; deeper info only on explicit tap.
4. Frontend-only. No new socket traffic, no backend, no migration.

## Feature: "Streak Ember"

A small flame/ember chip on the **current player's own avatar** in the lobby roster, driven by the existing `useDailyChallengeStatus(language)` hook (server for authed, localStorage for guests).

### States (`selectLobbyEmberState`)
| status | ember kind | visual | meaning |
|---|---|---|---|
| `hasPlayed && currentStreak>0` | `secured` | ✓🔥 N, calm glow | "Today's daily locked in, streak N" |
| `!hasPlayed && currentStreak>0` | `at_risk` | 🔥 N, gentle pulse | "Streak N — don't let it lapse" |
| `!hasPlayed && currentStreak===0` | `invite` | dim ember, soft pulse | "Daily Challenge is live" (awareness) |
| loading / daily unavailable for locale | `hidden` | — | render nothing |

> `secured` deliberately *also* shows (quiet) — it's identity/pride, reinforces the habit. Only `loading`/unavailable hides.

### Interaction
- Tap → **non-blocking popover** anchored to the ember. One line of context + reassurance ("Daily resets every midnight — it'll be waiting after your match"). **No navigation button.** A `✓ Got it` dismiss only.
- Popover is the *only* interactive part; the badge alone is the awareness.

### Why own-chip only (v1)
Roster broadcast carries no per-player daily data, so a client can only enrich its own chip. Showing *other* players' flames ("rival cleared today's daily") is a compelling **phase 2** but needs the daily field plumbed into the `updateUsers` broadcast — out of scope here.

## Telemetry
- `growth:lobby_daily_ember_shown` { kind, streak } — impression (once per lobby mount).
- `growth:lobby_daily_ember_tapped` { kind, streak } — popover open.
- (No CTA-click event — there is no CTA by design.)

These let us later answer: does ambient awareness lift organic daily entries (compare daily starts with referrer/timing) and is phase-2 (others' flames) worth the backend cost.

## i18n
New keys under `lobbyDailyEmber.*` (en/he/sv/ja/es), native-written (not literal). Keys: `secured`, `atRisk`, `invite` (short badge labels if any), `popoverTitle`, `popoverBody`, `gotIt`. RTL-safe (Hebrew).

## Files (as built)
- `lib/growth/lobbyDailyEmber.ts` — pure `selectLobbyEmberState(status)` → `{ kind, streak }`. TDD (7 tests).
- `components/lobby/LobbyDailyEmber.tsx` — badge + tap popover, neo-brutalist tokens (neo-orange streak semantic), RTL-safe (logical `start-*`). 8 component tests.
- `player/components/PlayerWaitingView.tsx` — mounted via `renderDailyEmber()` as a **sibling between the hero card and the roster**, in BOTH the mobile and desktop layouts.
- `translations/{en,he,sv,ja,es}.js` — `lobbyDailyEmber.*`, native (ux-writer).

> **Placement note:** the ember is a sibling of the hero card, NOT nested inside it. The hero card wrapper is `overflow-hidden` (clips its gradient bar); nesting the downward-opening popover there would clip it. Sibling placement keeps it in the personal zone while letting the popover render fully.

## Known gaps (intentional, v1)
- **Host doesn't see the ember.** The host uses `HostView`, not `PlayerWaitingView`. Joiners outnumber hosts and the host is the least-idle actor (they start the match), so v1 covers joining players only. Adding a host surface is a small follow-up.
- **No clean conversion attribution.** By design there is no nav out of the room, so there is no `?from=mp_lobby` click to attribute a daily-start to. We measure *awareness* (`_shown` / `_tapped`) and can only *infer* MP→daily lift from aggregate daily-start correlation — not a per-user funnel. This is inherent to the no-push constraint, not a defect.

## Out of scope / deferred
- Others'-players' streak flames (needs backend broadcast field) — **phase 2**.
- "Remind me after this match" intent-capture loop — separate system; awareness layer first.
- Between-rounds / sticky-bar nudges.

## Acceptance
- Lobby shows ember on own chip per state table; hidden when loading/unavailable.
- Tap opens info popover; **no path leaves the room**.
- Works for guest (localStorage) and authed (server) players.
- i18n ×5 native, Hebrew RTL correct.
- `selectLobbyEmberState` unit-tested (RED→GREEN). tsc/lint/build clean.

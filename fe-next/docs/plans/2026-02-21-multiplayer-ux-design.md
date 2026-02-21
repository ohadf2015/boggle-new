# Multiplayer UX Overhaul — Design Document

**Date:** 2026-02-21
**Scope:** Fix double-scroll bugs and UX hierarchy across all 4 multiplayer screens
**Approach:** B — Bug fixes + UX hierarchy improvements

---

## Root Cause: The h-dvh Anti-Pattern

`PageClient.tsx` (line 743) establishes the outer scroll boundary:
```
h-dvh flex flex-col min-h-0 w-full overflow-hidden
```

All child views **must not** claim their own `h-dvh`. They should use `flex-1 flex flex-col min-h-0` to inherit height from the parent. Currently, all 4 subviews set their own `h-dvh`, fighting the parent constraint and causing double-height on mobile (especially problematic with `AutoHideHeader`).

---

## Changes by File

### 1. `components/multiplayer/RoomListView.tsx`

**Bugs:**
- Line 71: outer div has `overflow-y-auto` AND line 111 inner div also has `overflow-y-auto` → double scroll
- "Friend Activity" section is permanently empty UI, occupies ~30% vertical before Active Battles

**Fixes:**
- Remove `overflow-y-auto` from outer container (line 71) — inner div (line 111) is the sole scroll boundary
- Remove the entire "Friend Activity" section (lines 159–188)
- Active Battles empty state: upgrade CTA to open Create Room modal directly

### 2. `player/components/PlayerWaitingView.tsx`

**Bug:**
- Line 190: `h-dvh flex flex-col` → fights parent `h-dvh overflow-hidden`

**Fix:**
- Change root div to `flex-1 flex flex-col min-h-0 bg-neo-navy lg:max-w-7xl lg:mx-auto`
- Mobile content div `lg:hidden h-full` → `lg:hidden flex flex-col flex-1 min-h-0`

### 3. `host/components/HostPreGameView.tsx`

**Bugs:**
- Chat fixed at `h-72` (288px) dominates small-phone screens
- Host avatar has no "you" ring (player view has it)
- "Battle Feed" label is confusing jargon
- TV Mode toggle buried in Advanced Settings accordion

**Fixes:**
- Chat container: `h-72` → `min-h-48 flex-1` (fills available space naturally)
- Add `isMe` detection for host's own username in `renderPlayerRoster()` — apply `ring-2 ring-neo-lime ring-offset-2 ring-offset-neo-navy` matching PlayerWaitingView
- Rename "Battle Feed" → use `t('hostView.roomChat')` translation key (add translations)
- TV Mode: extract from advanced accordion, add as a visible toggle row in the main Battle Mode card (before Advanced Settings)

### 4. `player/components/PlayerInGameView.tsx`

**Bug:**
- Line 206: `h-dvh overflow-hidden` → fights parent constraint
- Line 191: `min-h-dvh` on tournament standings inner view

**Fix:**
- Line 206: `h-dvh overflow-hidden` → `flex-1 flex flex-col min-h-0 overflow-hidden`
- Line 191: `min-h-dvh` → `flex-1 flex flex-col min-h-0`

### 5. `components/views/ResultsPage.tsx`

**Bug:**
- Line 380: `min-h-dvh flex flex-col` → fights parent constraint

**Fix:**
- `min-h-dvh` → `flex-1 flex flex-col min-h-0`

---

## Translations Required

Add to all 4 language files (`en`, `he`, `sv`, `ja`):
- `hostView.roomChat` — replaces "Battle Feed" label

---

## Testing Checklist

- [ ] Lobby: no double scrollbar on mobile (iOS Safari)
- [ ] Lobby: Active Battles visible without scrolling
- [ ] Lobby: Friend Activity section gone
- [ ] Host pre-game: chat fills available space on small phones
- [ ] Host pre-game: host avatar has lime ring
- [ ] Host pre-game: TV Mode visible without expanding Advanced Settings
- [ ] Player pre-game: no `h-dvh` overflow issue on mobile
- [ ] Player in-game: no layout overflow
- [ ] Results: no layout overflow
- [ ] RTL (Hebrew): all fixes respect `dir={dir}`
- [ ] All translations: `hostView.roomChat` key present in all 4 languages

---

## Files Changed

1. `fe-next/components/multiplayer/RoomListView.tsx`
2. `fe-next/player/components/PlayerWaitingView.tsx`
3. `fe-next/host/components/HostPreGameView.tsx`
4. `fe-next/player/components/PlayerInGameView.tsx`
5. `fe-next/components/views/ResultsPage.tsx`
6. `fe-next/translations/en.json` (+ he, sv, ja)

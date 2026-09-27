# CrazyGames Lobby Diet — Design

**Date:** 2026-05-01
**Scope:** Subsystem A only (lobby first-paint diet for CrazyGames players). Subsystem B (Supabase identity) and streak/return-reward subsystems explicitly out of scope.
**Surface:** `/[locale]/multiplayer` route, CrazyGames embed only.

## Problem

CrazyGames players who return to `/multiplayer` after the first session land on the full lobby chrome — `SeasonBanner` + admin Ranked button + `RoomListView` (rooms list + Create + Quick Play + refresh) + a 10s retry banner + two modals primed to mount. The first-session auto-join in `MultiplayerFlow.tsx:348-389` masks this on visit 1 (player is bounced into a game), but breaks once `sessionStorage['boggle_cg_auto_joined']` is set. Net effect: CG players see a noisy lobby exactly when they're most likely to bounce.

Existing `CrazyGamesWelcome.tsx` only renders at root `/[locale]` and only fires once ever per device (gated by `lexiclash_onboarding_completed` localStorage). It never reappears on `/multiplayer`.

## Goal

Replace the noisy lobby init with a single welcoming hero card + one big Quick Play CTA. Keep first-session auto-join unchanged. Move existing lobby chrome behind a "Browse rooms" disclosure.

## Non-goals

- Persistent CG identity (no Supabase schema changes).
- Streak counters, return rewards, or any retention metric tied to a per-user counter.
- Changes to first-session auto-join behavior.
- Changes to non-CG players' lobby experience.
- Changes to `CrazyGamesWelcome.tsx` (root-route welcome stays as-is).

## Architecture

Two-file change — one new component, one edit.

### New: `components/multiplayer/CgLobbyHero.tsx`

A neo-brutalist hero card rendered above the room list when:
- `isOnCrazyGamesPlatform === true`, AND
- the CG smart auto-join effect is not currently in flight (`!quickPlayHandledRef.current && !cgAutoJoinHandledRef.current` — or, more cleanly, derive from a single boolean prop passed down from `MultiplayerFlow`).

Visual direction: **Comic Panel Cover** (per design exploration 2026-05-01).

**Variants:**

| Variant | Trigger | Mascot | Speech bubble copy | Sub copy |
|---|---|---|---|---|
| first-timer | `cgUser === null` AND `localStorage['lexiclash_cg_seen']` not set | `play.webp` | `t('cg.hero.firstGreeting')` → "WELCOME TO LEXICLASH!" | `t('cg.hero.firstSub')` → "Find words. Beat the clock." |
| returning (named) | `cgUser !== null` (CG signed-in player) | `waving.webp` | `t('cg.hero.welcomeBack', { name })` → "WELCOME BACK, {NAME}!" | `t('cg.hero.returnSub')` → "Quick word battle?" |
| returning (anon) | `cgUser === null` AND `localStorage['lexiclash_cg_seen'] === '1'` | `waving.webp` | `t('cg.hero.welcomeBackAnon')` → "WELCOME BACK!" | `t('cg.hero.returnSub')` → "Quick word battle?" |

**Layout (Comic Panel Cover):**

- Outer panel: `bg-neo-navy-light border-neo-thick border-black rounded-neo shadow-hard-lg`. Halftone dot pattern overlay (CSS, ~6% opacity).
- Two corner staples (top-left, top-right) — `8px × 4px` black rectangles, rotated 12° / -12°, positioned with `transform-origin: center`.
- Mascot inset: right ~55% on desktop, full-width-stacked on mobile. Neo-brutalist plinth (matches `CrazyGamesWelcome` plinth pattern). Mascot float animation 1.5s ease-in-out infinite, gated by `prefers-reduced-motion`.
- Speech bubble: tail anchored to mascot's mouth area. Three bubble shapes provided as inline SVG, picked by string length (≤16 / ≤32 / >32 chars after `t()` resolution). White fill, 3px black stroke, screen-tone dot pattern fill at 8% opacity.
- Action burst: 8-pointed yellow zigzag star (`neo-yellow` per semantic accent — celebratory) behind the PLAY CTA. ~140% the CTA's bounding box. SVG, hard black stroke.
- Primary CTA: `bg-neo-lime text-black border-neo-thick shadow-hard-lg` button, label `t('cg.hero.playCta')` → "PLAY NOW", ▶ icon, "GO!" microcopy floating ~6° tilted on the burst's upper-right point.
- Disclosure: text button below CTA, `t('cg.hero.browseRooms')` → "Or browse rooms ↓". Toggles a local `isExpanded` boolean. State lives in `MultiplayerFlow` via `useState(false)`, resets on each lobby mount (no localStorage persistence).

**Accessibility:**
- Hero is a `<section aria-label={t('cg.hero.aria.section')}>`.
- Speech bubble copy lives in normal flow text (not `aria-hidden` on the SVG); SVG bubble shape is decorative (`aria-hidden`).
- Disclosure button uses `aria-expanded` + `aria-controls` pointing at the rooms region's id.
- Mascot `<img>` has empty `alt=""` (decorative — copy carries the meaning).
- Action burst SVG `aria-hidden`.
- Reduced-motion: kill mascot float, kill burst pulse if present, kill bubble entrance animation. Static end-state remains.
- RTL: greeting + sub flip reading direction; speech bubble tail mirrors via `transform: scaleX(-1)` on the tail SVG only (text inside bubble unflipped); staples stay in the same physical corners (decoration, not directional); CTA chevron flips ▶ → ◀.

### Edit: `components/multiplayer/MultiplayerFlow.tsx`

**Conditional render:**

```
if (isOnCrazyGamesPlatform && !isClassroomMode):
  render <CgLobbyHero variant=... onPlay={handleQuickPlay} onBrowse={toggleExpanded} />
  if isExpanded:
    render <SeasonBanner />, admin button, <RoomListView ... />
  else:
    render nothing else (modals + matchmaking overlay still mount, but rooms collapsed)
else:
  existing lobby render path unchanged
```

**Auto-join interaction:**
- First-session auto-join effect (`MultiplayerFlow.tsx:348-389`) unchanged.
- **Hero render is suppressed during the auto-join window**: while `isOnCrazyGamesPlatform && !sessionStorage['boggle_cg_auto_joined'] && !cgAutoJoinHandledRef.current`, render a minimal loading placeholder (existing `roomsLoading` skeleton is fine) instead of the hero. Otherwise the hero would flash for ~500-1500ms before the auto-join navigates away.
- After auto-join fires once (sessionStorage flag set) OR auto-join is intentionally skipped (invite link, classroom, autoCreate), subsequent `/multiplayer` visits show the hero.
- The hero's PLAY CTA calls `handleQuickPlay` directly — same code path as the existing Quick Play in `RoomListView`.

**localStorage `lexiclash_cg_seen`:**
- Set to `'1'` on the **first** mount of `CgLobbyHero` *after* the user takes any action on it (Play, Browse). Not set on hero mount alone (would mark every visitor as "returning" too eagerly).
- Read once on hero mount via `useState` initializer to compute initial variant. No reactivity needed — variant only matters at first paint.
- Wrapped in try/catch — storage may be blocked in some embed contexts.

## Data flow

```
MultiplayerFlow render
  ├→ isOnCrazyGamesPlatform? (from useCrazyGames)
  │   └→ no → existing path, exit
  ├→ isClassroomMode? → existing classroom-loader render
  ├→ get cgUser from useCrazyGames().getUser() (already cached by provider)
  ├→ read localStorage['lexiclash_cg_seen']
  ├→ compute variant: first-timer | returning-named | returning-anon
  ├→ render <CgLobbyHero variant={v} cgUser={cgUser} onPlay={handleQuickPlay} />
  └→ render expandable rooms region (collapsed by default)

CgLobbyHero
  ├→ on PLAY tap:
  │   ├→ trackGrowthEvent('cg_lobby_hero_play', { variant })
  │   ├→ localStorage['lexiclash_cg_seen'] = '1'
  │   └→ props.onPlay()
  └→ on BROWSE tap:
      ├→ trackGrowthEvent('cg_lobby_hero_browse', { variant })
      ├→ localStorage['lexiclash_cg_seen'] = '1'
      └→ props.onExpand()
```

## Strings

All keys under `cg.hero.*` namespace. Required across en, he, sv, ja, es:

- `cg.hero.firstGreeting` — "WELCOME TO LEXICLASH!"
- `cg.hero.firstSub` — "Find words. Beat the clock."
- `cg.hero.welcomeBack` — "WELCOME BACK, {name}!" (interpolation via t-fn second arg, NOT manual `.replace`)
- `cg.hero.welcomeBackAnon` — "WELCOME BACK!"
- `cg.hero.returnSub` — "Quick word battle?"
- `cg.hero.playCta` — "PLAY NOW"
- `cg.hero.playMicrocopy` — "GO!"
- `cg.hero.browseRooms` — "Or browse rooms ↓"
- `cg.hero.aria.section` — "CrazyGames welcome"

Per project memory rule: ship he-IL strings even if imperfect; flag "needs native review" in commit body.

## Analytics

New events (added to existing `growthTracking.ts`):

- `cg_lobby_hero_view` — fires on hero mount with `{ variant: 'first-timer' | 'returning-named' | 'returning-anon' }`.
- `cg_lobby_hero_play` — fires on PLAY tap with `{ variant }`.
- `cg_lobby_hero_browse` — fires on Browse-rooms tap with `{ variant }`.

Existing `cg_lobby_arrival` event (decision = auto_join_room | quick_play) stays as-is — it fires from the auto-join effect, not the hero.

## Failure modes

| Failure | Behavior |
|---|---|
| `useCrazyGames().getUser()` throws | Treat as `cgUser === null`. Variant resolves via localStorage. |
| `localStorage` access blocked | `lexiclash_cg_seen` read returns null. Variant defaults to first-timer. Acceptable degradation. |
| Mascot asset 404 | `<img>` shows alt-empty (decorative). Layout intact via reserved aspect-ratio box. |
| `t()` returns key fallback | Existing `i18n/normalizeMessages.ts` pipeline handles. Per memory: never use `.replace('{{var}}', val)` — use `t(key, { var: val })`. |
| Speech bubble overflow (locale length) | Three pre-defined bubble shapes by char length. If string still overflows, bubble auto-grows vertically; CSS clamps max-height with ellipsis fallback. |

## Testing

Per project TDD rules — RED first.

**Unit (Vitest, frontend):**
- `CgLobbyHero.test.tsx`:
  - renders first-timer copy when `cgUser=null` and seen-flag absent
  - renders returning-named copy when `cgUser={username}`
  - renders returning-anon copy when `cgUser=null` and seen-flag present
  - calls `onPlay` and sets seen-flag on PLAY click
  - calls `onExpand` and sets seen-flag on Browse click
  - emits `cg_lobby_hero_view` on mount with correct variant
  - emits `cg_lobby_hero_play` / `cg_lobby_hero_browse` on respective clicks
  - falls back to first-timer when `localStorage` access throws
  - skips mascot float animation when `prefers-reduced-motion: reduce`
  - mirrors speech bubble tail in RTL (`dir='rtl'`)
  - selects bubble shape by string length (≤16 / ≤32 / >32)

**Integration (MultiplayerFlow):**
- `MultiplayerFlow.test.tsx` (extend existing):
  - renders `CgLobbyHero` when `isOnCrazyGamesPlatform=true` and not classroom
  - does NOT render hero when `isOnCrazyGamesPlatform=false`
  - hides `RoomListView` when hero collapsed
  - shows `RoomListView` when hero expanded
  - hides `SeasonBanner` and admin Ranked button when hero collapsed
  - first-session auto-join still fires (regression guard)

**Snapshot/visual:** none (project uses RTL/Hebrew testing live, not snapshots).

**Manual verification:**
- `?cg=1` query override → see hero on `/multiplayer` after first auto-join completes.
- `?locale=he` → RTL flip, mascot stays right-positioned per CSS, copy reads RTL.
- DevTools → simulate `prefers-reduced-motion: reduce` → no float.

## File line-count discipline

- `CgLobbyHero.tsx` target: ≤250 lines (well under 500-line cap). If bubble SVGs balloon, extract to `components/multiplayer/CgLobbyHero/SpeechBubble.tsx` and `ActionBurst.tsx`.
- `MultiplayerFlow.tsx` already at ~493 lines. Hero render block + variant-derivation adds ~30 lines. Will cross 500. **Extract** the variant-derivation logic to a tiny `hooks/useCgLobbyHeroVariant.ts` (~25 lines, computed once on mount, no reactivity to mid-session state changes) to keep `MultiplayerFlow.tsx` under cap.

## Out-of-scope (future work)

- Persistent CG identity → Supabase profile (deferred; revisit when a feature actually needs cross-session state).
- Streak counters / return rewards (deferred).
- A/B test on hero vs no-hero (can wire later via existing `useExperiment` hook + PostHog flag).
- "Generated images" — could add per-locale or per-mode poster variants behind the speech bubble in a follow-up sprint.

## Open questions

None. All decisions made.

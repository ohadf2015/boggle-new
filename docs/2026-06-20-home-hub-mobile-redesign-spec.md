# Home Hub — Mobile Landing Redesign (spec)

Date: 2026-06-20
Source: `Downloads/Screen improvements request.zip` → `design_handoff_home_hub/` (high-fidelity `.dc.html` + README).

## Goal
Reorganize the **signed-in mobile** landing/play surface (`LandingView`) into a focused arcade home:
top bar (avatar+level ring+streak+coins) · promoted Daily hero · section header w/ live count ·
mode bento with a wide Multiplayer Arena anchor on top · More-Modes row · 4-stat social strip ·
Your Rank card. Desktop landing is **unchanged**. Layout/hierarchy change only — reuses the same
gated mode list and data hooks. No new global state.

## Hard constraints (verified in codebase)
1. **CSS-gate, never JS-branch.** Mobile hub = `md:hidden`; desktop tree = `hidden md:block`.
   `useMobilePortrait()` is `false` on server+first-paint → branching trees on it = hydration CLS
   (the real→skeleton→real flash already fixed once). Mirror the existing `md:hidden` leaderboard.
2. **SEO/Blog stay unconditional.** `LandingSEOSection` + `LandingBlogSection` render outside the
   mobile/desktop split so a JS-rendering Googlebot on a mobile viewport still receives them.
3. **No new bottom nav.** `GlobalBottomNav` already mounted app-wide (`[locale]/layout.tsx`),
   already publishes `--bottom-nav-height`. Hub just adds bottom padding consuming that var
   (`.page-content-safe` / `pb-[calc(...var(--bottom-nav-height)...)]`). README block #8 = already shipped.
4. **Tokens only** — no inline hex. `bg-neo-navy(-light)`, `text-neo-cream`, `neo-{lime,pink,cyan,purple,orange}`,
   `shadow-hard{,-sm,-lg,-pressed}`, colored `shadow-hard-*`, `rounded-neo-{lg,xl,pill}`, `border-3`
   (NOTE: `border-neo-thick` is NOT a real class — use `border-3`), `font-neo-display` / `font-neo-body`.
   `shadow-hard*` auto-flip in RTL via the `[dir=rtl]` plugin; arrows swap by `dir`.
5. **Reuse the gated model list** (`LandingChallengeCards` → `MODE_META`); don't copy gating
   (newcomer split, offline lock, `JA_HIDDEN_MODES`, admin modes).

## Architecture
- **NEW** `components/landing/HomeHub.tsx` — mobile composition. Receives props LandingView already
  computes (profile, stats, daily, live, language). Renders: `HomeTopBar` → `LandingChallengeCards layout="hub"`
  (daily hero + section header + arena-anchor-on-top bento + more-modes) → `HomeSocialStrip` → `HomeRankCard`.
  Bottom padding for GlobalBottomNav.
- **NEW** `components/landing/HomeTopBar.tsx` — avatar w/ conic level ring + level badge, greeting,
  streak pill, coins pill. Data: `profile`, daily streak, `profile.total_coins`.
- **NEW** `components/landing/HomeDailyHero.tsx` — rich daily banner (cyan pill+ping, title, puzzle#/resets,
  5-cell streak strip, Play pill). Consumes `useDailyChallengeStats(preloadedStats)`. Replaces
  `DailyChallengeCube` as the `dailyNode` when `layout==='hub'`.
- **NEW** `components/landing/HomeSocialStrip.tsx` — 4-col stat grid (Online / Games today / Modes / Languages).
- **NEW** `components/landing/HomeRankCard.tsx` — RANK #, up-delta (omit if unknown), level/league label,
  striped XP progress bar, "Best word today". Real data; gracefully degrade missing pieces.
- **NEW** `lib/landing/homeHubFormat.ts` — pure helpers (TDD target):
  - `formatLiveShort(n)` → `1240→"1.2k"`, `980→"980"`, `12000→"12k"`.
  - `levelRingGradient(pct)` / `clampPercent` → conic ring fill %.
  - `streakStripCells(streak, total=5)` → boolean[] filled cells.
  - `xpProgress({ totalXp, level })` → `{ pct, toNext }`.
  - `rtlArrowFlip(dir)` helper or rely on existing `Cube` pattern.
- **MODIFY** `components/landing/LandingModeCubes.tsx` — add `layout?: 'bento' | 'hub'` (default `'bento'`).
  Hub: anchor always full-width tall hero on top (`col-span-2 min-h-[196px]`), then rest `grid-cols-2`,
  section header gains a live-online pill (`liveCount` prop), more-modes `<details>` reused.
- **MODIFY** `components/landing/LandingChallengeCards.tsx` — accept `layout` prop, forward to LandingModeCubes;
  when hub, build `dailyNode = <HomeDailyHero/>`. Pass `liveCount=activePlayers`.
- **MODIFY** `components/landing/LandingView.tsx` — wrap existing main content `hidden md:block`,
  mount `<HomeHub className="md:hidden" .../>`, keep SEO/Blog shared/unconditional.

## i18n
New keys under `landing.home.*` (all 5 locales en/he/sv/ja/es), native — not literal:
`greeting` ("Hey, {name}"), `levelTitle` ("Level {n} · {rank}"), `online` ("{n} online"),
`gameModes`, `startHere`, `playingNow` ("{n} playing now"), `moreModes`, `moreModesHint`,
`play`, `dailyChallenge`, `dayStreak` ("{n}-day streak"), `resetsIn` ("resets in {h}h"),
`puzzleNo` ("Puzzle #{n}"), `online_label`/`gamesToday`/`modes`/`languages` (strip labels),
`rank`, `league`, `xpToNext` ("{n} XP to {tier}"), `bestWordToday`.
Reuse existing `landing.*` where present.

## TDD
- Pure logic in `homeHubFormat.ts` → vitest first (RED), implement (GREEN).
- `LandingModeCubes` hub layout → render test (anchor full-width on top, 6 cubes, more-modes present).
- Component smoke tests for HomeTopBar/HomeRankCard data fallbacks (no "Level undefined" / "0 coins").

## Verify
- `npm run lint && npm run test && npm run build`.
- Browser screenshot at 390×844 (`?locale=en` and `?locale=he` for RTL) vs mock.
- Eyeball with a real authed profile — coins/level/streak/best-word populate (advisor flag).

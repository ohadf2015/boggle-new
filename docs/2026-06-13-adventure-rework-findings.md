# Adventure Mode Rework — Findings & Backlog (2026-06-13)

Goal: rework adventure — puzzles, HUD, shared logic, music, atmosphere, boss
fights, shop/upgrades, level-select; "make it feel like a real game."

Approach: walked the mode in real Chrome (Playwriter) before touching code, per
`/impeccable` + advisor. That walk changed the diagnosis twice — see "Corrections".

## Shipped this session (3 commits, all TDD + browser-verified)

1. **`58cea015d` — mascot import-cycle crash (HIGH).** Entering ANY level fired the
   AdventureGame ErrorBoundary ("Something went wrong"). Root cause: `InteractiveMascot.tsx`
   + `mascotUtils.ts` imported runtime helpers (`getMascotImagePath` etc.) *through* the
   heavy `Mascot.tsx` component, which only re-exports them from the leaf `mascotData.ts`.
   That runtime module edge evaluated before `Mascot.tsx`'s factory registered under
   code-splitting → Turbopack "module factory is not available". Fixed by importing from
   the leaf; type-only imports stay on `Mascot`. Guard: `mascot-import-cycle.test.ts`.
   Reproduced deterministically on a fresh `.next` (not a stale-cache artifact).

2. **`58cea015d` — doubled adventure music.** `useAdventureMusic`'s playing-state effect
   early-returned on `!enabled`, skipping its own suspend branch, so AdventureView's ambient
   hook never paused when AdventureGame's in-game hook started → layered audio. Gate the
   play branch on `enabled`; let suspend run on disable. TDD in `useAdventureMusic.ambient.test.ts`.

3. **`1606c83f0` — tactile neo tiles.** Standard tile had been flattened ("airy":
   `border-black/20` + faint 1px shadow) → wireframe board. Restored brand depth: 2px neo
   border + `shadow-hard` + press sinks into shadow (`active:translate-y-px`
   + `shadow-hard-pressed`). Palette-independent (helps dark + Cosy). 78 tile/grid tests green.

4. **`43c6d2f48` — fuller upgrade shop.** The shop only rendered upgrades unlocked at the
   current world, so a new player opened a near-empty modal (world 1 = one Excavation item)
   and the Mastery tab was hidden. Now all upgrades render; locked ones show greyed,
   non-purchasable "Unlocks at World N" teasers; all 4 category tabs always show; buyable
   sorts to top. i18n ×5 (`adventure.upgrades.locked`/`.unlocksAtWorld`). 15 tests + browser-verified.

## Corrections (important for whoever continues)

- **The "washed-out parchment / low-contrast HUD / off-brand pale world map" I first saw was
  Cosy/Calm accessibility mode** (`html[data-cosy='true']`, `globals.css:4025`), ON in the
  test browser — NOT adventure drifting off-brand. It's an AA-contrast-locked intentional
  theme (`lib/cosy/__tests__/calmPalette.contract.test.ts`). In the **default dark theme**
  the HUD is dark, readable, well-contrasted and the board looks good. Do NOT "fix contrast"
  by editing components or the cosy palette without re-checking against the contract test.
- The warm per-world palette (`lib/adventure/colors.ts`, 10 world themes, hand-painted
  backdrops) is intentional. Keep it. Apply brand *craft* (depth/tactility), not navy re-skin.
- **Level select, HUD, and board all look GOOD in the default dark theme** — RPG
  trading-card level nodes (`RPGLevelCard`: number, stars, lock, reward tokens, boss card),
  dark readable HUD, atmospheric forest map. The "empty pills / washed HUD" were Cosy-mode
  flattening, not real defects. Verified after forcing `boggle_accessibility_settings.cosyMode=false`.
- **Real candidate (separate target):** in Cosy/Calm mode the game's richness (tactile tiles,
  card depth, accents) is flattened to near-borderless pale pills, so adventure looks bland
  *specifically in Cosy*. If the user runs Cosy, that's likely their actual experience and the
  highest-leverage visual fix — but must respect `calmPalette.contract.test.ts` (AA-locked).

## Backlog — not done (needs a focused, dedicated slice)

- **Boss fight (top ask, "look good / feel like a boss") — GENUINELY BLOCKED.** Gated at
  level 7. Confirmed unreachable in a guest session: `/api/adventure/complete` returns **401**
  (progress requires a logged-in account), `/adventure/boss-rush` is locked until all bosses
  beaten, and the Playwriter Chrome is a guest (signup modal shown). Reaching a boss needs
  either logging into the real account + completing 6 levels (alters the user's real progress/
  leaderboard — declined without explicit OK) or a DB seed of a test account. Improving it
  blind = guessing (advisor: don't fix look/feel without looking). Next session with a logged-in
  test account: complete world-1 L1–6 (or seed), screenshot `BossOverlay`/`SegmentedHPBar`/
  `BossArena`/entrance+defeat cinematics, THEN improve. (My tile-tactility fix already improves
  the boss board, since bosses reuse the same grid/tiles.)
- **Level selection "real game feel."** Locked level cards render as thin empty pills —
  assess in dark theme, give them number/lock/stars + neo tactility.
- **Shop & upgrades depth** (`upgradeConfig.ts`, `AdventureShopFAB`, `AdventureViewModals`).
  Not yet opened/reviewed.
- **More atmosphere/juice on the board** (`AdventureEffectsCanvas`, `/pixijs-2d`): word-submit
  payoff, ambient particles per world theme.
- **Dead code:** `components/adventure/v2/*` (~2000 LOC Pixi battle scene) is unimported.
  Decide: mine for boss rendering or prune. Relevant to "use more shared logic" + better graphics.

## Verification notes
- Dev server: `npm run dev` → port **3001** (custom Express server.ts).
- Cosy mode was toggled off then **restored to `true`** in the test browser (user's setting).

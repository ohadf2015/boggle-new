# Adventure UI + Atmosphere + Gameplay-Clarity Glow-Up

**Date:** 2026-06-21
**Goal:** improve adventure UI, atmosphere, gameplay — visualized in Claude Design first.

## Diagnosis
Adventure mode is functionally complete + well-structured, but has a **visual tone mismatch**:
- **Intended:** hard neo-brutalist (dark navy, electric lime/pink/cyan/purple, 2px hard pixel shadows, geometric punch).
- **Actual:** softer/atmospheric — 20px blur glows (`colors.ts:36-120`), gradient vignettes + haze (`GameplayBackground.tsx WORLD_ATMOSPHERES`), raw Tailwind pastels.

## Direction (the spine)
**Harden the chrome, enrich the world graphically.** Two layers, two rules:
- **UI chrome** (HUD, score, objective chips, buttons, cards, modals, boss telegraph) → hard neo-brutalist: solid borders, `shadow-hard` (2px black, NO blur), electric mode accents.
- **Atmosphere layer** (world backgrounds, particles, boss arenas) → improve mood via **brand-native technique**, NOT soft blur (banned) and NOT bare navy (kills mood): flat bold color fields, crisp halftone/texture, defined particle sprites, hard-edged graphic depth, strong per-world color identity.

"Gameplay" (static mockups can't show mechanics) = **gameplay-clarity UI**: objective readability, feedback juice, HUD hierarchy, telegraph readability.

## Scope (4 surfaces, NOT 262)
1. **WorldMap** — hub / first impression / most atmosphere
2. **LevelGrid** — level select
3. **In-game** — GameplayBackground + GameHeader/HUD + juice (combo/score)
4. **Boss fight** — the climax (telegraph, HP, parry clarity)

Do NOT touch all 10 world themes or ~30 modals. Mock representative surfaces; let tokens propagate.

## Real tokens (ground truth)
- Colors: neo-lime #BFFF00, neo-pink #FF1493, neo-cyan #00FFFF, neo-purple #8B5CF6, neo-navy #1a1a2e, neo-navy-light #16213e, neo-cream #FFFEF0, neo-yellow #FFE135 (celebration/gold ONLY), neo-orange #FF6B35 (streak/urgency ONLY).
- Shadows: `shadow-hard` = 2px 2px 0 black (NO blur). RTL auto-flips.
- Borders: `border-neo` (2px), `border-neo-thick` (3px), `rounded-neo` (8px).
- Fonts: Fredoka (display), Rubik (body).
- Texture: `texture-halftone`.

## Files to change (implementation)
- `lib/adventure/colors.ts` — replace 20px blur glows with hard-edged colored shadows + align RGBA to neo palette.
- `components/adventure/themed/GameplayBackground.tsx` — replace haze/vignette with graphic bold flat fields + crisp depth (keep CSS-only, perf-safe).
- `components/adventure/ui/GameHeader.tsx` + HUD chips — tighten hierarchy.
- Boss telegraph/HP clarity.
- (TBD per mockups.)

## Constraints
- Daemon wipes uncommitted tracked edits mid-session → commit per-phase, land via cherry-pick-onto-origin/master + SHA-direct push, verify by content.
- Adventure beta-gated (guest→`/`); port 3000 = PROD (new routes 404). Browser proof needs own dev server + admin unlock OR DOM-invariant proof.
- TDD mandatory. i18n×5 for any new strings. Max 500 lines/file.

## Plan
1. Spec (this doc) ✓
2. Claude Design mockups (4 surfaces) → push to DesignSync project ✓
3. Implement code: TDD, per-phase commits — Phases 1-2 ✓
4. Verify, land

## SHIPPED (2026-06-21)
**Mockups:** 5 cards in Claude Design project `LexiClash Design System` (fc03763b…), groups
`Adventure · World Map / In-Game / Boss Fight / Level Grid`. Local source:
`fe-next/.superdesign/claude-design/adventure/*.html`.

**Phase 1 — Atmosphere** (`components/adventure/themed/GameplayBackground.tsx`):
Replaced soft radial-haze/vignette with per-world **flat bold color bands + crisp halftone
dots + hard horizon line** (all 10 worlds, CSS-only, perf-safe). Exposed pure
`getWorldAtmosphere(worldId)`. +8 tests (`__tests__/GameplayBackground.test.tsx`).

**Phase 2 — Hard chrome:**
- `RPGLevelCard.tsx`: removed `0 0 20px` glow shadow, `backdrop-blur-xs` glassmorphism,
  soft current-text glow, star `drop-shadow` blur, inner ellipse haze → hard offset shadows.
  +4 guard tests.
- `WorldMap.tsx`: orb double soft-glow + `blur(16px)` radial halo + progress-bar glow →
  hard solid offset shadow + flat colored halo.

**Invariant enforced:** no `blur(`, no `0 0 Npx` glow in edited files (grep-clean + test guards).
26/26 targeted tests green · tsc clean · lint clean.

**Verification boundary:** structure proven via DOM/tests; live in-app render UNCONFIRMED
(adventure beta-gated guest→`/`; port 3000 = PROD). Visual target = `20-ingame-handauthored`.

**Phase 3 — Gameplay-clarity (the 3rd pillar, now CODED):**
Mobile objectives were icon-only (no label) → player couldn't tell the goal. Added a
prominent primary-goal strip beneath the header.
- `lib/adventure/objectiveProgress.ts` (NEW, pure): `getObjectiveProgress` / `getObjectiveLabel`
  / `selectPrimaryObjective` — centralizes math duplicated across 3 renderers. +11 tests.
- `components/adventure/ui/PrimaryObjectiveBanner.tsx` (NEW): neo-brutalist icon + label +
  `current/target` + hard progress bar + complete state. Reuses existing `adventure.objectives.*`
  labels (no new i18n). +6 tests.
- Mounted in `AdventureGameShell` `belowHeader` slot, `lg:hidden` (desktop sidebar keeps full
  list), hidden during active boss combat + hunt mode (own goal UI). ui barrel export added;
  shell test mock updated.
- 51 tests green across all 3 phases · tsc clean · lint clean.

## FOLLOW-UP (not done)
- **Phase 4 — Boss telegraph/HP chrome** (mockup `30-boss`): `BOSS_RPG_COMBAT_ENABLED` is now
  `true` (live). The telegraph *banner* lives in `BossOverlay.tsx` (~650 lines). Harden its
  chrome + `SegmentedHPBar`/`ParryPrompt`/`WeaknessBadge`. Deferred: large live combat file,
  better as its own scoped pass. `AttackTelegraph.tsx` edge-flash blur is intentional danger
  juice (screen-edge vignette, not chrome) — leave as-is.
- Latent pre-existing bug noted: `LevelGrid.tsx:207/215/258` append hex-alpha to a `rgba()`
  glow value → invalid CSS (silently dropped). Not fixed here.

# Adventure Boss Fights → Real RPG Combat — Spec

**Date:** 2026-06-20
**Goal:** Make Adventure boss fights *feel like a real boss fight / real RPG* — not "just words." Words become the **input** to a combat loop with stakes, defense, a player moveset, and strategic word choice.

## Verified starting point (NOT a greenfield build)

Boss combat is **already live and rich** (confirmed by reading `BossOverlay.tsx` render path, not inferred):
- 5-state boss sprites (idle/attack/hurt/enraged/defeated) driven by combat state.
- `SegmentedHPBar` with 3 phases (66%/33% thresholds).
- **Telegraphed boss attacks** — 24 real abilities, 2s telegraph countdown ring, `useBossAbilities` → `useAttackTelegraph` → `useBossEffectExecutor` loop runs every 500ms (`BossOverlay.tsx:231-253`). Effects genuinely hit the player (lock tiles, scramble, timer/HP penalty, screen shake).
- Phase banners, rage vignette, boss taunts, attack effects, entrance/victory/defeat cinematics.
- Word→damage path: `useAdventureWordSubmit.ts:255-287` (`scoreValue → /3 → ceil × skill mults → dealBossDamage(base, mechMult)`).

**Why it still doesn't feel like a fight:** the telegraph is **non-interactive**. It counts down and the hit just lands. The player is a punching bag that also spells. There is **no player moveset**, **no defense**, **no reason one word beats another** beyond the existing mechanic match.

## The three missing RPG layers (this spec)

### 1. PARRY — the defend loop (the core "real boss" lever)
When a boss telegraphs an attack, a **parry window** opens. To block it, the player must submit a **qualifying** word before the 2s countdown ends.

- **Qualifying rule is distinct from "any word"** (advisor's key catch — otherwise no decision, just luck). Rule per attack: a word of **length ≥ parryThreshold** (default 6, scales down by phase so it stays achievable) **OR** a word matching the boss's elemental **weakness type**.
- **Parry success** → attack is **blocked** (effects never apply), boss takes a **counter-strike** (bonus damage), and boss is **stunned** (status effect) briefly — its next ability activation is suppressed.
- **Parry fail** (window elapses with no qualifying word) → attack lands as today.
- Surfaced by `ParryPrompt`: "🛡 DEFEND — a 6+ letter word!" with live countdown; green **PARRIED!** flash + counter number on success.

### 2. PLAYER ABILITY KIT — your moveset (RPG = you have moves too)
A 3-slot ability bar, **charged by combos** (every N combos = 1 charge). Tap (or 1/2/3 keys) to cast:
- **⚡ SMITE** — burst boss damage (scales with world). Cost: 1 charge.
- **🛡 WARD** — auto-block the next boss attack (no qualifying word needed). Cost: 1 charge.
- **🎯 FOCUS** — next valid word deals **2× (crit)**. Cost: 1 charge.

Charge meter fills visibly as combos climb (variable-reward: bigger combos → faster charge). Cooldown sweep per ability. Disabled state when uncharged.

### 3. ELEMENTAL WEAKNESS — strategic word choice ("not just words")
Each boss has a **weakness word-type** (derived deterministically from its existing `twistMechanic`, so all 10 get one with zero hand-authoring):
- e.g. Reflection King → **palindromes**, Ms. Grammar → **long words (≥6)**, Spelling Bee → **double-letter words**, Baron Buildaword → **compound-ish (≥7)**, Cosmic Wordsmith → **rare letters (Q/X/Z/J)**, etc.
- A weakness hit → **"WEAKNESS! ×1.6"** crit (multiplier on boss damage) + distinct popup. Color + icon + label (never color alone).
- Weakness is **hinted** persistently (`WeaknessBadge`: "Weak to: PALINDROMES") and in the boss intro taunt — so the player can hunt the right words. This is the "which word matters" RPG strategy that makes it not just spelling.

## Architecture (additive, TDD-first, files < 500 lines)

### Pure logic — `lib/adventure/combat/` (full TDD, no React)
- `weakness.ts` — `getBossWeakness(bossId): WeaknessRule`; `evaluateWeakness(word, rule): { isWeakHit, multiplier, label }`. Deterministic per-boss table derived from twistMechanic.
- `parry.ts` — `getParryRequirement(boss, phase): ParryReq`; `evaluateParry(word, req, weaknessRule): { parried, reason }`.
- `playerAbilities.ts` — `PLAYER_ABILITIES` registry; `chargesFromCombo(maxCombo, perCharge)`; `canCast`, `castAbility(state, id): { state, effect }`; pure reducer.
- `statusEffects.ts` — boss status model (`stun`); `applyStun`, `tickStatuses(dt)`, `isStunned`; player buffs (`focusArmed`, `wardArmed`) helpers.

### Hooks (thin wrappers + timers)
- `hooks/useBossPlayerAbilities.ts` — charge from combo, cooldowns, `cast(id)`; returns ability states + `castAbility`.
- `hooks/useBossCombatStatus.ts` — stun timer, ward/focus armed flags, `consumeFocus()`, `consumeWard()`, `stunBoss(ms)`.

### UI (small components, neo-brutalist tokens)
- `components/adventure/boss/PlayerAbilityBar.tsx` — 3 ability buttons, charge meter, cooldown sweep, keyboard 1/2/3, ≥44px targets, a11y.
- `components/adventure/boss/ParryPrompt.tsx` — telegraph defend prompt + countdown + PARRIED/HIT result.
- `components/adventure/boss/WeaknessBadge.tsx` — persistent weakness chip + WEAKNESS crit popup.

### Wiring (minimal edits to live files)
- `useAdventureWordSubmit.ts` — after `baseDamage`: apply weakness multiplier; if telegraph active & word qualifies → mark parry (block + stun + counter), consume focus crit; report combo for charge.
- `BossOverlay.tsx` — mount the 3 new components; gate ability activation on `!isStunned && !wardArmed`; route parry/ward to suppress the pending attack.

## Difficulty / variable-reward ties (within boss scope)
- **Rising difficulty:** parryThreshold and stun duration scale by phase (phase1 forgiving → enraged punishing); enraged boss telegraphs faster (already partly there).
- **Variable reward:** combo charge rate is non-linear (streaks pay off); weakness crits + parry counters create big, earned damage spikes (not RNG) — the "unexpected big moment" the goal asks for.

## Out of scope this session (named cut, per advisor)
- General level HUD rebuild (`GameHeader.tsx` / `GameSidebar.tsx`) — separate surface, separate follow-up. Boss HUD only here.

## As-built (2026-06-20)

**Shipped (flag-dark, `BOSS_RPG_COMBAT_ENABLED = false` in `lib/adventure/combat/config.ts`):**
- Pure core (full TDD): `weakness.ts`, `parry.ts`, `playerAbilities.ts`, `statusEffects.ts`, `combatMath.ts` (+ `config.ts`).
- Integration hook: `hooks/useBossCombat.ts` (charge = **cumulative**, banks each completed combo streak — not peak-minus-spent; parry-on-word → counter + stun + cancel telegraph; ward/focus buffs).
- UI: `PlayerAbilityBar`, `ParryPrompt`, `WeaknessBadge` (neo-brutalist, ≥44px, a11y live regions, reduced-motion via AdaptiveMotion).
- Wiring: weakness crit in `useAdventureWordSubmit` (gated by flag); combat hub in `BossOverlay`; `comboCount` + `dealBossDamage` threaded via `useAdventureOverlayProps` → `AdventureGameOverlays`.
- i18n `adventure.boss.combat.*` ×5 (native, Hebrew hand-written).
- Parry threshold eased to 5/5/4 by phase (achievable in the ~2s telegraph).

**Verification:** 170 combat/boss/word-submit tests green · tsc 0 · lint 0 (1 pre-existing warning). The pre-existing master-red `AdventureGame.autoComplete` 2/5 failures are unrelated (confirmed on clean HEAD).

**NOT YET DONE — required before enabling (advisor-flagged):**
- **Live playtest of one boss fight** (route: `/adventure/boss-rush`). tsc/tests prove the layer is *wired*, not that it's *fun/playable*. Validate: (a) parry actually achievable in 2s, (b) ability bar charges at a good pace, (c) the bottom-stacked ability bar doesn't overlap the player HP bar / controls on a 320–390px phone. This is the user's enable+playtest call (flip `BOSS_RPG_COMBAT_ENABLED` to true, or wire to a runtime feature flag).
- **Charge pacing + parry-window** are the two values most likely to need a tuning pass after that playtest.

## Constraints
- TDD mandatory (RED→GREEN→REFACTOR). All pure logic + reducers tested first.
- i18n: all new strings `t('adventure.boss.combat.*')` ×5 langs (en/he/es/sv/ja).
- a11y: aria-live on parry/weakness, ≥44px targets, `prefers-reduced-motion` fallbacks.
- Additive: must not break the 223 existing boss tests. Reuse house pattern (framer-motion + canvas-confetti).
- Flag-dark safe to land; enabling/playtest is the user's call.

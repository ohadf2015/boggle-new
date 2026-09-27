# Adventure Roguelike — Spec (2026-09-19)

Builds on `docs/2026-09-19-adventure-rebuild-spec.md` (classic board, signed attempts, server scoring).
Bar: Bookworm Adventures Deluxe (word = attack, enemies hit back, gem tiles, treasures, potions, bosses)
+ Balatro (pick-1-of-3 upgrades between rounds, boss rule twists). Evidence pack: `/tmp/adv-rogue/bar/`.

## User asks → mechanics
| Ask | Mechanic |
|---|---|
| Correct words just add points | Word = attack: letters fly off board to target, damage number w/ tier (hit / big / CRIT), target recoils, sfx tier, screen shake scaled to damage |
| Boss flat; player must do more than spell | Combat levels: enemy telegraphs attacks (countdown ring), player has HP. Non-word actions: tap SHIELD, swipe/tap incoming projectiles, tap frozen/cursed tiles to cleanse, 5+ letter word during telegraph = INTERRUPT (stagger). Boss phases change the attack set |
| Players don't collect things | Every level drops gold + chest roll. Relics (run-scoped passive effects), potions (consumable actives), collection items (permanent, existing inventory) |
| Upgrade mechanism / roguelike | A world = a run. After each cleared level: pick 1 of 3 (relic / potion / heal / gold). HP + relics + potions carry through the world's 7 levels. Die → run over, restart world (collection + stars kept) |
| Every level unique, difficulty rising, reuse modes | Level kinds per slot (table, not formula): classic, hunt, chain, fog, bomb, elite, boss. Each world introduces one new twist; bosses have unique rule twists |
| Hints | Hint charges per level (base 2, relics add). Hint 1 = glow first 2 tiles of a real word; hint 2 = full path pulse. Hint pool comes from server /start |
| Teacher-ready | Level table is data (`LevelSpec[]`); /start dealer takes optional `targetWords` source; `hunt` kind consumes target words. No teacher UI now |

## Contract (single source — every builder consumes, none re-invents)

### Level table — `lib/adventure/play/levels.ts`
`getPlayLevel(world, level)` returns `PlayLevel` from a **data table** `WORLD_LEVELS[world][level]` of `LevelSpec`:
`{ kind: 'classic'|'hunt'|'chain'|'fog'|'bomb'|'elite'|'boss', size, seconds, minLength, stars:[a,b,c], enemyHp?, enemyId?, huntCount?, twist? }`.
Existing fields stay (`isBoss`, `bossHp`, `stars`) for back-compat. Combat kinds (`elite`,`boss`): win = damage ≥ enemyHp.
`hunt`: win = found ≥ huntCount of token `targets`. Others: win = score ≥ stars[0].

### Modifiers + damage — `lib/adventure/play/relics.ts` + `scoreRun.ts`
`RELICS: Record<RelicId, { rarity, effect }>` — pure data. Effects are pure fns of word → points delta
(e.g. `+50% on 6+ letters`, `+3 per vowel-less`, `x2 first word`), or run stats (maxHp, hintCharges, seconds, shield).
`scoreRun({..., relics})` applies them — **ONE function** used by client HUD and server settle. No second formula.

### Run state — chained signed token (no migration)
`lib/adventure/play/runToken.ts`: `RunPayload { u, w, step, hp, maxHp, relics: RelicId[], potions: Record<PotionId,n>, gold, seed, offer?: OfferItem[] }`, HMAC like `attemptToken`.
- `/start { world, level, language, runToken?, pick? }`: no runToken → fresh run (level must be playable via `canPlayLevel`).
  With runToken: verify, `step === level`, `pick` ∈ `offer` → apply. Attempt token now also carries `relics`, `targets`, `kind`.
  Returns `{ token, grid, level, run (public RunPayload), hints: string[], targets?: string[] }`.
- `/complete { token, words, hpLeft, potionsUsed, died }`: settle with relics from token (never from body).
  Won & not died → returns `nextRun` token: step+1, hp=clamp(hpLeft), gold += f(score), potions -= used (can't go <0),
  `offer` = 3 items deterministic from `seed+step`. Died/lost → no nextRun (run over). Stars/unlock/collection writes unchanged.
- Client keeps the run token in state + `sessionStorage` (per world) — resume across reload.
- ponytail: HP/death/potion use are client-reported (single-player, beta). Score/relics/board/offers are server-trusted.

### Combat (client) — `lib/adventure/play/combat.ts` (pure, tested)
Enemy script per `enemyId`: list of attacks `{ id, telegraphMs, damage, effect: 'hit'|'freeze'|'curse'|'projectile'|'shuffle'|'drain' }`,
cadence by world. Player: hp, shield charges (earned by 5+ letter words), interrupt (5+ letter word during telegraph cancels).
Boss phases at 66% / 33% HP switch attack sets. `combat.ts` is a reducer: `step(state, event) → state` (events: tick, word, tapShield, tapTile, swipeProjectile).

### Hints
`/start` returns `hints` = up to 12 valid board words (server dict + solver), shortest-first mix. Client shows them only via hint UI.

## Pieces (gauntlet)
0. **Spine** (lead, sequential): level table, relics, runToken, scoreRun modifiers, combat reducer, /start + /complete, useAdventureRun. Tests.
1. **Word-hit juice** — the moment a correct word lands.
2. **Combat & bosses** — telegraphs, non-word actions, phases, player HP, death.
3. **Loot & draft** — chest opening, gold, relic draft screen (1 of 3), run HUD (relics/potions bar), collection.
4. **Level variety** — hunt/chain/fog/bomb presentation, level intro cards, map showing run path + level kinds.
5. **Hints**.
6. **Assets** — Higgsfield: relic/potion icons, enemies per world, fx, level-kind badges, boss intro loops.

## Gate
`cd fe-next && npx --no-install tsc --noEmit && npx --no-install eslint <touched> && npx --no-install vitest run <touched dirs>`; `npm run build` before ship.

## Catalog (ids fixed — assets + code share them; effects language-agnostic: length/order only)
Relics (`public/images/adventure/relics/<id>.webp`):
sharp-quill (6+ letters +50%) · long-bow (7+ letters x2) · short-sword (3-letter +2) · storm-rune (exactly 5 letters +5) ·
twin-ink (first word each level x2) · echo-stone (+1 per word already found this level, max +10) · magnet (all words +20%, rare) ·
heart-locket (+1 max HP) · hourglass (+10s per level) · lens-of-insight (+1 hint charge) · sage-scroll (hints reveal full word at once) ·
iron-bookmark (start combat with 1 shield) · frost-ward (freeze/curse duration halved) · vampire-fang (6+ letter word heals 1 HP) ·
gold-tooth (+50% gold) · lucky-clover (draft offers 4 instead of 3) · phoenix-feather (once per run: revive at 1 HP)
Potions (`public/images/adventure/potions/<id>.webp`): heal (+2 HP) · time (+15s) · cleanse (clear frozen/cursed tiles, stun enemy 3s) · insight (+2 hints)
Other art: `public/images/adventure/loot/{gold-coin,chest-closed,chest-open}.webp`, enemies `public/images/adventure/enemies/w<N>-{idle,hurt,attack}.webp` (one elite per world),
fx `public/images/adventure/fx/{fireball,ice-shard,curse-glyph,shield-bubble,slash}.webp`, boss intro loops `public/videos/adventure/boss-w<N>.mp4` (+ `.webp` poster).

## Baseline QA (before this work, 2026-09-19, screenshots /tmp/adv-rogue/qa-now/)
- Correct word: header score ticks + a "WORD +10" chip. Only juice = 420ms `GridSubmitBurst` glow on last tile — never caught on screen. Nothing flies, no number at the target, no shake.
- Boss: HP bar drops, taunt changes. No attack visible in a 26s idle window (frozen tiles have no clear styling). 3-letter words deal 0 on boss (minLength taunt) — confusing.
- Test account: /tmp/adv-rogue/LOGIN.md (`adv-rogue-0919@lexiclash.test`).

## Tech freedom (user, 2026-09-19): "use any tech you need to make it look good"
Already installed. Prefer these over adding deps: pixi.js 8 + pixi-filters + custom-pixi-particles (GPU particles, glow/shockwave/bloom — see components/wordTowerV2 for a working Pixi setup),
gsap 3 + @gsap/react (timelines for hit sequences), framer-motion 12 (UI/layout), canvas-confetti, howler (layered sfx).
More Higgsfield art/video is fine when a piece needs it (sprite sheets, extra enemy frames, backgrounds), saved under public/images/adventure/ or public/videos/adventure/.
Guardrails: lazy-load Pixi (next/dynamic, ssr:false), one canvas per screen, pause it when hidden, keep 60fps on a mid phone, and respect prefers-reduced-motion.

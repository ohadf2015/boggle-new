# Word Tower Rush: design

Goal: Word Tower feels fresh every run (variable reward), every player chases the tallest building (competitive), nothing clips, motion is premium.

## Problems (from code map)
- Loop is spell -> time pendulum -> physics. No ramp, no surprise, crates only reward.
- Score chip, floor delta, ImpactBurst chip clip at top / host edge (`overflow-hidden` hosts, first burst falls back to viewport).
- No rank or rival presence in-run; daily board is only seen after.

## Pillars
1. **Skyline Draft** (roguelike): every 5 floors of PEAK height, run pauses on a 3-card draft. 10 perks, 3 rarities, stackable, synergies via `PerkMods`. Seeded by run so daily is fair.
2. **Next-Up queue**: HUD shows the next 3 blocks. Slot 3 is sealed "?" until a perfect lands (curiosity). Traits: plain, gold (2x height points on that block), feather (lighter, wider perfect window), anvil (heavy, big combo gain), magnet (nudges toward center), lucky (guaranteed crate). Weighted RNG + pity so a trait never droughts.
3. **Rank ladder** (Word Wheel style): 9 tiers by run PEAK height (ratchet, collapse never lowers rank). Meter in HUD, rank-up burst.
4. **Ghost rivals**: daily top players drawn as faint skyline lines at their peak height inside the canvas. Passing one fires "Passed NAME!" overtake burst.
5. **Clip-free HUD**: one unified top bar, score pops rendered through a viewport portal with safe-area clamp.
6. **Motion**: landing squash+stretch, hit-stop on perfect, camera punch, combo-tier escalation, draft card flip/reveal, rank-up burst.

## Contracts
Shared types: `fe-next/lib/wordTowerV2/rush/types.ts` (foundation, do not edit; request changes in your requests file).

Pure lib (Builder A, `lib/wordTowerV2/rush/*`):
- `perks.ts`: `PERKS: Perk[]`, `rollDraft(seed:number, floorIndex:number, owned:PerkId[]): Perk[]` (3 distinct, not owned, rarity-weighted, deterministic), `combineMods(owned:PerkId[]): PerkMods` (defaults all 1 / 0).
- `traits.ts`: `createTraitQueue(seed:number)` returns `{ peek(n:number):NextUpSlot[]; take():BlockTrait; revealSealed():void }` with pity (no 6+ plain streak, gold at most 1 in 4).
- `rankLadder.ts`: `RANK_TIERS: RankTierDef[]` (9), `rankFor(peakM:number): RankState`.
- `rivals.ts`: `pickRivals(board:{name:string;score:number;id:string}[], currentPeakM:number, max?:number): GhostRival[]` (convert score->metres via inverse of `scoreFromHeightM`), `crossedRivals(prevM:number, nextM:number, rivals:GhostRival[]): GhostRival[]`.
- `draftTrigger.ts`: `draftDue(prevPeakFloor:number, nextPeakFloor:number): number | null` (every 5 floors).
Each file has a vitest spec beside it in `lib/wordTowerV2/rush/__tests__/`.

Presentational UI (Builder C, `components/wordTowerV2/rush/*`, props only, no game-state imports):
- `PerkDraft.tsx`: `{ perks: Perk[]; onPick(id:PerkId):void; floor:number }`, 3 cards, flip-in stagger, rarity colors (neo tokens), keyboard 1/2/3, `t('wordTowerV2.rush.perk.<id>.name'|'.desc')`.
- `NextUpQueue.tsx`: `{ slots: NextUpSlot[] }` compact row, sealed slot shimmers "?", reveal animation on `sealed` true->false.
- `RankMeter.tsx`: `{ rank: RankState }` pill + progress bar, rank-up pulse when `tier` increases.
- `GhostRivalsLayer.tsx`: `{ rivals: GhostRival[]; heightToY(m:number):number; viewportHeight:number }` absolute overlay lines + name tags, clamped inside safe area.
- `OvertakeToast.tsx`: `{ name:string; onDone():void }`.
- `RankUpBurst.tsx`: `{ tierId:string; onDone():void }`.
All text via `t()`. Keys go in the builder's requests file, integrator adds to all 6 locales (en, he, es, sv, ru, ja).

Existing-file fixes (Builder B owns: `V2TopBar.tsx`, `V2Hud.tsx`, `rewards/ImpactBurst.tsx`, `V2Celebrations.tsx`, `rewards/MilestoneBurst.tsx`, `rewards/TierBurst.tsx`, `rewards/CoinFountain.tsx`, `DailyGoalCard.tsx`): remove every clip path, unify HUD, motion polish. Slot for rush widgets in the top bar via `children`/render props, documented in its requests file.

Integration (after builders, single owner): `useTowerRun.ts`, `WordTowerV2.tsx`, `TowerCanvas.tsx`, `lib/wordTowerV2/{run,rewards,crane,scoring}.ts`, translations, GR-Intervention trailer.

## Non-goals
Multiplayer V1 untouched. Score stays `scoreFromHeightM` (no word-length score). Estate/raid meta untouched.

# Remove Locked Tiles from Blast Mode (SP + MP) — 2026-06-04

## Goal
Remove the **Locked** tile mechanic from Blast entirely, in single-player **and** multiplayer.

## Why both `locked` AND `key`
They are one coupled mechanic: `locked` tiles are inert gates; `key` tiles exist *solely* to unlock adjacent locked tiles (`clearTilesProcessor` `case 'key'`). Wave config only ever spawns them together (`lockedEnabled && keyEnabled`). Removing `locked` alone orphans `key`. **Both go.**

## Why MP is covered by the same edits
Both SP (`useBlastEngine` → `generateTileStates`) and MP server (`backend/modules/blastModeManager.ts` → `generateBlastOverlay`) seed specials from the **same** `getWaveDistribution(waveConfig)`. `locked`/`key` only get a nonzero share via the `lockedEnabled && keyEnabled` block. Zeroing that (+ removing the union members) zeros them on every path.

## Approach: type-driven
Delete `'locked'` / `'key'` from the `BlastTileType` union + `BLAST_TILE_TYPE_LIST`, and the `isUnlocked` field from `BlastTileState`. Every `Record<BlastTileType, …>` site (`SPECIAL_TILE_DISTRIBUTION`, `TILE_VISUALS`, `BLAST_TILE_BONUSES`) then becomes a `tsc` error — the compiler is the exhaustive find-all-references checklist. After edits, re-grep string-literal `'locked'`/`'key'` (loose `Set<string>` sites like `blastColorPowerSeeder` are NOT type-checked).

## Surface (all under `fe-next/`)
**Types/consts**
- `shared/types/blast.ts` — union members `'locked'`,`'key'`; list entries; `isUnlocked` field
- `components/blast/legacy/types.ts` — `KEY_UNLOCK_BONUS`, `LOCKED_KEY_MAX_DISTANCE`; `SPECIAL_TILE_DISTRIBUTION` keys
- `shared/constants/blastMultiplayerConstants.ts` — `BLAST_TILE_BONUSES` keys

**Engine / logic**
- `utils/blastTileGeneration.ts` — delete locked↔key pairing block (≈162–209)
- `utils/blastWaveConfig.ts` — `lockedEnabled`/`keyEnabled` field + all WAVE_TABLE rows; `LOCKED_SHARE`/`KEY_SHARE`; distribution block; return record `locked`/`key`
- `hooks/blastCellFilterLogic.ts` — drop locked-blocked branch
- `utils/clearTilesProcessor.ts` — delete `case 'key'`; drop `KEY_UNLOCK_BONUS` import
- `utils/blastGravity.ts` — drop `isUnlocked` from Survivor pick + both spreads
- `utils/blastDeadEndGrid.ts` — drop locked-as-wall line
- `utils/blastColorPowerSeeder.ts` — drop `'locked'` from OBSTACLE_TILES (and `'key'` from special set if present)
- `hooks/useBlastEngine.ts` — comment only ("hide cleared + locked tiles")

**UI**
- `blastTileVisuals.ts` — drop `locked` + `key` TILE_VISUALS entries + now-unused `Lock`/`Key` imports
- `BlastTile.tsx` — drop `type === 'locked'` overlay branch; simplify the ice/frozen branch (`isLocked &&`). Keep `isLocked` prop (ice/frozen still use it).
- `utils/blastTileTooltips.ts` — drop `locked`/`key` i18n-key map + ENGLISH_FALLBACK entries

**Translations (×5: en/he/sv/ja/es)**
- `blast.tile.locked` + `blast.tile.key` tooltip objects
- the short guide block locked/key entries
- the Blast "locked tile, unlock with matching letter" aria string

## Out of scope (DO NOT touch)
- **Adventure / boss "Red Pen"** ability (`lib/adventure/abilities/msGrammarAbilities.ts`) + adventure `TileType` — separate game, separate type union, its own `locked`. Keep its translation line too.
- Other unrelated `"locked"` translation keys (VIP Part, feature-unlock labels).

## TDD
- RED guard test: `BLAST_TILE_TYPE_LIST` excludes `'locked'`/`'key'`; `getWaveDistribution` never returns a nonzero `locked`/`key` share at any wave; generation/overlay never emit them.
- Delete the dedicated locked/key tests + locked/key cases in shared Blast tests (intentional behavior removal, not a test-failure-protocol violation).

## Gate
`npm run lint && tsc (frontend) && npm run test (blast + backend blast) && npm run build`. Re-grep `'locked'`/`'key'` literals in `components/blast`, `lib/blast`, `backend` after.

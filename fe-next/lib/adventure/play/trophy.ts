/**
 * The elite's trophy: killing the L4 elite mints ONE relic straight into the
 * run (Bookworm's overkill gem, made roguelike). Deterministic from public
 * inputs (world + relics owned), so the kill banner can name it the instant
 * the elite falls and the server grants the very same relic in the next
 * signed run link.
 */
import { makeOffer, maxHpOf, type RunPayload } from './runToken';
import type { NodeKind } from './runMap';
import { RELICS, RELIC_IDS, draftSize, type RelicId } from './relics';

export function eliteTrophy(world: number, owned: readonly RelicId[]): RelicId | null {
  const free = RELIC_IDS.filter((id) => !owned.includes(id));
  if (!free.length) return null;
  const good = free.filter((id) => RELICS[id].rarity !== 'common');
  const pool = good.length ? good : free;
  return pool[(Math.max(1, Math.floor(world)) * 7) % pool.length];
}

/** After an elite NODE: add the trophy (HP stat relics apply) and re-roll the offer so it never repeats it. */
export function withEliteTrophy(run: RunPayload, kind: NodeKind): RunPayload {
  if (kind !== 'elite') return run;
  const id = eliteTrophy(run.w, run.relics);
  if (!id) return run;
  const relics = [...run.relics, id];
  const maxHp = maxHpOf({ relics, bhp: run.bhp });
  return {
    ...run,
    relics,
    maxHp,
    hp: Math.min(maxHp, run.hp + (maxHp - run.maxHp)),
    offer: makeOffer(run.seed, run.path.length, relics, draftSize(relics)),
  };
}

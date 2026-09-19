/**
 * Which owned relics a word just triggered — drives the relic-bar glow, so a
 * relic's effect is visible ON the relic. Reads the catalog; never re-scores.
 */
import { RELICS, isRelicId, healsOnLongWord, type RelicId, type Rarity } from '@/lib/adventure/play/relics';
import type { OfferItem } from '@/lib/adventure/play/runToken';

/**
 * `index` = words already credited this level (same index `applyRelics` uses).
 * `inFight`: stat relics that act on words in combat (vampire-fang) count too.
 */
export function triggeredRelics(word: string, index: number, relics: readonly string[], opts: { inFight?: boolean } = {}): RelicId[] {
  const len = Array.from(word).length;
  const ctx = { len, index };
  const out: RelicId[] = [];
  for (const id of relics) {
    if (!isRelicId(id) || out.includes(id)) continue;
    const e = RELICS[id].effect;
    if (e.type === 'flat' && e.bonus(ctx) > 0) out.push(id);
    else if (e.type === 'mult' && e.factor(ctx) !== 1) out.push(id);
    else if (id === 'vampire-fang' && opts.inFight && healsOnLongWord([id]) && len >= 6) out.push(id);
  }
  return out;
}

export function offerRarity(item: OfferItem): Rarity {
  return item.type === 'relic' ? RELICS[item.id].rarity : 'common';
}

/** Short, language-free tag for what a relic added to this word ("×2", "+50%", "+5"), or ''. */
export function relicBonusLabel(id: RelicId, word: string, index: number): string {
  const ctx = { len: Array.from(word).length, index };
  const e = RELICS[id].effect;
  if (e.type === 'flat') {
    const b = e.bonus(ctx);
    return b > 0 ? `+${b}` : '';
  }
  if (e.type === 'mult') {
    const f = e.factor(ctx);
    if (f === 1) return '';
    return Number.isInteger(f) ? `×${f}` : `+${Math.round((f - 1) * 100)}%`;
  }
  return id === 'vampire-fang' && ctx.len >= 6 ? '+1' : '';
}

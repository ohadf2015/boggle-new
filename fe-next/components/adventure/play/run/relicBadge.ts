/**
 * The numeral baked onto a relic chip.
 *
 * Judge gap (round 2): our rail showed undifferentiated squares with "no name,
 * no stack/charge count", while the bar's relic strip numbers every icon that
 * needs it. Scoring relics can print what they have actually paid out this run,
 * but TEN of the seventeen relics are `stat` — they never appear in
 * `relicRunContributions`, so they would render as bare icons. Those get their
 * magnitude straight off the catalog constants instead, so every chip in the
 * rail carries a number and nothing can drift out of sync with the rules.
 *
 * Tags are digits + symbols only: they need no translation and read the same in
 * Hebrew.
 */
import {
  RELICS, BASE_HP, BASE_HINTS, maxHpFor, secondsBonus, hintCharges, draftSize,
  goldMult, startShields, effectDurationMult, healsOnLongWord, hasRevive, revealsFullHint,
  type RelicId,
} from '@/lib/adventure/play/relics';

/** Same formatting `relicBonusLabel` uses for a single word, applied to a multiplier. */
const multTag = (f: number) => (Number.isInteger(f) ? `×${f}` : `+${Math.round((f - 1) * 100)}%`);

/** Probe the catalog effect for its best case, so the tag is derived, never transcribed. */
function scoringTag(id: RelicId): string {
  const e = RELICS[id].effect;
  if (e.type === 'flat') {
    let best = 0;
    for (let len = 2; len <= 12; len += 1) for (const index of [0, 5, 10, 20]) best = Math.max(best, e.bonus({ len, index }));
    return best > 0 ? `+${best}` : '';
  }
  if (e.type === 'mult') {
    let best = 1;
    for (let len = 2; len <= 12; len += 1) for (const index of [0, 5, 10, 20]) best = Math.max(best, e.factor({ len, index }));
    return best === 1 ? '' : multTag(best);
  }
  return '';
}

/** Stat relics have no points share — their magnitude comes from the run constants. */
function statTag(id: RelicId): string {
  const one = [id];
  switch (id) {
    case 'heart-locket': return `+${maxHpFor(one) - BASE_HP}`;
    case 'hourglass': return `+${secondsBonus(one)}s`;
    case 'lens-of-insight': return `+${hintCharges(one) - BASE_HINTS}`;
    case 'lucky-clover': return `+${draftSize(one) - draftSize([])}`;
    case 'gold-tooth': return multTag(goldMult(one));
    case 'iron-bookmark': return `+${startShields(one)}`;
    case 'frost-ward': return `−${Math.round((1 - effectDurationMult(one)) * 100)}%`;
    case 'vampire-fang': return healsOnLongWord(one) ? '+1' : '';
    case 'sage-scroll': return revealsFullHint(one) ? '100%' : '';
    case 'phoenix-feather': return hasRevive(one) ? '↺1' : '';
    default: return '';
  }
}

/** The relic's own headline number, independent of this run. */
export function relicTag(id: RelicId): string {
  return scoringTag(id) || statTag(id);
}

export interface RelicBadge { text: string; tone: 'points' | 'stat' }

/**
 * What to bake onto the chip: the live run payout when there is one, otherwise
 * the relic's standing effect — so a freshly drafted relic still reads as a
 * number rather than an anonymous square.
 */
export function relicBadge(id: RelicId, contrib: number | undefined): RelicBadge {
  if (typeof contrib === 'number' && contrib > 0) return { text: `+${contrib}`, tone: 'points' };
  return { text: relicTag(id), tone: 'stat' };
}

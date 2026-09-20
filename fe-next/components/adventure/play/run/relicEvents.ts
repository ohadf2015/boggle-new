/**
 * Relics that fire on something other than a word, so the rail can name them
 * the moment they act. Nine of the seventeen relics used to be silent — the
 * shield was just "a shield", the revive just "you got up", the shortened
 * freeze indistinguishable from a normal one — which is why a player who had
 * them believed they did nothing.
 *
 * Pure: takes what happened, returns which owned relics to flash and the short
 * tag to flash on them. `RunHud` turns that into a `RelicPulse`.
 */
import { hintCharges, maxHpFor, secondsBonus, type RelicId } from '@/lib/adventure/play/relics';
import type { CombatFx } from '@/lib/adventure/play/combat';

export interface RelicFire {
  relics: RelicId[];
  labels: Partial<Record<RelicId, string>>;
}

const EMPTY: RelicFire = { relics: [], labels: {} };

const own = (owned: readonly string[], id: RelicId) => owned.includes(id);

/** The passives that quietly applied the moment this level was dealt. */
export function levelStartFire(owned: readonly string[]): RelicFire {
  const relics: RelicId[] = [];
  const labels: Partial<Record<RelicId, string>> = {};
  const secs = secondsBonus(owned);
  if (own(owned, 'hourglass') && secs > 0) { relics.push('hourglass'); labels['hourglass'] = `+${secs}s`; }
  if (own(owned, 'heart-locket')) { relics.push('heart-locket'); labels['heart-locket'] = `+${maxHpFor(owned) - maxHpFor(owned.filter((r) => r !== 'heart-locket'))}`; }
  const hints = hintCharges(owned);
  if (own(owned, 'lens-of-insight')) { relics.push('lens-of-insight'); labels['lens-of-insight'] = `${hints}`; }
  if (own(owned, 'sage-scroll')) { relics.push('sage-scroll'); labels['sage-scroll'] = '★'; }
  return { relics, labels };
}

/** The shield a relic handed you before the first punch was thrown. */
export function fightStartFire(owned: readonly string[], shields: number): RelicFire {
  if (!own(owned, 'iron-bookmark') || shields <= 0) return EMPTY;
  return { relics: ['iron-bookmark'], labels: { 'iron-bookmark': `+${Math.min(shields, 1)}` } };
}

/** What the enemy's last move triggered: a revive spent, a freeze cut in half. */
export function combatFxFire(owned: readonly string[], fx: readonly CombatFx[]): RelicFire {
  const relics: RelicId[] = [];
  const labels: Partial<Record<RelicId, string>> = {};
  if (fx.includes('revive') && own(owned, 'phoenix-feather')) {
    relics.push('phoenix-feather');
    labels['phoenix-feather'] = '1';
  }
  if (own(owned, 'frost-ward') && (fx.includes('freeze') || fx.includes('curse') || fx.includes('shuffle'))) {
    relics.push('frost-ward');
    labels['frost-ward'] = '−50%';
  }
  return { relics, labels };
}

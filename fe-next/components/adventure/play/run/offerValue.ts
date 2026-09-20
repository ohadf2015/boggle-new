/**
 * Balatro-style "Currently +104 Chips": what a draft card is worth to THIS run.
 * Scoring relics are replayed over the run's own words through scoreWords —
 * the same formula the server credits — so the number is never a guess.
 * Returns an i18n key under adventurePlay.loot.value.* plus its params.
 */
import { RELICS, draftSize, hintCharges, maxHpFor, secondsBonus, type RelicId } from '@/lib/adventure/play/relics';
import { relicStack, type LevelWords } from '@/lib/adventure/play/relicStack';
import { getPlayLevel } from '@/lib/adventure/play/levels';
import type { OfferItem, PublicRun } from '@/lib/adventure/play/runToken';

export interface OfferValueCtx {
  /** Words found in each cleared level of this run, in the order found. */
  levels: readonly (readonly string[])[];
  run: PublicRun;
}

export interface OfferValue {
  key: string;
  params: Record<string, number>;
  /** The projection is bigger because of relics the player already owns. */
  synergy: boolean;
  /** Language-free headline ("+38", "2 → 3", "—"); the caption comes from `key`. */
  big: string;
}

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

function bigFor(key: string, p: Record<string, number>): string {
  if ('from' in p && 'to' in p) return `${p.from} → ${p.to}`;
  switch (key) {
    case 'noData': return '—';
    case 'heartsFull': return `${p.max}/${p.max}`;
    case 'frost': return `−${p.n}%`;
    case 'longWords': return `+${p.hits}`;
    case 'shield': case 'fullHints': return `${p.n}`;
    default: return signed(p.n ?? 0);
  }
}

const v = (key: string, params: Record<string, number> = {}, synergy = false): OfferValue => ({ key, params, synergy, big: bigFor(key, params) });

/** Cleared levels as LevelWords, with each level's kind + length from the world layout. */
export function runLevels(world: number, levels: OfferValueCtx['levels']): LevelWords[] {
  return levels.map((words, i) => {
    try {
      const l = getPlayLevel(world, i + 1);
      return { words, kind: l.kind, seconds: l.seconds };
    } catch {
      return { words };
    }
  });
}

function scoringValue(id: RelicId, { levels, run }: OfferValueCtx): OfferValue {
  const stack = relicStack(id, { levels: runLevels(run.w, levels), owned: run.relics });
  if (!stack) return id === 'hourglass' ? v('seconds', { n: secondsBonus([id]) }) : v('noData');
  const total = levels.reduce((s, l) => s + l.length, 0);
  if (id === 'hourglass') return v('timePts', { n: stack.combined, alone: stack.alone, secs: secondsBonus([id]) }, stack.synergy);
  return v('ptsPerLevel', { n: stack.combined, alone: stack.alone, hits: stack.hits, total }, stack.synergy);
}

export function offerValue(item: OfferItem, ctx: OfferValueCtx): OfferValue {
  const { run, levels } = ctx;
  if (item.type === 'heal') {
    return run.hp >= run.maxHp ? v('heartsFull', { max: run.maxHp }) : v('hearts', { from: run.hp, to: Math.min(run.maxHp, run.hp + item.amount) });
  }
  if (item.type === 'gold') return v('goldTo', { from: run.gold, to: run.gold + item.amount });
  if (item.type === 'potion') {
    const have = run.potions?.[item.id] ?? 0;
    return v('carry', { from: have, to: have + 1 });
  }
  const id = item.id;
  if (RELICS[id].effect.type !== 'stat' || id === 'hourglass') return scoringValue(id, ctx);
  const cleared = Math.max(1, run.step - 1);
  switch (id) {
    case 'heart-locket': return v('maxHearts', { from: run.maxHp, to: maxHpFor([...run.relics, id]) });
    case 'lens-of-insight': return v('hints', { from: hintCharges(run.relics), to: hintCharges([...run.relics, id]) });
    case 'lucky-clover': return v('cards', { from: draftSize(run.relics), to: draftSize([...run.relics, id]) });
    case 'sage-scroll': return v('fullHints', { n: hintCharges(run.relics) });
    case 'iron-bookmark': return v('shield', { n: 1 });
    case 'frost-ward': return v('frost', { n: 50 });
    case 'phoenix-feather': return v('revive', { n: 1 });
    case 'vampire-fang': {
      const hits = levels.reduce((s, l) => s + l.filter((w) => Array.from(w).length >= 6).length, 0);
      return v('longWords', { hits });
    }
    case 'gold-tooth': return v('goldPerLevel', { n: Math.round((run.gold / cleared) * 0.5) });
    default: return v('noData');
  }
}

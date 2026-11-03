import { mixSeed, mulberry32 } from './perks';
import type { BlockTrait, NextUpSlot } from './types';

const TRAIT_WEIGHTS: [BlockTrait, number][] = [
  ['plain', 50],
  ['gold', 8],
  ['feather', 12],
  ['anvil', 10],
  ['magnet', 10],
  ['lucky', 10],
];

const MAX_PLAIN_STREAK = 5;
const GOLD_WINDOW = 4;
const SEALED_SLOT = 2;
const TRAIT_SALT = 0x7a17;

export interface TraitQueue {
  peek(n: number): NextUpSlot[];
  take(): BlockTrait;
  revealSealed(): void;
}

export interface TraitQueueOptions {
  /** Read on every deal, so a perk picked mid-run changes only blocks not yet dealt. */
  goldWeightMul?: () => number;
}

export function createTraitQueue(seed: number, opts?: TraitQueueOptions): TraitQueue {
  const rng = mulberry32(mixSeed(seed, TRAIT_SALT));
  const dealt: BlockTrait[] = [];
  const revealed = new Set<number>();
  let head = 0;
  let plainStreak = 0;

  function next(): BlockTrait {
    const recent = dealt.slice(-(GOLD_WINDOW - 1));
    const goldMul = opts?.goldWeightMul?.() ?? 1;
    const allowed = TRAIT_WEIGHTS.filter(([trait]) => {
      if (trait === 'gold' && recent.includes('gold')) return false;
      if (trait === 'plain' && plainStreak >= MAX_PLAIN_STREAK) return false;
      return true;
    }).map(([trait, w]): [BlockTrait, number] => [trait, trait === 'gold' ? w * goldMul : w]);
    const total = allowed.reduce((sum, [, w]) => sum + w, 0);
    let roll = rng() * total;
    let pick = allowed[allowed.length - 1][0];
    for (const [trait, w] of allowed) {
      roll -= w;
      if (roll < 0) {
        pick = trait;
        break;
      }
    }
    plainStreak = pick === 'plain' ? plainStreak + 1 : 0;
    dealt.push(pick);
    return pick;
  }

  function ensure(count: number): void {
    while (dealt.length < head + count) next();
  }

  return {
    peek(n) {
      ensure(n);
      return Array.from({ length: n }, (_, i) => ({
        trait: dealt[head + i],
        sealed: i === SEALED_SLOT && !revealed.has(head + i),
      }));
    },
    take() {
      ensure(1);
      return dealt[head++];
    },
    revealSealed() {
      revealed.add(head + SEALED_SLOT);
    },
  };
}

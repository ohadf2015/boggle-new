import type { SubmitResult, VaultGridConfig } from './types';
import { gateAccepts, gateBonusFor } from './semanticGate';

const MIN_LENGTH = 2;

export function classifySubmit(
  word: string,
  cfg: VaultGridConfig,
  alreadySubmitted: Set<string>,
): SubmitResult {
  if (word.length < MIN_LENGTH) {
    return { kind: 'invalid', reason: 'too-short' };
  }

  if (alreadySubmitted.has(word)) {
    return { kind: 'invalid', reason: 'used' };
  }

  const target = cfg.targets.find((t) => t.word === word);
  if (target) {
    return { kind: 'target-hit', target, coins: target.bonus ?? 0 };
  }

  if (cfg.semanticGate) {
    if (!gateAccepts(cfg.semanticGate.class, word)) {
      return { kind: 'invalid', reason: 'wrong-class' };
    }
    const rawRarity = gateBonusFor(cfg.semanticGate.class, word);
    // gateAccepts guarantees rawRarity > 0; defensively re-classify if invariant breaks.
    if (rawRarity === 0) return { kind: 'invalid', reason: 'wrong-class' };
    const rarity: 1 | 2 = rawRarity;
    const base = cfg.bonusBucket?.baseCoinsPerWord ?? 1;
    return { kind: 'bonus-hit', word, rarity, coins: base * rarity };
  }

  // No gate, no target match → invalid not-word.
  // Real HE-dictionary lookup deferred (uses isValidHebrewWordForBoard later).
  return { kind: 'invalid', reason: 'not-word' };
}

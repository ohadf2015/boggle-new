import { describe, it, expect } from 'vitest';
import { classifySubmit } from '../submit';
import type { VaultGridConfig } from '../types';

const baseCfg: VaultGridConfig = {
  size: 3,
  letterSource: 'pangram',
  traversal: 'anytap',
  targets: [{ word: 'אש' }],
  bonusBucket: { baseCoinsPerWord: 2 },
  semanticGate: { class: 'name-male', acceptList: ['אש', 'אורי'], rareBonusList: ['להבה'] },
};

describe('classifySubmit', () => {
  it('returns target-hit for a target word', () => {
    const r = classifySubmit('אש', baseCfg, new Set());
    expect(r.kind).toBe('target-hit');
    if (r.kind === 'target-hit') expect(r.target.word).toBe('אש');
  });

  it('returns bonus-hit for an off-target accept-list word', () => {
    const r = classifySubmit('אורי', baseCfg, new Set());
    expect(r.kind).toBe('bonus-hit');
    if (r.kind === 'bonus-hit') {
      expect(r.word).toBe('אורי');
      expect(r.rarity).toBe(1);
      expect(r.coins).toBe(2);
    }
  });

  it('rare-bonus word doubles rarity and coins', () => {
    const r = classifySubmit('להבה', baseCfg, new Set());
    expect(r.kind).toBe('bonus-hit');
    if (r.kind === 'bonus-hit') {
      expect(r.rarity).toBe(2);
      expect(r.coins).toBe(4);
    }
  });

  it('returns invalid wrong-class for unrelated valid HE word when gate set', () => {
    const r = classifySubmit('בית', baseCfg, new Set());
    expect(r.kind).toBe('invalid');
    if (r.kind === 'invalid') expect(r.reason).toBe('wrong-class');
  });

  it('returns invalid too-short for length < 2', () => {
    const r = classifySubmit('א', baseCfg, new Set());
    expect(r.kind).toBe('invalid');
    if (r.kind === 'invalid') expect(r.reason).toBe('too-short');
  });

  it('returns invalid used when word already submitted in this beat', () => {
    const r = classifySubmit('אורי', baseCfg, new Set(['אורי']));
    expect(r.kind).toBe('invalid');
    if (r.kind === 'invalid') expect(r.reason).toBe('used');
  });

  it('returns invalid not-word when no gate set and word not target', () => {
    const cfg: VaultGridConfig = { ...baseCfg, semanticGate: undefined };
    const r = classifySubmit('בית', cfg, new Set());
    expect(r.kind).toBe('invalid');
    if (r.kind === 'invalid') expect(r.reason).toBe('not-word');
  });
});

import { describe, it, expect } from 'vitest';
import {
  selectWaveModifier,
  applyModifierToWaveConfig,
  BLAST_MODIFIERS,
  type BlastModifierId,
} from '../blastModifiers';
import { getWaveConfig, type WaveConfig } from '../blastWaveConfig';

const ALL_IDS: BlastModifierId[] = [
  'goldRush', 'chainFrenzy', 'doubleDown', 'featherfall', 'bombParty', 'luckyVowels', 'megaCombo',
];

describe('blastModifiers — selection', () => {
  it('never returns a modifier on wave 1 (teach the ropes)', () => {
    for (let seed = 0; seed < 200; seed++) {
      expect(selectWaveModifier(seed, 1)).toBeNull();
    }
  });

  it('is deterministic for a given (seed, wave)', () => {
    for (let seed = 0; seed < 50; seed++) {
      for (let wave = 2; wave <= 12; wave++) {
        const a = selectWaveModifier(seed, wave);
        const b = selectWaveModifier(seed, wave);
        expect(a?.id ?? null).toBe(b?.id ?? null);
      }
    }
  });

  it('sometimes returns a modifier and sometimes null on wave >= 2 (not always-on, not always-off)', () => {
    let withMod = 0;
    let withoutMod = 0;
    for (let seed = 0; seed < 300; seed++) {
      const m = selectWaveModifier(seed, 5);
      if (m) withMod++; else withoutMod++;
    }
    expect(withMod).toBeGreaterThan(20);
    expect(withoutMod).toBeGreaterThan(20);
  });

  it('only ever returns ids from the known catalog', () => {
    for (let seed = 0; seed < 300; seed++) {
      for (let wave = 2; wave <= 12; wave++) {
        const m = selectWaveModifier(seed, wave);
        if (m) expect(ALL_IDS).toContain(m.id);
      }
    }
  });

  it('never repeats the immediately-previous wave modifier on the next wave (same seed)', () => {
    for (let seed = 0; seed < 300; seed++) {
      for (let wave = 2; wave < 12; wave++) {
        const cur = selectWaveModifier(seed, wave);
        const next = selectWaveModifier(seed, wave + 1);
        if (cur && next) {
          expect(next.id).not.toBe(cur.id);
        }
      }
    }
  });
});

describe('blastModifiers — catalog integrity', () => {
  it('exposes exactly the known ids with required display metadata', () => {
    const ids = Object.keys(BLAST_MODIFIERS).sort();
    expect(ids).toEqual([...ALL_IDS].sort());
    for (const id of ALL_IDS) {
      const m = BLAST_MODIFIERS[id];
      expect(m.id).toBe(id);
      expect(typeof m.icon).toBe('string');
      expect(m.icon.length).toBeGreaterThan(0);
      expect(['lime', 'pink', 'cyan', 'purple', 'yellow', 'orange']).toContain(m.color);
      // Every modifier must DO something — patch and/or score multiplier.
      const hasPatch = m.patch && Object.keys(m.patch).length > 0;
      const hasScore = typeof m.scoreMultiplier === 'number' && m.scoreMultiplier !== 1;
      expect(hasPatch || hasScore).toBe(true);
    }
  });
});

describe('blastModifiers — applyModifierToWaveConfig', () => {
  const base: WaveConfig = getWaveConfig(5);

  it('returns an equivalent (deep-equal) config when modifier is null', () => {
    expect(applyModifierToWaveConfig(base, null)).toEqual(base);
  });

  it('does not mutate the input config', () => {
    const snapshot = structuredClone(base);
    applyModifierToWaveConfig(base, BLAST_MODIFIERS.chainFrenzy);
    expect(base).toEqual(snapshot);
  });

  it('chainFrenzy doubles cascade bonus (a live engine field)', () => {
    const out = applyModifierToWaveConfig(base, BLAST_MODIFIERS.chainFrenzy);
    expect(out.cascadeChainBonus).toBeCloseTo(base.cascadeChainBonus * 2, 5);
  });

  it('luckyVowels cuts ice and lifts gold (both live distribution fields)', () => {
    const out = applyModifierToWaveConfig(base, BLAST_MODIFIERS.luckyVowels);
    expect(out.iceDistribution).toBeLessThan(base.iceDistribution);
    expect(out.goldDistribution).toBeGreaterThan(base.goldDistribution);
  });

  it('featherfall grants extra moves (a live engine field)', () => {
    const out = applyModifierToWaveConfig(base, BLAST_MODIFIERS.featherfall);
    expect(out.movesAllowed).toBe(base.movesAllowed + 2);
  });

  it('only patches WaveConfig fields the SP engine actually reads (no vowelModifier / maxCascadeChain no-ops)', () => {
    for (const id of ALL_IDS) {
      const out = applyModifierToWaveConfig(base, BLAST_MODIFIERS[id]);
      // These two fields are dead in the engine — a modifier must never rely on them.
      expect(out.vowelModifier).toBe(base.vowelModifier);
      expect(out.maxCascadeChain).toBe(base.maxCascadeChain);
    }
  });

  it('doubleDown removes a move but never below 1', () => {
    const out = applyModifierToWaveConfig(base, BLAST_MODIFIERS.doubleDown);
    expect(out.movesAllowed).toBe(base.movesAllowed - 1);
    const tiny: WaveConfig = { ...base, movesAllowed: 1 };
    expect(applyModifierToWaveConfig(tiny, BLAST_MODIFIERS.doubleDown).movesAllowed).toBe(1);
  });

  it('clamps probability fields to [0,1]', () => {
    const out = applyModifierToWaveConfig(base, BLAST_MODIFIERS.bombParty);
    expect(out.specialTileChance).toBeGreaterThanOrEqual(0);
    expect(out.specialTileChance).toBeLessThanOrEqual(1);
    const maxed: WaveConfig = { ...base, specialTileChance: 0.95 };
    expect(applyModifierToWaveConfig(maxed, BLAST_MODIFIERS.bombParty).specialTileChance).toBeLessThanOrEqual(1);
  });

  it('every catalog modifier produces a valid config (probabilities in range, moves >= 1)', () => {
    for (const id of ALL_IDS) {
      const out = applyModifierToWaveConfig(base, BLAST_MODIFIERS[id]);
      expect(out.specialTileChance).toBeGreaterThanOrEqual(0);
      expect(out.specialTileChance).toBeLessThanOrEqual(1);
      expect(out.goldDistribution).toBeGreaterThanOrEqual(0);
      expect(out.iceDistribution).toBeGreaterThanOrEqual(0);
      expect(out.movesAllowed).toBeGreaterThanOrEqual(1);
      expect(out.vowelModifier).toBeGreaterThan(0);
    }
  });
});

describe('blastModifiers — score multipliers', () => {
  // The multiplier is composed into the existing buff-multiplier pipeline at the
  // useBlastWordHandler chokepoint (BlastGame), so here we just lock the catalog values.
  it('doubleDown doubles word score', () => {
    expect(BLAST_MODIFIERS.doubleDown.scoreMultiplier).toBe(2);
  });

  it('every scoreMultiplier (when present) is > 1', () => {
    for (const id of ALL_IDS) {
      const m = BLAST_MODIFIERS[id].scoreMultiplier;
      if (m !== undefined) expect(m).toBeGreaterThan(1);
    }
  });
});

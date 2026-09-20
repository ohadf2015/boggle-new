import { describe, it, expect } from 'vitest';
import { eliteTrophy, withEliteTrophy } from '../trophy';
import { freshRun, advanceRun } from '../runToken';
import { RELIC_IDS, RELICS } from '../relics';

describe('eliteTrophy — the relic an elite kill mints', () => {
  it('given the same world and relics, then the trophy is the same (client and server agree)', () => {
    expect(eliteTrophy(3, ['magnet'])).toBe(eliteTrophy(3, ['magnet']));
  });

  it('given any world, then the trophy is a rare-or-better relic the run does not own', () => {
    for (let w = 1; w <= 10; w++) {
      const id = eliteTrophy(w, ['magnet', 'long-bow']);
      expect(id).not.toBeNull();
      expect(['magnet', 'long-bow']).not.toContain(id);
      expect(RELICS[id!].rarity).not.toBe('common');
    }
  });

  it('given every rare+ relic is owned, then a common one is minted', () => {
    const rare = RELIC_IDS.filter((id) => RELICS[id].rarity !== 'common');
    const id = eliteTrophy(2, rare);
    expect(id && RELICS[id].rarity).toBe('common');
  });

  it('given every relic is owned, then nothing is minted', () => {
    expect(eliteTrophy(2, RELIC_IDS)).toBeNull();
  });
});

describe('withEliteTrophy — persisting it into the signed run', () => {
  const base = () => advanceRun({ ...freshRun(2, 'u', 'seed'), step: 4 }, { hpLeft: 3, potionsUsed: {}, score: 80 });

  it('given an elite level, then the trophy joins the relics and the next offer never repeats it', () => {
    const before = base();
    const after = withEliteTrophy(before, 4);
    const id = eliteTrophy(2, before.relics)!;
    expect(after.relics).toContain(id);
    expect(after.offer?.some((o) => o.type === 'relic' && o.id === id)).toBe(false);
  });

  it('given a non-elite level, then the run is unchanged', () => {
    const before = base();
    expect(withEliteTrophy(before, 3)).toBe(before);
  });

  it('given the trophy is the heart locket, then max HP and HP both rise by one', () => {
    const before = { ...base(), relics: RELIC_IDS.filter((r) => r !== 'heart-locket'), hp: 3, maxHp: 5 };
    const after = withEliteTrophy(before, 4);
    expect(after.relics).toContain('heart-locket');
    expect(after.maxHp).toBe(6);
    expect(after.hp).toBe(4);
  });
});

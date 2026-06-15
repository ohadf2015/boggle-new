import { AVATAR_SETS, getSetsForPart, getSetProgress } from '../avatarSets';
import { isPremiumPart } from '@/shared/types/customAvatar';

describe('avatarSets', () => {
  it('every set member is a real premium part', () => {
    for (const set of AVATAR_SETS) {
      for (const key of set.parts) {
        const [cat, id] = key.split(':');
        expect(isPremiumPart(cat, id), `${key} should be a premium part`).toBe(true);
      }
    }
  });

  it('finds the sets a part belongs to', () => {
    const sets = getSetsForPart('eyes', 'galaxy');
    expect(sets.map(s => s.id)).toContain('cosmic');
    expect(getSetsForPart('eyes', 'round')).toHaveLength(0);
  });

  it('computes progress against owned keys', () => {
    const cosmic = AVATAR_SETS.find(s => s.id === 'cosmic')!;
    const p = getSetProgress(cosmic, ['eyes:galaxy', 'hair:galaxy']);
    expect(p.owned).toBe(2);
    expect(p.total).toBe(4);
    expect(p.complete).toBe(false);
    expect(p.missing).toContain('accessory:astronaut');
  });

  it('flags a complete set', () => {
    const royal = AVATAR_SETS.find(s => s.id === 'royal')!;
    const p = getSetProgress(royal, royal.parts);
    expect(p.complete).toBe(true);
    expect(p.missing).toHaveLength(0);
  });

  it('reports zero owned for an empty wallet', () => {
    const p = getSetProgress(AVATAR_SETS[0], []);
    expect(p.owned).toBe(0);
    expect(p.complete).toBe(false);
  });
});

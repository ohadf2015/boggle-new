import { describe, it, expect } from 'vitest';
import { chestSrcForPhase } from '../chestPhase';

describe('chestSrcForPhase', () => {
  it('Given the burst frame, Then the open chest art is shown so the frame is never empty', () => {
    expect(chestSrcForPhase('bursting', 'epic')).toBe('/images/classroom-chests/classroom-chest-epic-open.webp');
  });

  it('Given the sealed or shaking chest, Then the closed art is shown', () => {
    expect(chestSrcForPhase('sealed', 'rare')).toBe('/images/classroom-chests/classroom-chest-rare-closed.webp');
    expect(chestSrcForPhase('shaking', 'rare')).toBe('/images/classroom-chests/classroom-chest-rare-closed.webp');
  });

  it('Given the revealed chest, Then the open art is shown', () => {
    expect(chestSrcForPhase('revealed', 'common')).toBe('/images/classroom-chests/classroom-chest-common-open.webp');
  });
});

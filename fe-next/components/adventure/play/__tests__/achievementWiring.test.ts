import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ADVENTURE_ACHIEVEMENTS } from '@/utils/adventureAchievementUtils';

/** Every adventure achievement must be earnable from the play loop, or it shows as a permanently dark tile. */
describe('adventure achievement wiring', () => {
  it('given the achievement catalog, when scanning the play screen, then every id is earned somewhere', () => {
    const src = readFileSync(join(__dirname, '..', 'AdventureLevel.tsx'), 'utf8');
    const unwired = Object.keys(ADVENTURE_ACHIEVEMENTS).filter((id) => !src.includes(`'${id}'`));
    expect(unwired).toEqual([]);
  });
});

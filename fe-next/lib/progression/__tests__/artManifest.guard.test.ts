import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ACHIEVEMENT_ICONS } from '@/constants/achievementIcons';
import { achievementArt, rarityFrameArt, rivalArt, levelUpArt, getAchievementArt } from '../artManifest';

const PUBLIC = path.resolve(__dirname, '../../../public');

const allPaths = [
  ...Object.values(achievementArt),
  ...Object.values(rarityFrameArt).map((f) => f.src),
  ...Object.values(rivalArt),
  levelUpArt,
];

describe('progression art manifest', () => {
  it.each(allPaths)('%s exists under public/ and stays under 40KB', (p) => {
    const file = path.join(PUBLIC, p);
    expect(fs.existsSync(file)).toBe(true);
    expect(fs.statSync(file).size).toBeLessThan(40_000);
  });

  it('has art for every achievement the client knows', () => {
    const missing = Object.keys(ACHIEVEMENT_ICONS).filter((k) => !getAchievementArt(k));
    expect(missing).toEqual([]);
  });

  it('resolves lowercase ids', () => {
    expect(getAchievementArt('rivalry_first_win')).toBe('/progression/badges/rivalry_first_win.webp');
  });
});

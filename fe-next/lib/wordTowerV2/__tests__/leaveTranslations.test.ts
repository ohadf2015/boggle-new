import { describe, it, expect } from 'vitest';
import { en } from '../../../translations/en';
import { es } from '../../../translations/es';
import { he } from '../../../translations/he';
import { ja } from '../../../translations/ja';
import { ru } from '../../../translations/ru';
import { sv } from '../../../translations/sv';

describe('wordTowerV2 leave translations', () => {
  const locales = { en, es, he, ja, ru, sv };

  it('should have all four required keys in each locale', () => {
    Object.entries(locales).forEach(([locale, translations]) => {
      const wt2 = (translations as any).wordTowerV2;
      expect(wt2.leaveDaily, `Missing leaveDaily in ${locale}`).toBeDefined();
      expect(wt2.leaveFree, `Missing leaveFree in ${locale}`).toBeDefined();
      expect(wt2.leaveKeep, `Missing leaveKeep in ${locale}`).toBeDefined();
      expect(wt2.leaveGo, `Missing leaveGo in ${locale}`).toBeDefined();
    });
  });

  it('should have title and desc in daily and free objects', () => {
    Object.entries(locales).forEach(([locale, translations]) => {
      const wt2 = (translations as any).wordTowerV2;
      expect(wt2.leaveDaily.title, `Missing leaveDaily.title in ${locale}`).toBeDefined();
      expect(wt2.leaveDaily.desc, `Missing leaveDaily.desc in ${locale}`).toBeDefined();
      expect(wt2.leaveFree.title, `Missing leaveFree.title in ${locale}`).toBeDefined();
      expect(wt2.leaveFree.desc, `Missing leaveFree.desc in ${locale}`).toBeDefined();
    });
  });

  it('should not have "resume" language in daily copy', () => {
    const dailyEnDesc = (en as any).wordTowerV2.leaveDaily.desc;
    expect(dailyEnDesc).not.toContain('resume');
    expect(dailyEnDesc).not.toContain('Resume');
  });

  it('should not have "one per day" or daily-specific language in free run copy', () => {
    const freeEnDesc = (en as any).wordTowerV2.leaveFree.desc;
    expect(freeEnDesc).not.toMatch(/one per day/i);
    expect(freeEnDesc).not.toMatch(/daily|reset tomorrow/i);
  });

  it('should not contain invalid Hebrew words', () => {
    const heDaily = (he as any).wordTowerV2.leaveDaily.desc;
    const heFree = (he as any).wordTowerV2.leaveFree.desc;

    // "מורלות" is not a valid Hebrew word
    expect(heDaily + heFree).not.toContain('מורלות');

    // "יצפה" means "will watch" not "will count"
    expect(heDaily + heFree).not.toContain('יצפה');
  });

  it('should use correct Hebrew verbs for "count"', () => {
    const heDaily = (he as any).wordTowerV2.leaveDaily.desc;
    // Should use forms of יחושב/חישב (will count) or יישמר (will be saved)
    expect(heDaily).toMatch(/יחושב|יישמר|יחושבו|חישבו/);
  });

  it('should describe leaving as ending the climb/run, not resuming', () => {
    const enDaily = (en as any).wordTowerV2.leaveDaily.desc;
    const enFree = (en as any).wordTowerV2.leaveFree.desc;

    expect(enDaily).toMatch(/[Ll]eaving.*[Ee]nds?|[Ee]nds?.*climb/);
    expect(enFree).toMatch(/[Ll]eaving.*[Ee]nds?|[Ee]nds?.*run/);
  });
});

/**
 * Miss-gap → Unplugged / reteach Live deep-link contract (#959 / #1120).
 */
import { describe, it, expect } from 'vitest';
import {
  buildMissGapUnpluggedReteachDeeplink,
  isUnpluggedReteachLiveDeeplinkPath,
} from '../missGapUnpluggedReteachDeeplink';

describe('buildMissGapUnpluggedReteachDeeplink', () => {
  it('builds Unplugged + Classic + reteach Live paths with missed words and no student names', () => {
    const link = buildMissGapUnpluggedReteachDeeplink({
      locale: 'en',
      lesson: 'Physics 101',
      teacher: 'Ms. Cohen',
      missedWords: ['neutron', 'quark'],
      found: 1,
      total: 3,
    });

    expect(link).not.toBeNull();
    expect(link!.unpluggedPath).toMatch(/^\/en\/education\/unplugged-reteach\?/);
    expect(link!.unpluggedPath).toContain('missed=neutron');
    expect(link!.unpluggedPath).toContain('quark');
    expect(link!.unpluggedPath).toContain('lesson=Physics');
    expect(link!.unpluggedPath).toContain('lang=en');
    expect(link!.unpluggedPath).not.toContain('Maya');
    expect(link!.unpluggedPath).not.toContain('Noa');

    expect(link!.classicUnpluggedPath).toMatch(/^\/en\/education\/classic-unplugged\?/);
    expect(link!.classicUnpluggedPath).toContain('missed=neutron');

    expect(link!.reteachLivePath).toBe(
      '/en/multiplayer?fromLesson=true&autoCreate=true',
    );
    expect(link!.reteachLiveData).not.toBeNull();
    expect(link!.reteachLiveData!.vocabularyWords).toEqual(
      expect.arrayContaining(['neutron', 'quark']),
    );
    expect(JSON.stringify(link!.reteachLiveData)).not.toContain('Maya');
  });

  it('accepts a class-gap / miss-gap assignment payload', () => {
    const link = buildMissGapUnpluggedReteachDeeplink({
      locale: 'he',
      lesson: 'שיעור',
      teacher: '',
      found: 0,
      total: 2,
      missedWords: ['שלום', 'עולם'],
    });
    expect(link).not.toBeNull();
    expect(link!.unpluggedPath.startsWith('/he/education/unplugged-reteach?')).toBe(true);
    expect(decodeURIComponent(link!.unpluggedPath)).toContain('שלום');
    expect(isUnpluggedReteachLiveDeeplinkPath(link!.unpluggedPath)).toBe(true);
  });

  it('returns null when there are no missed words', () => {
    expect(
      buildMissGapUnpluggedReteachDeeplink({
        locale: 'en',
        missedWords: [],
      }),
    ).toBeNull();
  });

  it('isUnpluggedReteachLiveDeeplinkPath rejects empty or wrong routes', () => {
    expect(isUnpluggedReteachLiveDeeplinkPath('/en/education/unplugged-reteach')).toBe(false);
    expect(isUnpluggedReteachLiveDeeplinkPath('/en/education/miss-gap-assignment?missed=a')).toBe(
      false,
    );
    expect(
      isUnpluggedReteachLiveDeeplinkPath('/en/education/unplugged-reteach?missed=neutron'),
    ).toBe(true);
  });
});

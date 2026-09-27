import { describe, it, expect } from 'vitest';
import {
  buildTeamTilesUnpluggedPath,
  buildTeamTilesUnpluggedUrl,
} from '../teamTilesUnplugged';
import type { ClassGapSharePayload } from '../classGapShare';

const payload: ClassGapSharePayload = {
  locale: 'en',
  lesson: 'Physics 101',
  teacher: 'Ms. Cohen',
  found: 2,
  total: 3,
  missedWords: ['neutron', 'quark'],
};

describe('teamTilesUnplugged', () => {
  it('builds a relative path with missed words and no student names', () => {
    const path = buildTeamTilesUnpluggedPath(payload);
    expect(path).toMatch(/^\/en\/education\/team-tiles-unplugged\?/);
    expect(path).toContain('missed=neutron');
    expect(path).toContain('quark');
    expect(path).toContain('lesson=Physics');
    expect(path).toContain('lang=en');
    expect(path).not.toContain('Maya');
  });

  it('accepts ClassGapShareInput and sanitizes like class-gap', () => {
    const path = buildTeamTilesUnpluggedPath({
      locale: 'es',
      lessonNames: ['Lección'],
      teacherName: 'Profe',
      found: 1,
      total: 2,
      missedWords: ['átomo', ''],
    });
    expect(path.startsWith('/es/education/team-tiles-unplugged?')).toBe(true);
    expect(decodeURIComponent(path)).toContain('átomo');
  });

  it('builds an absolute lexiclash.live URL (never lexiclash.com)', () => {
    const url = buildTeamTilesUnpluggedUrl(payload);
    expect(url.startsWith('https://www.lexiclash.live/en/education/team-tiles-unplugged?')).toBe(
      true,
    );
    expect(url).not.toContain('lexiclash.com');
  });

  it('omits missed param when empty', () => {
    const path = buildTeamTilesUnpluggedPath({ ...payload, missedWords: [] });
    expect(path).not.toContain('missed=');
  });
});

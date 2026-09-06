import { describe, it, expect } from 'vitest';
import {
  buildUnpluggedReteachPath,
  buildUnpluggedReteachUrl,
} from '../unpluggedReteachLive';
import type { ClassGapSharePayload } from '../classGapShare';

const payload: ClassGapSharePayload = {
  locale: 'en',
  lesson: 'Physics 101',
  teacher: 'Ms. Cohen',
  found: 2,
  total: 3,
  missedWords: ['neutron', 'quark'],
};

describe('unpluggedReteachLive', () => {
  it('builds a relative path with missed words and no student names', () => {
    const path = buildUnpluggedReteachPath(payload);
    expect(path).toMatch(/^\/en\/education\/unplugged-reteach\?/);
    expect(path).toContain('missed=neutron');
    expect(path).toContain('quark');
    expect(path).toContain('lesson=Physics');
    expect(path).toContain('lang=en');
    expect(path).not.toContain('Maya');
    expect(path).not.toContain('Noa');
  });

  it('accepts ClassGapShareInput and caps/sanitizes like class-gap', () => {
    const path = buildUnpluggedReteachPath({
      locale: 'es',
      lessonNames: ['Lección'],
      teacherName: 'Profe',
      found: 1,
      total: 2,
      missedWords: ['átomo', ''],
    });
    expect(path.startsWith('/es/education/unplugged-reteach?')).toBe(true);
    expect(path).toContain('missed');
    expect(decodeURIComponent(path)).toContain('átomo');
  });

  it('builds an absolute lexiclash.live URL', () => {
    const url = buildUnpluggedReteachUrl(payload);
    expect(url.startsWith('https://www.lexiclash.live/en/education/unplugged-reteach?')).toBe(true);
    expect(url).not.toContain('lexiclash.com');
  });

  it('omits missed param when empty', () => {
    const path = buildUnpluggedReteachPath({ ...payload, missedWords: [] });
    expect(path).not.toContain('missed=');
  });
});

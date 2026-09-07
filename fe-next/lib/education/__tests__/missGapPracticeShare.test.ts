import { describe, it, expect } from 'vitest';
import {
  buildMissGapPracticePath,
  buildMissGapPracticeShareUrl,
  buildMissGapPracticeOgImageUrl,
} from '../missGapPracticeShare';

const input = {
  locale: 'en',
  lessonNames: ['Physics 101'],
  teacherName: 'Ms. Cohen',
  found: 2,
  total: 3,
  missedWords: ['neutron', 'quark'],
};

describe('missGapPracticeShare', () => {
  it('builds an absolute lexiclash.live share URL with class-level missed words', () => {
    const url = buildMissGapPracticeShareUrl(input);
    expect(url.startsWith('https://www.lexiclash.live/en/education/miss-gap-practice?')).toBe(true);
    const u = new URL(url);
    expect(u.searchParams.get('lesson')).toBe('Physics 101');
    expect(u.searchParams.get('teacher')).toBe('Ms. Cohen');
    expect(u.searchParams.get('missed')).toBe('neutron,quark');
    expect(u.searchParams.get('lang')).toBe('en');
    expect(url).not.toContain('Maya');
    expect(url).not.toContain('lexiclash.com');
  });

  it('builds a relative in-app path', () => {
    const path = buildMissGapPracticePath(input);
    expect(path.startsWith('/en/education/miss-gap-practice?')).toBe(true);
    expect(path).toContain('neutron');
  });

  it('builds an OG image URL on lexiclash.live', () => {
    const url = buildMissGapPracticeOgImageUrl(input);
    expect(url.startsWith('https://www.lexiclash.live/api/og/miss-gap-practice?')).toBe(true);
    expect(url).toContain('neutron');
  });

  it('accepts an already-normalized ClassGapSharePayload', () => {
    const url = buildMissGapPracticeShareUrl({
      locale: 'es',
      lesson: 'Física',
      teacher: 'Sra. Ruiz',
      found: 1,
      total: 2,
      missedWords: ['fotón'],
    });
    expect(url).toContain('/es/education/miss-gap-practice?');
    expect(new URL(url).searchParams.get('missed')).toBe('fotón');
    expect(new URL(url).searchParams.get('lang')).toBe('es');
  });

  it('dedupes and caps like the #957 practice sheet (no empty words)', () => {
    const url = buildMissGapPracticeShareUrl({
      ...input,
      missedWords: ['  neutron ', '', 'NEUTRON', 'a'.repeat(40)],
    });
    const missed = (new URL(url).searchParams.get('missed') || '').split(',');
    expect(missed.filter((w) => w.toLowerCase() === 'neutron')).toHaveLength(1);
    expect(missed.every((w) => w.length > 0 && w.length <= 32)).toBe(true);
  });
});

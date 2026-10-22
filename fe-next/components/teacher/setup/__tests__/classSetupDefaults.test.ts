import { describe, it, expect } from 'vitest';
import { GRADE_BANDS, defaultClassLanguage, resolveClassName, classCap } from '../classSetupDefaults';
import { EDUCATION_LANGUAGES } from '@/lib/supabase/education/types';

const t = (k: string, p?: Record<string, unknown>) => (p ? `T(${k}:${JSON.stringify(p)})` : `T(${k})`);

describe('class setup defaults', () => {
  it('Given the five grade bands, Then each has a label key', () => {
    expect(GRADE_BANDS).toEqual(['k2', 'g35', 'g68', 'g912', 'adult']);
  });

  it('Given the teacher’s UI language, Then the class language defaults to it when supported', () => {
    expect(defaultClassLanguage('he')).toBe('he');
    expect(defaultClassLanguage('fr')).toBe('en');
  });

  it('Given any UI language the classroom routes accept, Then the class keeps it (a Spanish teacher gets Spanish)', () => {
    for (const lang of EDUCATION_LANGUAGES) expect(defaultClassLanguage(lang)).toBe(lang);
  });

  it('Given an empty name, Then the grade band names the class; a typed name always wins', () => {
    expect(resolveClassName('', 'g35', t, [])).toBe('T(eduShell.setup.gradeName.g35)');
    expect(resolveClassName('  5B English ', 'g35', t, [])).toBe('5B English');
    expect(resolveClassName('', null, t, [])).toBe('T(eduShell.setup.defaultName:{"n":1})');
    expect(resolveClassName('', null, t, ['A', 'B'])).toBe('T(eduShell.setup.defaultName:{"n":3})');
  });

  it('Given a name already taken, Then it never silently clones the class', () => {
    expect(resolveClassName('5B', null, t, ['5b'])).toBe('5B (2)');
  });

  it('Given a free teacher, Then the cap meter counts toward the free limit; Pro has none', () => {
    expect(classCap({ count: 2, hasPro: false, limit: 3 })).toEqual({ count: 2, limit: 3, atLimit: false });
    expect(classCap({ count: 3, hasPro: false, limit: 3 }).atLimit).toBe(true);
    expect(classCap({ count: 9, hasPro: true, limit: 3 })).toBeNull();
  });
});

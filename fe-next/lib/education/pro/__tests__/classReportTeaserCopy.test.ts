import { describe, it, expect } from 'vitest';
import { CLASS_REPORT_TEASER_LOCALES, classReportTeaserBody, classReportTeaserCopy } from '../classReportTeaserCopy';

describe('class report teaser copy', () => {
  it('covers all 6 languages with distinct, complete copy', () => {
    expect([...CLASS_REPORT_TEASER_LOCALES].sort()).toEqual(['en', 'es', 'he', 'ja', 'ru', 'sv']);
    const buttons = new Set<string>();
    for (const l of CLASS_REPORT_TEASER_LOCALES) {
      const c = classReportTeaserCopy(l);
      for (const v of Object.values(c)) expect(v.trim().length).toBeGreaterThan(0);
      expect(c.bodyStruggled).toContain('{count}');
      buttons.add(c.button);
    }
    expect(buttons.size).toBe(6);
  });

  it('falls back to English and handles regional tags', () => {
    expect(classReportTeaserCopy('fr').button).toBe("See this class's report");
    expect(classReportTeaserCopy('es-MX').button).toBe('Ver el informe de esta clase');
  });

  it('says how many students struggled, never who', () => {
    const c = classReportTeaserCopy('en');
    expect(classReportTeaserBody(c, 3)).toMatch(/^3 students found under half/);
    expect(classReportTeaserBody(c, 1)).toMatch(/^1 student found/);
    expect(classReportTeaserBody(c, 0)).toBe(c.bodyNone);
  });
});

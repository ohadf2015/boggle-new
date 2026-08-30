import { describe, it, expect } from 'vitest';

/**
 * Test that Quick Start translation keys exist in all locales and are properly formatted.
 * This test validates the translation infrastructure before the component rendering test.
 */
describe('StudentHubPlayZone.quickStart - Translation Keys Exist', () => {
  // Import translation files directly
  const translationFiles = [
    { name: 'en', path: '/Users/ohadfisher/git/boggle-new/fe-next/translations/en.js' },
    { name: 'es', path: '/Users/ohadfisher/git/boggle-new/fe-next/translations/es.js' },
    { name: 'he', path: '/Users/ohadfisher/git/boggle-new/fe-next/translations/he.js' },
    { name: 'ja', path: '/Users/ohadfisher/git/boggle-new/fe-next/translations/ja.js' },
    { name: 'ru', path: '/Users/ohadfisher/git/boggle-new/fe-next/translations/ru.js' },
    { name: 'sv', path: '/Users/ohadfisher/git/boggle-new/fe-next/translations/sv.js' },
  ];

  const requiredKeys = ['title', 'subtitle', 'action'];

  it('should have quickStart.title key in all locales', async () => {
    for (const file of translationFiles) {
      // Use dynamic import to load translation files
      const mod = await import(file.path);
      const locale = mod[file.name.charAt(0).toUpperCase() + file.name.slice(1)] || mod.default || mod[file.name];

      expect(locale, `${file.name} should export translations`).toBeDefined();
      expect(locale.student, `${file.name}.student should be defined`).toBeDefined();
      expect(locale.student.quickStart, `${file.name}.student.quickStart should be defined`).toBeDefined();
      expect(locale.student.quickStart.title, `${file.name}.student.quickStart.title should exist`).toBeTruthy();
    }
  });

  it('should have all required quickStart keys in English', async () => {
    const mod = await import('/Users/ohadfisher/git/boggle-new/fe-next/translations/en.js');
    const en = mod.en;

    expect(en.student.quickStart).toBeDefined();

    requiredKeys.forEach(key => {
      expect(en.student.quickStart[key as keyof typeof en.student.quickStart]).toBeDefined();
      expect(en.student.quickStart[key as keyof typeof en.student.quickStart]).not.toBe('');
      expect(typeof en.student.quickStart[key as keyof typeof en.student.quickStart]).toBe('string');
    });
  });

  it('English quickStart keys should have proper values', async () => {
    const mod = await import('/Users/ohadfisher/git/boggle-new/fe-next/translations/en.js');
    const en = mod.en;

    expect(en.student.quickStart.title).toBe('Start Learning');
    expect(en.student.quickStart.subtitle).toBe('Practice vocabulary from your lessons');
    expect(en.student.quickStart.action).toBe('Start Now');
  });

  it('should have Hebrew quickStart keys', async () => {
    const mod = await import('/Users/ohadfisher/git/boggle-new/fe-next/translations/he.js');
    const he = mod.he;

    expect(he.student.quickStart.title).toBeTruthy();
    expect(he.student.quickStart.subtitle).toBeTruthy();
    expect(he.student.quickStart.action).toBeTruthy();

    // Verify it's actual Hebrew text, not English or a key name
    // Hebrew characters should include at least one letter from the Hebrew Unicode range
    const hebrewPattern = /[֐-׿]/;
    expect(hebrewPattern.test(he.student.quickStart.title)).toBe(true);
  });

  it('should have Spanish quickStart keys', async () => {
    const mod = await import('/Users/ohadfisher/git/boggle-new/fe-next/translations/es.js');
    const es = mod.es;

    expect(es.student.quickStart.title).toBe('Comienza a aprender');
    expect(es.student.quickStart.subtitle).toBe('Practica vocabulario de tus lecciones');
    expect(es.student.quickStart.action).toBe('Comenzar');
  });

  it('should have Japanese quickStart keys', async () => {
    const mod = await import('/Users/ohadfisher/git/boggle-new/fe-next/translations/ja.js');
    const ja = mod.ja;

    expect(ja.student.quickStart.title).toBeTruthy();
    expect(ja.student.quickStart.subtitle).toBeTruthy();
    expect(ja.student.quickStart.action).toBeTruthy();
  });

  it('should have Russian quickStart keys', async () => {
    const mod = await import('/Users/ohadfisher/git/boggle-new/fe-next/translations/ru.js');
    const ru = mod.ru;

    expect(ru.student.quickStart.title).toBeTruthy();
    expect(ru.student.quickStart.subtitle).toBeTruthy();
    expect(ru.student.quickStart.action).toBeTruthy();
  });

  it('should have Swedish quickStart keys', async () => {
    const mod = await import('/Users/ohadfisher/git/boggle-new/fe-next/translations/sv.js');
    const sv = mod.sv;

    expect(sv.student.quickStart.title).toBeTruthy();
    expect(sv.student.quickStart.subtitle).toBeTruthy();
    expect(sv.student.quickStart.action).toBeTruthy();
  });
});

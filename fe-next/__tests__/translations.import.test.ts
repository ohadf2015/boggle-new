/**
 * Test to verify translations can be imported in browser-compatible way
 */
describe('Translations ES Module Import', () => {
  it('should successfully import translations using ES module syntax', async () => {
    // This import should work without throwing "module is not defined"
    const { translations } = await import('../translations/index.js');

    expect(translations).toBeDefined();
    expect(typeof translations).toBe('object');
  });

  it('should have all required language objects', async () => {
    const { translations } = await import('../translations/index.js');

    // Verify all language objects exist
    expect(translations.en).toBeDefined();
    expect(translations.he).toBeDefined();
    expect(translations.sv).toBeDefined();
    expect(translations.ja).toBeDefined();
    expect(translations.es).toBeDefined();

    // Verify they are objects
    expect(typeof translations.en).toBe('object');
    expect(typeof translations.he).toBe('object');
    expect(typeof translations.sv).toBe('object');
    expect(typeof translations.ja).toBe('object');
    expect(typeof translations.es).toBe('object');
  });

  it('should have required properties on language objects', async () => {
    const { translations } = await import('../translations/index.js');

    // Check each language has basic required properties
    for (const lang of ['en', 'he', 'sv', 'ja', 'es'] as const) {
      const langObj = translations[lang];

      expect(langObj.flag).toBeDefined();
      expect(langObj.name).toBeDefined();
      expect(langObj.direction).toBeDefined();
      expect(['ltr', 'rtl']).toContain(langObj.direction);
    }
  });
});

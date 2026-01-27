/**
 * Test to verify translations can be imported without Node.js-specific APIs
 * This test reproduces the bug where `module is not defined` in browser context
 */
describe('Translations Module Format', () => {
  it('should not use CommonJS module or require syntax', () => {
    const fs = require('fs');
    const path = require('path');

    // Read the translations/index.js file
    const translationsIndexPath = path.join(__dirname, '../translations/index.js');
    const content = fs.readFileSync(translationsIndexPath, 'utf8');

    // Check for CommonJS syntax that breaks in browser
    expect(content).not.toContain('module.exports');
    expect(content).not.toContain('require(');
  });

  it('should export translations object with all languages', async () => {
    const { translations } = await import('../translations/index.js');

    // Verify all languages are present
    expect(translations).toBeDefined();
    expect(translations.en).toBeDefined();
    expect(translations.he).toBeDefined();
    expect(translations.sv).toBeDefined();
    expect(translations.ja).toBeDefined();
    expect(translations.es).toBeDefined();
  });
});

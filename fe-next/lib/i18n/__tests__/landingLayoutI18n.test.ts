import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const LAYOUT = readFileSync(join(__dirname, '../../../app/[locale]/layout.tsx'), 'utf8');
const BUILDER = readFileSync(join(__dirname, '../../../scripts/build-i18n-assets.ts'), 'utf8');
const LOADER = readFileSync(join(__dirname, '../../../translations/loadTranslation.ts'), 'utf8');
const PROXY = readFileSync(join(__dirname, '../../../proxy.ts'), 'utf8');

describe('landing first-paint i18n', () => {
  it('gates the full hashed catalogue behind isLandingPath so /en does not beforeInteractive it', () => {
    expect(LAYOUT).toMatch(/isLandingPath/);
    expect(LAYOUT).toMatch(/landingMessagesSrc/);
    expect(LAYOUT).toMatch(/lexi-i18n-messages-landing/);
    expect(LAYOUT).toMatch(/strategy="beforeInteractive"/);
    expect(LAYOUT).toMatch(/isLanding \?/);
    expect(LAYOUT).toContain('id="lexi-i18n-messages"');
  });

  it('builds a per-locale landing asset, not only the 500KiB full catalogue', () => {
    expect(BUILDER).toMatch(/pickLandingMessages/);
    expect(BUILDER).toMatch(/landing/);
  });

  it('does not treat a partial landing catalogue as the full one', () => {
    expect(LOADER).toMatch(/isPartialCatalogue|__partial/);
  });

  it('forwards the request pathname into the locale layout', () => {
    expect(PROXY).toMatch(/x-lc-pathname/);
  });
});

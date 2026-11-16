/**
 * The site only ships a dark theme (the locale layout adds `dark` to <html> and
 * nothing ever switches to light). The CSS sets `color-scheme: dark` on html, but
 * the browser only learns that once the stylesheet is parsed. Without a
 * `<meta name="color-scheme">` in the head, dark-mode visitors can get a white
 * first paint, and native controls and scrollbars can render light.
 *
 * Next emits that meta from the `colorScheme` field of the viewport export.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const localeLayout = readFileSync(join(__dirname, '..', 'layout.tsx'), 'utf8');

describe('locale layout color-scheme', () => {
  it('Given the dark-only theme, When the viewport is exported, Then it declares colorScheme dark', () => {
    const viewport = localeLayout.match(/export const viewport = \{([\s\S]*?)\n\};/);
    expect(viewport, 'viewport export').not.toBeNull();
    expect(viewport![1]).toMatch(/colorScheme:\s*'dark'/);
  });

  it('Given the layout, When rendered, Then <html> still carries the dark class the meta describes', () => {
    expect(localeLayout).toMatch(/<html[^>]*className=\{`dark /);
  });
});

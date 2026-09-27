/**
 * bec779286 added teacher.pulse.state.loading ("Checking…") and, by accident, a second
 * `"loading"` inside `common` in five locales. A later duplicate key wins in an object literal,
 * so every generic loader in the app read "Checking…" instead of the playful common.loading.
 * Guard: `common` declares `loading` exactly once in every locale file.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

function commonBlock(src: string): string {
  const start = src.indexOf('\n  "common": {');
  const end = src.indexOf('\n  },', start);
  return src.slice(start, end);
}

describe('common.loading is declared once per locale', () => {
  it.each(LOCALES)('%s', (locale) => {
    const src = readFileSync(join(__dirname, '..', 'translations', `${locale}.js`), 'utf8');
    const hits = commonBlock(src).match(/\n {4}"loading":/g) ?? [];
    expect(hits).toHaveLength(1);
  });
});

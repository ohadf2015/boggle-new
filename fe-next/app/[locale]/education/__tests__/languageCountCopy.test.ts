/**
 * Nothing that becomes a `<meta>` tag may undercount the languages.
 *
 * Three rounds of guards scanned SOURCE FILES and still missed this, because the
 * strings do not live in the files anyone thought to scan. The sitewide JSON-LD
 * `description` is `seo.description` from `translations/layout.ts`, and the
 * `/education` hub's meta/og/twitter descriptions come from the `education.seo.*`
 * keys in `translations/*.js`. Both said "5 languages" while every page under them
 * said six — so the share card contradicted the page it was sharing.
 *
 * So this test imports the METADATA OBJECTS rather than reading files, which is the
 * only way to be sure it is looking at the strings that actually ship. It walks
 * every locale, and it does not care which file the string came from.
 *
 * `i18n/config.ts` ships six locales; `HREFLANG_LOCALES` is the same six.
 */
import { describe, it, expect } from 'vitest';
import { HREFLANG_LOCALES } from '@/lib/seo/hreflang';
import { layoutTranslations } from '@/translations/layout';
import { en } from '@/translations/en';
import { es } from '@/translations/es';
import { he } from '@/translations/he';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';
import { sv } from '@/translations/sv';

const CATALOGUES: Array<[string, unknown]> = [
  ['en', en], ['es', es], ['he', he], ['ja', ja], ['ru', ru], ['sv', sv],
];

/** Any count of languages/dictionaries that is not the number of locales we build. */
const UNDERCOUNT =
  /\b(?!6\b)\d{1,2}\s+(languages|dictionaries)\b|\b(five|four)\s+languages\b|\b(?!6\b)\d{1,2}\s+(idiomas|diccionarios)\b|\b(?!6\b)\d{1,2}\s+(språk|ordböcker)\b|\b(?!6\b)\d{1,2}\s+(שפות|מילונים)|\b(?!6\b)\d{1,2}\s+(языков|словарей)|(?<!ほかの)(?<!他の)(?!6)\d{1,2}(つの)?(言語|辞書)/i;

function walk(node: unknown, path: string[] = []): Array<[string, string]> {
  if (typeof node === 'string') return [[path.join('.'), node]];
  if (!node || typeof node !== 'object') return [];
  return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) =>
    walk(v, [...path, k]),
  );
}

describe('the locale count is six', () => {
  it('matches the hreflang locale list', () => {
    expect(HREFLANG_LOCALES.length).toBe(6);
  });
});

describe('layout translations — the sitewide JSON-LD description comes from here', () => {
  const entries = walk(layoutTranslations);

  it('has strings to check', () => {
    expect(entries.length).toBeGreaterThan(20);
  });

  it('never undercounts the languages', () => {
    const bad = entries
      .filter(([, v]) => UNDERCOUNT.test(v))
      .map(([k, v]) => `${k}: "${v.slice(0, 120)}"`);
    expect(bad.join('\n') || null).toBeNull();
  });
});

describe.each(CATALOGUES)('%s education/teacher metadata', (_locale, catalogue) => {
  /**
   * Scoped to the education and teacher surfaces plus anything named like metadata,
   * which is where a share card is built. A repo-wide sweep would fail on unrelated
   * marketing copy that another team owns.
   */
  const entries = walk(catalogue).filter(([k]) =>
    /^(education|teacher)\./.test(k) || /\b(seo|meta|og|twitter)/i.test(k),
  );

  it('has strings to check', () => {
    expect(entries.length).toBeGreaterThan(10);
  });

  it('never undercounts the languages', () => {
    const bad = entries
      .filter(([, v]) => UNDERCOUNT.test(v))
      .map(([k, v]) => `${k}: "${v.slice(0, 120)}"`);
    expect(bad.join('\n') || null).toBeNull();
  });
});

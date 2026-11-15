/**
 * Comparison pages (`app/[locale]/lexiclash-vs-*`) must show their body in the
 * visitor's language. /he/lexiclash-vs-kahoot used to render an English hero,
 * intro, table, FAQ and link buttons next to a Hebrew Teacher Pro card because
 * the page hard-coded English and only the shared strips were translated.
 *
 * Ratchet: a page is either localized (imports `./copy`, which must ship all
 * six locales with no English left in the other five) or listed in
 * ENGLISH_ONLY_PENDING. Localizing a page means removing it from the list;
 * the list may only shrink.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { locales } from '@/i18n/config';

const APP_LOCALE_DIR = join(__dirname, '..', '..', '..', 'app', '[locale]');

/** Pages whose body is still English-only. Do not add to this list. */
const ENGLISH_ONLY_PENDING = new Set<string>([
  'lexiclash-vs-apalabrados',
  'lexiclash-vs-blooket',
  'lexiclash-vs-cabanagrams',
  'lexiclash-vs-flocabulary',
  'lexiclash-vs-popple',
  'lexiclash-vs-puzzly-words',
  'lexiclash-vs-quizlet',
  'lexiclash-vs-scrabble',
  'lexiclash-vs-wordfeud',
  'lexiclash-vs-wordwall',
  'lexiclash-vs-wordwall-kahoot-quizlet',
]);

/** Pages localized through `./copy`: each loads its `copy.ts` for the checks below. */
const LOCALIZED_COPY: Record<string, () => Promise<{ default?: unknown; copies: Record<string, unknown> }>> = {
  'lexiclash-vs-classpoint': () => import('../../../app/[locale]/lexiclash-vs-classpoint/copy'),
  'lexiclash-vs-kahoot': () => import('../../../app/[locale]/lexiclash-vs-kahoot/copy'),
  'lexiclash-vs-mentimeter': () => import('../../../app/[locale]/lexiclash-vs-mentimeter/copy'),
  'lexiclash-vs-nearpod': () => import('../../../app/[locale]/lexiclash-vs-nearpod/copy'),
  'lexiclash-vs-padlet': () => import('../../../app/[locale]/lexiclash-vs-padlet/copy'),
  'lexiclash-vs-peardeck': () => import('../../../app/[locale]/lexiclash-vs-peardeck/copy'),
  'lexiclash-vs-socrative': () => import('../../../app/[locale]/lexiclash-vs-socrative/copy'),
  'lexiclash-vs-wayground': () => import('../../../app/[locale]/lexiclash-vs-wayground/copy'),
  'lexiclash-vs-wooclap': () => import('../../../app/[locale]/lexiclash-vs-wooclap/copy'),
};

/**
 * Pages that handle other locales by an older mechanism, so they never show a
 * mixed-language body: a per-page `content.ts` with all six locales, the
 * translation catalogue (`translateKey`), or a permanent redirect to /en.
 */
const OTHER_MECHANISMS = [/from '\.\/content'/, /\btranslateKey\b/, /\benglishComparisonRedirect\b/];

const vsDirs = readdirSync(APP_LOCALE_DIR).filter(
  (d) => d.startsWith('lexiclash-vs-') && existsSync(join(APP_LOCALE_DIR, d, 'page.tsx')),
);

function leaves(value: unknown, path = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((v, i) => leaves(v, `${path}[${i}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  }
  return [];
}

/** Product names and "vs" read the same in every locale (e.g. "LexiClash vs Quizlet"). */
const NEUTRAL = /\S*[/…]\S*|[a-z0-9.-]+\.(?:com|io|help)\S*|LexiClash|Kahoot|Quizlet|Wordle|Gimkit|Blooket|Wordwall|Flocabulary|SpellingCity|Starter|ClassPoint|Socrative|Mentimeter|Nearpod|Padlet|Pear Deck|Wooclap|Wayground|Quizizz|Neon Free|Teacher (?:Free|Premium)|Flashcard Factory|Reflect & Review|Space Race|Sandbox|Google|Microsoft|PowerPoint|Silver|Gold|Platinum|Basic|Free|Premium|\bPro\b|Teacher Pro|\bvs\b|\bPlus\b|\b(?:EN|HE|SV|JA|ES|RU)\b|[^A-Za-z]/gi;

const SCRIPT: Record<string, RegExp> = {
  he: /[֐-׿]/,
  ja: /[぀-ヿ一-鿿]/,
  ru: /[Ѐ-ӿ]/,
};

describe('lexiclash-vs-* pages are localized', () => {
  it.each(vsDirs)('%s is either localized or on the pending list', (dir) => {
    const page = readFileSync(join(APP_LOCALE_DIR, dir, 'page.tsx'), 'utf8');
    const usesCopy = /from ['"]\.\/copy['"]/.test(page);
    const usesOther = OTHER_MECHANISMS.some((re) => re.test(page));
    if (ENGLISH_ONLY_PENDING.has(dir)) {
      expect(usesCopy || usesOther, `${dir} is localized: remove it from ENGLISH_ONLY_PENDING`).toBe(false);
    } else if (usesCopy) {
      expect(LOCALIZED_COPY[dir], `${dir} must be registered in LOCALIZED_COPY`).toBeDefined();
    } else {
      expect(usesOther, `${dir} renders an English-only body: localize it via ./copy`).toBe(true);
    }
  });

  it('the pending list names only pages that exist', () => {
    for (const dir of ENGLISH_ONLY_PENDING) expect(vsDirs).toContain(dir);
  });

  describe.each(Object.keys(LOCALIZED_COPY))('%s copy', (dir) => {
    it('ships every locale with the same shape as English', async () => {
      const { copies } = await LOCALIZED_COPY[dir]();
      expect(Object.keys(copies).sort()).toEqual([...locales].sort());
      const enShape = leaves(copies.en).map(([p]) => p);
      for (const l of locales) expect(leaves(copies[l]).map(([p]) => p), l).toEqual(enShape);
    });

    it('has no English text left in the other locales', async () => {
      const { copies } = await LOCALIZED_COPY[dir]();
      const en = new Map(leaves(copies.en));
      const untranslated: string[] = [];
      for (const l of locales.filter((x) => x !== 'en')) {
        for (const [path, text] of leaves(copies[l])) {
          const same = text === en.get(path) && text.replace(NEUTRAL, '').length >= 4 && text.length >= 12;
          const wrongScript = SCRIPT[l] && /[A-Za-z]{6,} [A-Za-z]{3,} [A-Za-z]{3,}/.test(text.replace(NEUTRAL, ' ')) && !SCRIPT[l].test(text);
          if (same || wrongScript) untranslated.push(`${l}:${path}`);
        }
      }
      expect(untranslated).toEqual([]);
    });

    it('uses natural Hebrew wording (דו-קרב, never דואלי)', async () => {
      const { copies } = await LOCALIZED_COPY[dir]();
      for (const [, text] of leaves(copies.he)) expect(text).not.toContain('דואל');
    });
  });
});

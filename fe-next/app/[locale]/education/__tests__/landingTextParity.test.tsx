import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import ForSchools, { generateMetadata as metaForSchools } from '../for-schools/page';
import GamesForTeachers, { generateMetadata as metaGamesForTeachers } from '../games-for-teachers/page';
import SpellingBee, { generateMetadata as metaSpellingBee } from '../spelling-bee-practice/page';
import SightWords, { generateMetadata as metaSightWords } from '../sight-words-practice/page';
import EslWordGames, { generateMetadata as metaEslWordGames } from '../esl-word-games/page';
import VocabGames, { generateMetadata as metaVocabGames } from '../vocabulary-games-classroom/page';

// The six teacher-moment landings. They were already on the template before R2,
// but carried no parity snapshot — which is what let the R3 hoist proceed safely.
import BrainBreaks, { generateMetadata as metaBrainBreaks } from '../brain-breaks-word-games/page';
import IndoorRecess, { generateMetadata as metaIndoorRecess } from '../indoor-recess-games/page';
import MiddleSchool, { generateMetadata as metaMiddleSchool } from '../middle-school-word-games/page';
import EarlyFinishers, { generateMetadata as metaEarlyFinishers } from '../early-finishers-activities/page';
import EndOfYear, { generateMetadata as metaEndOfYear } from '../end-of-year-classroom-activities/page';
import Icebreakers, { generateMetadata as metaIcebreakers } from '../first-day-of-school-icebreakers/page';

/**
 * Byte-for-byte parity harness for the six SEO landing pages.
 *
 * These pages were hand-rolled shells that got migrated onto
 * `components/education/EducationLandingTemplate`. The migration is only
 * acceptable if it is invisible: every heading, paragraph, FAQ, link label and
 * metadata field has to survive in all six locales. Prose is what these pages
 * ARE — they rank on it — so a diff here is a regression, not a nit.
 *
 * The snapshots in `__textsnapshots__/` were generated from the PRE-migration
 * pages and are the contract, with one deliberate exception: the he/sv/es/ru
 * TEXT snapshots for `spelling-bee-practice` were regenerated to drop a stray
 * English `FAQ`. The old heading used `faqHeading.split(/FAQ/)` and `split`
 * returns `[whole]` on no match, so the literal was appended to every heading
 * that did not already contain it. `en` and `ja` were unaffected and are
 * untouched. Every other snapshot on every page is the pre-migration render.
 *
 * Regenerate them only when the copy itself is meant to change:
 *
 *   UPDATE_LANDING_TEXT=1 node node_modules/vitest/vitest.mjs run \
 *     'app/[locale]/education/__tests__/landingTextParity.test.tsx'
 *
 * Text is compared unnormalised on purpose. Whitespace collapsing would hide
 * exactly the kind of accidental join ("...todayTen games...") that a template
 * swap introduces.
 */

const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
const SNAP_DIR = join(__dirname, '__textsnapshots__');
const UPDATE = process.env.UPDATE_LANDING_TEXT === '1';

type PageFn = (p: { params: Promise<{ locale: string }> }) => Promise<unknown>;
type MetaFn = (p: { params: Promise<{ locale: string }> }) => Promise<Metadata>;

const PAGES: Array<{ slug: string; page: PageFn; meta: MetaFn }> = [
  { slug: 'for-schools', page: ForSchools as PageFn, meta: metaForSchools as MetaFn },
  { slug: 'games-for-teachers', page: GamesForTeachers as PageFn, meta: metaGamesForTeachers as MetaFn },
  { slug: 'spelling-bee-practice', page: SpellingBee as PageFn, meta: metaSpellingBee as MetaFn },
  { slug: 'sight-words-practice', page: SightWords as PageFn, meta: metaSightWords as MetaFn },
  { slug: 'esl-word-games', page: EslWordGames as PageFn, meta: metaEslWordGames as MetaFn },
  { slug: 'vocabulary-games-classroom', page: VocabGames as PageFn, meta: metaVocabGames as MetaFn },
  { slug: 'brain-breaks-word-games', page: BrainBreaks as PageFn, meta: metaBrainBreaks as MetaFn },
  { slug: 'indoor-recess-games', page: IndoorRecess as PageFn, meta: metaIndoorRecess as MetaFn },
  { slug: 'middle-school-word-games', page: MiddleSchool as PageFn, meta: metaMiddleSchool as MetaFn },
  { slug: 'early-finishers-activities', page: EarlyFinishers as PageFn, meta: metaEarlyFinishers as MetaFn },
  { slug: 'end-of-year-classroom-activities', page: EndOfYear as PageFn, meta: metaEndOfYear as MetaFn },
  { slug: 'first-day-of-school-icebreakers', page: Icebreakers as PageFn, meta: metaIcebreakers as MetaFn },
];

/**
 * Visible text plus every link target, in document order.
 *
 * `<script>` nodes are stripped first. JSON-LD lives in a script tag and would
 * otherwise land in `textContent`, so a structured-data change would read as a
 * prose regression. It gets its own snapshot below instead.
 */
async function renderPage(page: PageFn, locale: string): Promise<{ text: string; jsonLd: string }> {
  const el = (await page({ params: Promise.resolve({ locale }) })) as ReactElement;
  const { container, unmount } = render(el);

  const jsonLd = Array.from(container.querySelectorAll('script'))
    .map((s) => s.textContent ?? '')
    .map((raw) => {
      try {
        return JSON.stringify(JSON.parse(raw), null, 2);
      } catch {
        return raw;
      }
    })
    .join('\n---\n');

  container.querySelectorAll('script').forEach((s) => s.remove());
  const text = container.textContent ?? '';
  const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');
  unmount();
  return { text: `TEXT\n${text}\n\nHREFS\n${hrefs.join('\n')}\n`, jsonLd };
}

/** The metadata fields a search engine actually consumes. */
async function renderMeta(meta: MetaFn, locale: string): Promise<string> {
  const m = await meta({ params: Promise.resolve({ locale }) });
  const og = (m.openGraph ?? {}) as Record<string, unknown>;
  const tw = (m.twitter ?? {}) as Record<string, unknown>;
  return JSON.stringify(
    {
      title: m.title,
      description: m.description,
      keywords: m.keywords,
      robots: m.robots,
      canonical: m.alternates?.canonical,
      languages: m.alternates?.languages,
      ogTitle: og.title,
      ogDescription: og.description,
      ogLocale: og.locale,
      ogType: og.type,
      ogUrl: og.url,
      ogImages: og.images,
      twCard: tw.card,
      twTitle: tw.title,
      twDescription: tw.description,
      twImages: tw.images,
    },
    null,
    2,
  );
}

function snapPath(kind: string, slug: string, locale: string): string {
  return join(SNAP_DIR, `${slug}.${locale}.${kind}.txt`);
}

function compareOrWrite(file: string, actual: string, label: string): void {
  if (UPDATE) {
    mkdirSync(SNAP_DIR, { recursive: true });
    writeFileSync(file, actual, 'utf8');
    return;
  }
  expect(existsSync(file), `missing snapshot for ${label} — run with UPDATE_LANDING_TEXT=1`).toBe(true);
  expect(readFileSync(file, 'utf8'), `${label} drifted from its pre-migration snapshot`).toBe(actual);
}

describe('the six SEO landing pages render identical text after the template migration', () => {
  for (const { slug, page, meta } of PAGES) {
    for (const locale of LOCALES) {
      it(`${slug} @ ${locale} — visible text and link targets`, async () => {
        const { text } = await renderPage(page, locale);
        compareOrWrite(snapPath('text', slug, locale), text, `${slug} @ ${locale} text`);
      });

      it(`${slug} @ ${locale} — JSON-LD structured data`, async () => {
        const { jsonLd } = await renderPage(page, locale);
        compareOrWrite(snapPath('jsonld', slug, locale), jsonLd, `${slug} @ ${locale} JSON-LD`);
      });

      it(`${slug} @ ${locale} — metadata export`, async () => {
        compareOrWrite(snapPath('meta', slug, locale), await renderMeta(meta, locale), `${slug} @ ${locale} metadata`);
      });
    }
  }
});

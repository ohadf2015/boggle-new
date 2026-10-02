// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

import HubPage, { generateMetadata as hubMeta } from '../page';
import LangPage, { generateMetadata as langMeta } from '../[lang]/page';
import ItemPage, { generateMetadata as itemMeta } from '../[lang]/[item]/page';
import TopicPage, { generateMetadata as topicMeta } from '../topic/[topic]/page';
import { getCatalog } from '@/lib/seo/wordLists/catalog';
import { listPath, LANG_SEGMENT } from '@/lib/seo/wordLists/paths';

const catalog = getCatalog();
const p = <T,>(v: T) => Promise.resolve(v);

function jsonLd(container: HTMLElement): Array<Record<string, unknown>> {
  return [...container.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent || ''));
}

function graphTypes(nodes: Array<Record<string, unknown>>): string[] {
  return nodes.flatMap((n) => ((n['@graph'] as Array<Record<string, unknown>>) ?? [n]).map((g) => String(g['@type'])));
}

function internalLinks(container: HTMLElement, locale: string, self: string): Set<string> {
  return new Set(
    [...container.querySelectorAll('a')]
      .map((a) => a.getAttribute('href') || '')
      .filter((h) => /^\/(en|he|es|sv|ja|ru)\/education/.test(h) && h !== `/${locale}${self}`),
  );
}

const enList = catalog.lists.find((l) => l.lang === 'en' && l.locales.includes('he'))!;
const heList = catalog.lists.find((l) => l.lang === 'he' && l.locales.includes('en'))!;
const esList = catalog.lists.find((l) => l.lang === 'es')!;

describe('list detail page', () => {
  it('server-renders every word, with its definition', async () => {
    const { container } = render(await ItemPage({ params: p({ locale: 'en', lang: 'english', item: enList.slug }) }));
    const text = container.textContent || '';
    for (const w of enList.words) expect(text).toContain(w.word);
    expect(text).toContain(enList.words[0].definition);
  });

  it('emits parseable JSON-LD: LearningResource, DefinedTermSet with every word, BreadcrumbList', async () => {
    const { container } = render(await ItemPage({ params: p({ locale: 'en', lang: 'english', item: enList.slug }) }));
    const nodes = jsonLd(container);
    const types = graphTypes(nodes);
    expect(types).toEqual(expect.arrayContaining(['LearningResource', 'DefinedTermSet', 'BreadcrumbList']));
    const graph = nodes.flatMap((n) => (n['@graph'] as Array<Record<string, unknown>>) ?? [n]);
    const set = graph.find((g) => g['@type'] === 'DefinedTermSet')!;
    expect((set.hasDefinedTerm as unknown[]).length).toBe(enList.words.length);
    const crumbs = graph.find((g) => g['@type'] === 'BreadcrumbList')!;
    for (const item of crumbs.itemListElement as Array<{ item: string }>)
      expect(item.item).toMatch(/^https:\/\/www\.lexiclash\.live\//);
  });

  it('links to at least six other education pages', async () => {
    for (const [locale, list] of [
      ['en', enList],
      ['he', heList],
      ['es', esList],
    ] as const) {
      const { container } = render(await ItemPage({ params: p({ locale, lang: LANG_SEGMENT[list.lang], item: list.slug }) }));
      expect(internalLinks(container, locale, listPath(list)).size, `${locale}:${list.slug}`).toBeGreaterThanOrEqual(6);
    }
  });

  it('server-renders a real letter board with list words hidden in it', async () => {
    const { container } = render(await ItemPage({ params: p({ locale: 'en', lang: 'english', item: enList.slug }) }));
    const board = container.querySelector('[data-board]')!;
    expect(board).toBeTruthy();
    expect(board.querySelectorAll('[data-cell]').length).toBe(25);
    const hidden = [...container.querySelectorAll('[data-hidden-word]')].map((e) => e.textContent);
    expect(hidden.length).toBeGreaterThan(0);
    for (const w of hidden) expect(enList.words.map((x) => x.word)).toContain(w);
  });

  it('offers play-with-class and practise-solo CTAs', async () => {
    const { container } = render(await ItemPage({ params: p({ locale: 'he', lang: 'english', item: enList.slug }) }));
    expect(container.querySelector('[data-cta="play-class"]')).toBeTruthy();
    expect(container.querySelector('[data-cta="practice-solo"]')).toBeTruthy();
    expect(container.querySelector('a[href^="/he/education/access"]')).toBeTruthy();
    expect(container.textContent).not.toMatch(/eg2Seo\./);
  });

  it('sets canonical and a reciprocal hreflang cluster limited to the locales that have the list', async () => {
    const meta = await itemMeta({ params: p({ locale: 'en', lang: 'english', item: enList.slug }) });
    const url = `https://www.lexiclash.live/en${listPath(enList)}`;
    expect(meta.alternates?.canonical).toBe(url);
    expect(Object.keys(meta.alternates?.languages ?? {}).sort()).toEqual(['en', 'he', 'x-default']);
    expect((meta.title as { absolute: string }).absolute).toMatch(/English Word List and Class Game/);
    expect(String(meta.description).length).toBeGreaterThan(60);
  });

  it('404s in a locale that has no version of the list, and for unknown slugs', async () => {
    await expect(ItemPage({ params: p({ locale: 'ja', lang: 'english', item: enList.slug }) })).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(ItemPage({ params: p({ locale: 'en', lang: 'english', item: 'nope-123456' }) })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    await expect(ItemPage({ params: p({ locale: 'ru', lang: 'hebrew', item: heList.slug }) })).rejects.toThrow('NEXT_NOT_FOUND');
  });
});

describe('hub pages', () => {
  it('library hub renders in all six locales with an ItemList and no raw keys', async () => {
    for (const locale of ['en', 'he', 'es', 'sv', 'ja', 'ru']) {
      const { container } = render(await HubPage({ params: p({ locale }) }));
      expect(container.textContent, locale).not.toMatch(/eg2Seo\./);
      expect(graphTypes(jsonLd(container))).toEqual(expect.arrayContaining(['CollectionPage', 'ItemList', 'BreadcrumbList']));
      expect(internalLinks(container, locale, '/education/lists').size).toBeGreaterThanOrEqual(6);
    }
    const meta = await hubMeta({ params: p({ locale: 'sv' }) });
    expect(meta.alternates?.canonical).toBe('https://www.lexiclash.live/sv/education/lists');
  });

  it('grade hub lists every list of that grade and language', async () => {
    const hub = catalog.gradeHubs.find((h) => h.lang === 'en' && h.grade === 5)!;
    const { container } = render(await ItemPage({ params: p({ locale: 'en', lang: 'english', item: 'grade-5' }) }));
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    for (const l of hub.lists) expect(hrefs).toContain(`/en${listPath(l)}`);
    const meta = await itemMeta({ params: p({ locale: 'en', lang: 'english', item: 'grade-5' }) });
    expect(meta.alternates?.canonical).toBe('https://www.lexiclash.live/en/education/lists/english/grade-5');
  });

  it('language hub serves English lists to every EFL locale and links each grade', async () => {
    const { container } = render(await LangPage({ params: p({ locale: 'ja', lang: 'english' }) }));
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/ja/education/lists/english/grade-1');
    const meta = await langMeta({ params: p({ locale: 'ja', lang: 'english' }) });
    expect(Object.keys(meta.alternates?.languages ?? {}).sort()).toEqual(['en', 'es', 'he', 'ja', 'sv', 'x-default']);
    await expect(LangPage({ params: p({ locale: 'ja', lang: 'hebrew' }) })).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('topic hub groups its lists and 404s for a thin topic', async () => {
    const { container } = render(await TopicPage({ params: p({ locale: 'en', topic: 'animals' }) }));
    expect(container.querySelectorAll('[data-list-card]').length).toBe(
      catalog.topicHubs.find((h) => h.topic === 'animals')!.lists.length,
    );
    const meta = await topicMeta({ params: p({ locale: 'es', topic: 'animals' }) });
    expect(meta.alternates?.canonical).toBe('https://www.lexiclash.live/es/education/lists/topic/animals');
    await expect(TopicPage({ params: p({ locale: 'en', topic: 'question-words' }) })).rejects.toThrow('NEXT_NOT_FOUND');
  });
});

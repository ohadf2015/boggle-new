import { describe, it, expect } from 'vitest';
import sitemap from '@/app/sitemap';
import { getCatalog } from '../catalog';
import { absoluteUrl, clusterAlternates, gradeHubPath, langHubPath, listPath, topicHubPath } from '../paths';

const routes = sitemap();
const byUrl = new Map(routes.map((r) => [r.url, r]));
const catalog = getCatalog();

describe('word lists in /sitemap.xml', () => {
  it('lists every list page in exactly the locales that render it, with the page cluster as alternates', () => {
    for (const l of catalog.lists) {
      for (const locale of l.locales) {
        const entry = byUrl.get(absoluteUrl(locale, listPath(l)));
        expect(entry, `${locale}${listPath(l)}`).toBeTruthy();
        expect(entry!.alternates?.languages).toEqual(clusterAlternates(listPath(l), l.locales));
      }
      expect(byUrl.has(absoluteUrl('ja', listPath(l)))).toBe(false);
    }
  });

  it('lists every language, grade and topic hub in each of its locales', () => {
    const hubs = [
      ...catalog.langHubs.map((h) => ({ path: langHubPath(h.lang), locales: h.locales })),
      ...catalog.gradeHubs.map((h) => ({ path: gradeHubPath(h.lang, h.grade), locales: h.locales })),
      ...catalog.topicHubs.map((h) => ({ path: topicHubPath(h.topic), locales: h.locales })),
    ];
    for (const h of hubs) for (const locale of h.locales) expect(byUrl.has(absoluteUrl(locale, h.path)), h.path).toBe(true);
  });

  it('keeps every word-list alternate after the reciprocity prune', () => {
    const l = catalog.lists.find((x) => x.locales.length > 1)!;
    const entry = byUrl.get(absoluteUrl(l.locales[1], listPath(l)))!;
    expect(Object.keys(entry.alternates!.languages!).sort()).toEqual([...l.locales, 'x-default'].sort());
  });
});

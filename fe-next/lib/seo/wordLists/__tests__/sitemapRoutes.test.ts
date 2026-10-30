import { describe, it, expect } from 'vitest';
import sitemap from '@/app/sitemap';
import { getCatalog } from '../catalog';
import { WORD_LIST_INDEXING } from '../indexPolicy';
import { absoluteUrl, clusterAlternates, gradeHubPath, langHubPath, listPath, topicHubPath } from '../paths';
import { gradeHubMetadata, langHubMetadata, topicHubMetadata } from '@/app/[locale]/education/lists/_views/HubViews';
import { listMetadata } from '@/app/[locale]/education/lists/_views/ListView';

const routes = sitemap();
const byUrl = new Map(routes.map((r) => [r.url, r]));
const catalog = getCatalog();

describe('word lists in /sitemap.xml follow indexPolicy.ts', () => {
  it('lists every language hub in each of its locales, with the page cluster as alternates', () => {
    expect(WORD_LIST_INDEXING.langHubs).toBe(true);
    for (const h of catalog.langHubs) {
      for (const locale of h.locales) {
        const entry = byUrl.get(absoluteUrl(locale, langHubPath(h.lang)));
        expect(entry, `${locale}${langHubPath(h.lang)}`).toBeTruthy();
        expect(entry!.alternates?.languages).toEqual(clusterAlternates(langHubPath(h.lang), h.locales));
      }
    }
  });

  it('keeps the templated tiers (grade hubs, topic hubs, single lists) out of the sitemap', () => {
    const templated = [
      ...catalog.gradeHubs.map((h) => ({ path: gradeHubPath(h.lang, h.grade), locales: h.locales })),
      ...catalog.topicHubs.map((h) => ({ path: topicHubPath(h.topic), locales: h.locales })),
      ...catalog.lists.map((l) => ({ path: listPath(l), locales: l.locales })),
    ];
    expect(templated.length).toBeGreaterThan(100);
    for (const p of templated) for (const locale of p.locales) expect(byUrl.has(absoluteUrl(locale, p.path)), p.path).toBe(false);
  });

  it('every templated page says noindex,follow and every language hub says index', () => {
    const l = catalog.lists[0];
    expect(listMetadata(l, l.locales[0]).robots).toEqual({ index: false, follow: true });
    const g = catalog.gradeHubs[0];
    expect(gradeHubMetadata(g, g.locales[0]).robots).toEqual({ index: false, follow: true });
    const t = catalog.topicHubs[0];
    expect(topicHubMetadata(t, t.locales[0]).robots).toEqual({ index: false, follow: true });
    const h = catalog.langHubs[0];
    expect(langHubMetadata(h, h.locales[0]).robots).toEqual({ index: true, follow: true });
  });
});

import { describe, it, expect } from 'vitest';
import sitemap from '@/app/sitemap';
import { getCatalog } from '../catalog';
import { absoluteUrl, gradeHubPath, langHubPath, listPath, topicHubPath } from '../paths';
import { gradeHubMetadata, langHubMetadata, topicHubMetadata } from '@/app/[locale]/education/lists/_views/HubViews';
import { listMetadata } from '@/app/[locale]/education/lists/_views/ListView';

const routes = sitemap();
const byUrl = new Map(routes.map((r) => [r.url, r]));
const catalog = getCatalog();

describe('word lists in /sitemap.xml follow indexPolicy.ts', () => {
  it('keeps every tier out of the sitemap', () => {
    const templated = [
      ...catalog.langHubs.map((h) => ({ path: langHubPath(h.lang), locales: h.locales })),
      ...catalog.gradeHubs.map((h) => ({ path: gradeHubPath(h.lang, h.grade), locales: h.locales })),
      ...catalog.topicHubs.map((h) => ({ path: topicHubPath(h.topic), locales: h.locales })),
      ...catalog.lists.map((l) => ({ path: listPath(l), locales: l.locales })),
    ];
    expect(templated.length).toBeGreaterThan(100);
    for (const p of templated) for (const locale of p.locales) expect(byUrl.has(absoluteUrl(locale, p.path)), p.path).toBe(false);
  });

  it('every word-list page says noindex,follow', () => {
    const l = catalog.lists[0];
    expect(listMetadata(l, l.locales[0]).robots).toEqual({ index: false, follow: true });
    const g = catalog.gradeHubs[0];
    expect(gradeHubMetadata(g, g.locales[0]).robots).toEqual({ index: false, follow: true });
    const t = catalog.topicHubs[0];
    expect(topicHubMetadata(t, t.locales[0]).robots).toEqual({ index: false, follow: true });
    const h = catalog.langHubs[0];
    expect(langHubMetadata(h, h.locales[0]).robots).toEqual({ index: false, follow: true });
  });
});

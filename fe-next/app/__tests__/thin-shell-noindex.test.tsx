import { describe, it, expect } from 'vitest';

/**
 * AdSense low-value-content remediation, round 2 (2026-07-02).
 * The 2026-06-04 round noindexed /daily/archive/[date]; this round extends the
 * same treatment to the remaining near-empty game shells the reviewer lands on:
 *   /blast (38 crawlable words), /word-craft (30), /daily/word-hunt (~282),
 *   /daily/word-wheel, /brain/drills/* (~212), /word-of-the-day/[date] (~216).
 * Search intent stays covered by the content-rich siblings that remain indexed:
 *   /word-craft-game, /daily-word-wheel, /guides/*, /daily/archive,
 *   /word-of-the-day (hub). No gameplay UX changes — pages stay fully playable.
 */

const cases: Array<{ name: string; load: () => Promise<any>; params: Record<string, string> }> = [
  { name: '/word-craft', load: () => import('../[locale]/word-craft/page'), params: { locale: 'en' } },
  { name: '/daily/word-hunt', load: () => import('../[locale]/daily/word-hunt/page'), params: { locale: 'en' } },
  { name: '/daily/word-wheel', load: () => import('../[locale]/daily/word-wheel/page'), params: { locale: 'en' } },
  { name: '/brain/drills/combo-master', load: () => import('../[locale]/brain/drills/combo-master/page'), params: { locale: 'en' } },
  { name: '/brain/drills/lightning-round', load: () => import('../[locale]/brain/drills/lightning-round/page'), params: { locale: 'en' } },
  { name: '/brain/drills/memory-hunt', load: () => import('../[locale]/brain/drills/memory-hunt/page'), params: { locale: 'en' } },
  { name: '/brain/drills/pattern-switcher', load: () => import('../[locale]/brain/drills/pattern-switcher/page'), params: { locale: 'en' } },
  { name: '/brain/drills/rare-gems', load: () => import('../[locale]/brain/drills/rare-gems/page'), params: { locale: 'en' } },
  { name: '/word-of-the-day/[date]', load: () => import('../[locale]/word-of-the-day/[date]/page'), params: { locale: 'en', date: '2026-03-05' } },
  // BETA-gated: PageClient redirects non-beta users → wall for reviewer/crawler.
  { name: '/adventure', load: () => import('../[locale]/adventure/page'), params: { locale: 'en' } },
];

describe('thin game-shell pages are noindexed (AdSense remediation)', () => {
  for (const c of cases) {
    it(`${c.name} emits robots index:false`, async () => {
      const mod = await c.load();
      const meta = await mod.generateMetadata({ params: Promise.resolve(c.params) });
      expect(meta.robots).toMatchObject({ index: false });
    });
  }

  it('/blast emits robots index:false via static metadata', async () => {
    const mod = await import('../[locale]/blast/page');
    expect(mod.metadata?.robots).toMatchObject({ index: false });
  });

  it('/crossword emits robots index:false via static metadata (37 crawlable words, not on the home hub)', async () => {
    const mod = await import('../[locale]/crossword/page');
    expect(mod.metadata?.robots).toMatchObject({ index: false });
  });

  it('keeps follow:true so outbound links still pass crawl signal', async () => {
    const mod = await import('../[locale]/word-craft/page');
    const meta = await mod.generateMetadata({ params: Promise.resolve({ locale: 'en' }) });
    expect(meta.robots).toMatchObject({ index: false, follow: true });
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

// The back-link is a client island that needs Language/router context; the page
// test only cares about the marketing body + funnel, so stub it out.
vi.mock('@/components/navigation/TopBackLink', () => ({
  TopBackLink: () => null,
}));

import Page, { generateMetadata } from '../page';
import { getWordCraftLandingContent, buildWordCraftLandingJsonLd } from '../content';

describe('WordCraft landing page', () => {
  it('renders the hero and funnels every primary CTA to the game route', async () => {
    const ui = await Page({ params: Promise.resolve({ locale: 'en' }) });
    const { container } = render(ui);

    const c = getWordCraftLandingContent('en');
    expect(container.textContent).toContain(c.heroH1);
    expect(container.textContent).toContain(c.heroHighlight);

    // At least one CTA must link to the playable game at /en/word-craft.
    const gameLinks = Array.from(container.querySelectorAll('a[href="/en/word-craft"]'));
    expect(gameLinks.length).toBeGreaterThanOrEqual(1);

    // It must NOT link to itself as the "play" target.
    expect(container.querySelector('a[href="/en/word-craft-landing"]')).toBeNull();
  });

  it('emits VideoGame + FAQ + Breadcrumb structured data for AI/search visibility', () => {
    const ld = buildWordCraftLandingJsonLd('en', 'https://www.lexiclash.live');
    expect(ld.game['@type']).toBe('VideoGame');
    expect(ld.game.url).toBe('https://www.lexiclash.live/en/word-craft-landing');
    expect(ld.faq['@type']).toBe('FAQPage');
    expect(ld.faq.mainEntity.length).toBeGreaterThanOrEqual(4);
    expect(ld.breadcrumb['@type']).toBe('BreadcrumbList');
  });

  it('is indexable only in English (canonical EN, others noindex)', async () => {
    const en = await generateMetadata({ params: Promise.resolve({ locale: 'en' }) });
    const he = await generateMetadata({ params: Promise.resolve({ locale: 'he' }) });
    expect(en.robots).toMatchObject({ index: true });
    expect(he.robots).toMatchObject({ index: false });
  });
});

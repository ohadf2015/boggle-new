import { describe, it, expect } from 'vitest';
import {
  helpAlternates,
  helpBreadcrumbJsonLd,
  helpFaqJsonLd,
  helpHowToJsonLd,
} from '../helpSeo';
import { helpSitemapEntries } from '../helpSitemap';
import { getHelpContent } from '../content';
import { HELP_ARTICLES } from '../helpRegistry';

describe('helpAlternates', () => {
  it('lists the five help locales plus x-default and never ru', () => {
    const alts = helpAlternates('/education/help/create-a-class');
    expect(Object.keys(alts).sort()).toEqual(['en', 'es', 'he', 'ja', 'sv', 'x-default']);
    expect(alts['x-default']).toBe('https://www.lexiclash.live/en/education/help/create-a-class');
  });
});

describe('helpBreadcrumbJsonLd', () => {
  it('walks Home > Education > Help > article', () => {
    const node = helpBreadcrumbJsonLd({
      locale: 'en',
      trail: [
        { name: 'Help center', path: '/education/help' },
        { name: 'Create a class', path: '/education/help/create-a-class' },
      ],
    }) as { itemListElement: { position: number; item: string }[] };
    expect(node.itemListElement.map((i) => i.position)).toEqual([1, 2, 3, 4]);
    expect(node.itemListElement[3].item).toBe('https://www.lexiclash.live/en/education/help/create-a-class');
  });
});

describe('helpHowToJsonLd', () => {
  it('has one HowToStep per visible step, in order', () => {
    const content = getHelpContent('en');
    for (const meta of HELP_ARTICLES.filter((a) => a.howTo)) {
      const article = content.articles[meta.slug];
      const visible = article.blocks.flatMap((b) => (b.t === 'steps' ? b.items : []));
      const node = helpHowToJsonLd({ locale: 'en', slug: meta.slug, article, minutes: meta.minutes }) as {
        step: { name: string; position: number }[];
        totalTime: string;
      };
      expect(node.step.length, meta.slug).toBe(visible.length);
      expect(node.step[0].name).not.toMatch(/\*\*|\[\[/);
      expect(node.totalTime).toBe(`PT${meta.minutes}M`);
    }
  });
});

describe('helpFaqJsonLd', () => {
  it('uses the exact visible quick-answer text', () => {
    const quick = getHelpContent('en').quick;
    const node = helpFaqJsonLd({ locale: 'en', quick }) as {
      mainEntity: { name: string; acceptedAnswer: { text: string } }[];
    };
    expect(node.mainEntity).toHaveLength(quick.length);
    expect(node.mainEntity[0].name).toBe(quick[0].q);
  });
});

describe('helpSitemapEntries', () => {
  it('emits the hub and every article for the five locales only', () => {
    const entries = helpSitemapEntries(new Date('2026-10-02'));
    expect(entries).toHaveLength(5 * (1 + HELP_ARTICLES.length));
    expect(entries.some((e) => e.url.includes('/ru/'))).toBe(false);
    expect(entries.map((e) => e.url)).toContain('https://www.lexiclash.live/he/education/help');
  });
});

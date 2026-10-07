import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getClassroomContent } from './content';
import {
  CLASSROOM_WORD_GAMES_BASE,
  buildClassroomWordGamesJsonLd,
  classroomWordGamesPageUrl,
} from './jsonld';

describe('classroom word-games JSON-LD', () => {
  it('emits schema.org FAQPage with visible-copy questions on www.lexiclash.live', () => {
    const c = getClassroomContent('en');
    const { faqPage, webPage, breadcrumb } = buildClassroomWordGamesJsonLd('en', c);

    expect(faqPage['@context']).toBe('https://schema.org');
    expect(faqPage['@type']).toBe('FAQPage');
    expect(faqPage.inLanguage).toBe('en');
    expect(faqPage.url).toBe('https://www.lexiclash.live/en/word-games-for-the-classroom');
    expect(JSON.stringify(faqPage)).not.toContain('lexiclash.com');
    expect(faqPage.mainEntity.length).toBe(c.faqs.length);
    expect(faqPage.mainEntity.length).toBeGreaterThanOrEqual(4);
    for (const q of faqPage.mainEntity) {
      expect(q['@type']).toBe('Question');
      expect(q.name.length).toBeGreaterThan(8);
      expect(q.acceptedAnswer['@type']).toBe('Answer');
      expect(q.acceptedAnswer.text.length).toBeGreaterThan(20);
      expect(c.faqs.some((f) => f.q === q.name && f.a === q.acceptedAnswer.text)).toBe(true);
    }

    expect(webPage['@type']).toBe('WebPage');
    expect(webPage.speakable.cssSelector).toContain('[data-answer]');
    expect(breadcrumb['@type']).toBe('BreadcrumbList');
    const items = breadcrumb.itemListElement as Array<{ item: string }>;
    for (const item of items) {
      expect(item.item.startsWith(CLASSROOM_WORD_GAMES_BASE)).toBe(true);
      expect(item.item).not.toContain('lexiclash.com');
    }
  });

  it('keeps locale URLs on the canonical host', () => {
    expect(classroomWordGamesPageUrl('he')).toBe(
      'https://www.lexiclash.live/he/word-games-for-the-classroom',
    );
    const { faqPage } = buildClassroomWordGamesJsonLd('he', getClassroomContent('he'));
    expect(faqPage.inLanguage).toBe('he');
    expect(faqPage.url).toContain('/he/word-games-for-the-classroom');
  });
});

describe('classroom word-games page source — crawler-visible FAQPage', () => {
  const src = readFileSync(join(__dirname, 'page.tsx'), 'utf8');

  it('does not hide JSON-LD behind next/script', () => {
    expect(src).not.toMatch(/from ['"]next\/script['"]/);
    expect(src).toContain("from '@/components/seo/JsonLd'");
    expect(src).toContain("from '@/components/seo/GeoFaqList'");
  });

  it('renders a data-answer block and expanded FAQs', () => {
    expect(src).toContain('data-answer');
    expect(src).toContain('GeoFaqList');
    expect(src).not.toMatch(/<details/);
  });
});

describe('public/llms.txt — teacher GEO routing', () => {
  const llms = readFileSync(join(__dirname, '../../../public/llms.txt'), 'utf8');

  it('maps /en/teacher to the public teacher landing', () => {
    expect(llms).toContain('https://www.lexiclash.live/en/education/games-for-teachers');
    expect(llms).toContain('https://www.lexiclash.live/en/word-games-for-the-classroom');
    expect(llms).toContain('https://www.lexiclash.live/en/teacher');
    expect(llms).toMatch(/signed-in dashboard, noindex/);
    expect(llms).not.toContain('lexiclash.com');
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import sitemap from '../../../sitemap';
import {
  DAILY_WORD_WHEEL_CANONICAL,
  buildDailyWordWheelJsonLd,
  dailyWordWheelEn,
  leadWordCount,
} from '../seo';

describe('daily-word-wheel English citability copy', () => {
  it('answers the query in the first 60 words', () => {
    expect(leadWordCount()).toBeGreaterThan(0);
    expect(leadWordCount()).toBeLessThanOrEqual(60);
    const lead = dailyWordWheelEn.lead.toLowerCase();
    expect(lead).toContain('center letter');
    expect(lead).toMatch(/3 letters|three letters/);
    expect(dailyWordWheelEn.h1.toLowerCase()).toContain('daily word wheel');
  });

  it('exposes rules as a real list of at least 3 items', () => {
    expect(dailyWordWheelEn.rules.length).toBeGreaterThanOrEqual(3);
    expect(dailyWordWheelEn.rules[0]).toMatch(/3 letters/i);
    expect(dailyWordWheelEn.rules.join(' ').toLowerCase()).toContain('center letter');
  });

  it('names the word wheel daily record in FAQ', () => {
    const text = dailyWordWheelEn.faqs.map((f) => `${f.q} ${f.a}`).join(' ').toLowerCase();
    expect(text).toContain('word wheel daily record');
  });
});

describe('daily-word-wheel JSON-LD', () => {
  const blocks = buildDailyWordWheelJsonLd();

  it('parses as FAQPage + HowTo with real steps', () => {
    const json = JSON.parse(JSON.stringify(blocks));
    expect(Array.isArray(json)).toBe(true);
    const faq = json.find((b: { '@type': string }) => b['@type'] === 'FAQPage');
    const howTo = json.find((b: { '@type': string }) => b['@type'] === 'HowTo');
    expect(faq?.mainEntity?.length).toBe(dailyWordWheelEn.faqs.length);
    expect(howTo?.step?.length).toBeGreaterThanOrEqual(3);
  });

  it('round-trips through JSON.parse of the script payload', () => {
    const raw = JSON.stringify(blocks);
    expect(() => JSON.parse(raw)).not.toThrow();
    const parsed = JSON.parse(raw);
    expect(parsed[0]['@type']).toBe('FAQPage');
  });
});

describe('daily-word-wheel discovery', () => {
  it('canonical is the English landing', () => {
    expect(DAILY_WORD_WHEEL_CANONICAL).toBe(
      'https://www.lexiclash.live/en/daily-word-wheel',
    );
  });

  it('is listed in sitemap.xml', () => {
    const routes = sitemap();
    expect(routes.find((r) => r.url === DAILY_WORD_WHEEL_CANONICAL)).toBeDefined();
  });

  it('is linked from an already-indexed English landing', () => {
    const shake = readFileSync(
      join(__dirname, '..', '..', 'boggle-word-shake-free', 'page.tsx'),
      'utf8',
    );
    expect(shake).toContain('/daily-word-wheel');
  });

  it('renders the rules as a ul in the landing component', () => {
    const landing = readFileSync(join(__dirname, '..', 'AnimatedLanding.tsx'), 'utf8');
    expect(landing).toContain('<ul');
    expect(landing).toContain('rules.map');
  });
});

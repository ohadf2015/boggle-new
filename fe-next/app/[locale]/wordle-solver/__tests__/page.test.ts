import { describe, expect, it } from 'vitest';
import { generateMetadata } from '../page';
import { faqs } from '../faqs';
import { KNOWN_APP_ROOT_SEGMENTS } from '@/lib/seo/nextHandleGate';
import benchmark from '@/lib/wordleSolver/benchmark.json';
import { WORDLE_ANSWERS } from '@/lib/wordleSolver/answers';
import { cycleMark } from '../tiles';

const CANONICAL = 'https://www.lexiclash.live/en/wordle-solver';

describe('/wordle-solver metadata', () => {
  it('has a SERP-safe title and a description that states the measured average', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: 'en' }) });
    const title = String(meta.title);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title.toLowerCase()).toContain('wordle solver');
    const description = String(meta.description);
    expect(description.length).toBeLessThanOrEqual(155);
    expect(description).toContain(String(benchmark.average));
    expect(meta.robots).toEqual({ index: true, follow: true });
    expect(meta.alternates?.canonical).toBe(CANONICAL);
  });

  it('keeps the other locales noindexed and canonical to English', async () => {
    for (const locale of ['he', 'sv', 'ja', 'es', 'ru']) {
      const meta = await generateMetadata({ params: Promise.resolve({ locale }) });
      expect(meta.robots).toEqual({ index: false, follow: true });
      expect(meta.alternates?.canonical).toBe(CANONICAL);
    }
  });

  it('is a known root segment so the request gate lets it through', () => {
    expect(KNOWN_APP_ROOT_SEGMENTS.has('wordle-solver')).toBe(true);
  });

  it('says it is not affiliated with the New York Times', () => {
    expect(faqs.some((f) => /not affiliated/i.test(f.a))).toBe(true);
  });
});

describe('published benchmark', () => {
  it('covers every answer and its distribution adds up', () => {
    expect(benchmark.games).toBe(WORDLE_ANSWERS.length);
    const counted = Object.values(benchmark.distribution).reduce((a, b) => a + b, 0);
    expect(counted).toBe(benchmark.games);
    expect(benchmark.solvedInSix).toBe(benchmark.games);
  });
});

describe('cycleMark', () => {
  it('cycles gray, yellow, green and back', () => {
    expect(cycleMark('b')).toBe('y');
    expect(cycleMark('y')).toBe('g');
    expect(cycleMark('g')).toBe('b');
  });
});

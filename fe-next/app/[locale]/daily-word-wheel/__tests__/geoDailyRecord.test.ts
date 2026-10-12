import { describe, it, expect } from 'vitest';
import { loadTranslation } from '@/translations/loadTranslation';

describe('GEO: word wheel daily record', () => {
  it('en hero answers the query in the first 100 words with scoring + example', async () => {
    const t = (await loadTranslation('en')) as {
      dailyWordWheelLanding: {
        hero: { description: string };
        faq: { items: Array<{ q: string; a: string }> };
      };
    };
    const hero = t.dailyWordWheelLanding.hero.description;
    const words = hero.trim().split(/\s+/);
    expect(words.length).toBeGreaterThan(40);
    expect(words.length).toBeLessThanOrEqual(100);
    expect(hero.toLowerCase()).toContain('daily record');
    expect(hero).toMatch(/midnight UTC/);
    expect(hero).toMatch(/leaderboard/i);
    expect(hero).toContain('12');
    expect(hero).toContain('60');
    expect(hero).toMatch(/BLEND|102/);
    const questions = t.dailyWordWheelLanding.faq.items.map((item) => item.q);
    expect(questions).toContain('word wheel daily record');
    const answer = t.dailyWordWheelLanding.faq.items.find((item) => item.q === 'word wheel daily record')?.a ?? '';
    expect(answer).toMatch(/midnight UTC/);
    expect(answer).toContain('https://www.lexiclash.live/en/leaderboard');
    expect(answer).toMatch(/BLEND|102/);
  });
});

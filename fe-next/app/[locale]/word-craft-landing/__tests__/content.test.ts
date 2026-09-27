import { describe, it, expect } from 'vitest';
import { getWordCraftLandingContent, WORDCRAFT_LANDING_PATH } from '../content';

describe('WordCraft landing content', () => {
  const c = getWordCraftLandingContent('en');

  it('exposes a complete hero with meta + a play CTA', () => {
    expect(c.metaTitle.length).toBeGreaterThan(10);
    expect(c.metaDescription.length).toBeGreaterThan(30);
    expect(c.heroH1.length).toBeGreaterThan(3);
    expect(c.heroHighlight.length).toBeGreaterThan(1);
    expect(c.heroSubtitle.length).toBeGreaterThan(20);
    expect(c.playCta.length).toBeGreaterThan(2);
    expect(c.secondaryCta.length).toBeGreaterThan(2);
  });

  it('teaches the game in a few EASY steps (keeps the "easy" promise)', () => {
    expect(c.steps.length).toBeGreaterThanOrEqual(3);
    for (const s of c.steps) {
      expect(s.title.length).toBeGreaterThan(2);
      expect(s.body.length).toBeGreaterThan(10);
    }
  });

  it('lists fun features and citable FAQs', () => {
    expect(c.features.length).toBeGreaterThanOrEqual(4);
    expect(c.faqs.length).toBeGreaterThanOrEqual(4);
    for (const f of c.faqs) {
      expect(f.q.length).toBeGreaterThan(5);
      expect(f.a.length).toBeGreaterThan(15);
    }
  });

  it('points at the playable game route, not itself (funnel)', () => {
    // The landing must funnel to the actual game.
    expect(WORDCRAFT_LANDING_PATH).toBe('/word-craft-landing');
    expect(WORDCRAFT_LANDING_PATH).not.toBe('/word-craft');
  });
});

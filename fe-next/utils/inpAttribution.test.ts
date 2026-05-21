import { describe, it, expect } from 'vitest';
import { classifyRoute, buildInpAttributionPayload, type InpMetricLike } from './inpAttribution';

describe('classifyRoute', () => {
  it('classifies multiplayer routes regardless of locale prefix or room code', () => {
    expect(classifyRoute('/en/multiplayer/ABCD')).toBe('multiplayer');
    expect(classifyRoute('/he/multiplayer')).toBe('multiplayer');
  });

  it('classifies the other game-mode families', () => {
    expect(classifyRoute('/en/word-hunt')).toBe('word-hunt');
    expect(classifyRoute('/sv/word-craft/x')).toBe('word-craft');
    expect(classifyRoute('/ja/word-tower')).toBe('word-tower');
    expect(classifyRoute('/es/practice')).toBe('practice');
    expect(classifyRoute('/en/daily-challenge')).toBe('daily');
    expect(classifyRoute('/en/blast')).toBe('blast');
  });

  it('falls back to "other" for unmatched routes', () => {
    expect(classifyRoute('/')).toBe('other');
    expect(classifyRoute('/en/leaderboard')).toBe('other');
  });
});

describe('buildInpAttributionPayload', () => {
  const metric: InpMetricLike = {
    value: 312,
    rating: 'poor',
    navigationType: 'navigate',
    attribution: {
      interactionTarget: 'button.submit-word',
      interactionType: 'pointer',
      inputDelay: 120,
      processingDuration: 30,
      presentationDelay: 162,
      loadState: 'complete',
      longestScript: {
        entry: { sourceURL: 'https://lexiclash.live/_next/static/chunk.js', duration: 90 },
        subpart: 'input-delay',
      },
    },
  };

  it('flattens the metric + attribution into queryable PostHog properties', () => {
    const p = buildInpAttributionPayload(metric, '/en/multiplayer/ABCD');
    expect(p).toMatchObject({
      inp_value: 312,
      inp_rating: 'poor',
      interaction_target: 'button.submit-word',
      interaction_type: 'pointer',
      input_delay: 120,
      processing_duration: 30,
      presentation_delay: 162,
      load_state: 'complete',
      route_family: 'multiplayer',
      pathname: '/en/multiplayer/ABCD',
      longest_script_url: 'https://lexiclash.live/_next/static/chunk.js',
      longest_script_duration: 90,
      longest_script_subpart: 'input-delay',
    });
  });

  it('omits longest-script fields gracefully when the Long Animation Frame API is unavailable', () => {
    const noLoAF: InpMetricLike = { ...metric, attribution: { ...metric.attribution, longestScript: undefined } };
    const p = buildInpAttributionPayload(noLoAF, '/en/multiplayer');
    expect(p.longest_script_url).toBeUndefined();
    expect(p.longest_script_duration).toBeUndefined();
    expect(p.inp_value).toBe(312);
  });
});

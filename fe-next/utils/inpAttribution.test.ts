import { describe, it, expect } from 'vitest';
import { classifyRoute, buildInpAttributionPayload, type InpMetricLike } from './inpAttribution';

describe('classifyRoute', () => {
  it('classifies multiplayer routes regardless of locale prefix or room code', () => {
    expect(classifyRoute('/en/multiplayer/ABCD')).toBe('multiplayer');
    expect(classifyRoute('/he/multiplayer')).toBe('multiplayer');
  });

  it('classifies routes with no locale prefix (default-locale paths)', () => {
    expect(classifyRoute('/multiplayer')).toBe('multiplayer');
    expect(classifyRoute('/word-tower')).toBe('word-tower');
  });

  it('classifies every playable game mode', () => {
    const cases: Array<[string, string]> = [
      ['/en/blast', 'blast'],
      ['/en/word-hunt', 'word-hunt'],
      ['/sv/word-craft/x', 'word-craft'],
      ['/ja/word-tower', 'word-tower'],
      ['/en/word-of-the-day', 'word-of-the-day'],
      ['/en/wheel-rush', 'wheel-rush'],
      ['/ja/shiritori', 'shiritori'],
      ['/es/practice', 'practice'],
      ['/en/adventure', 'adventure'],
      ['/en/anagram', 'anagram'],
      ['/en/brain', 'brain'],
      ['/en/connections', 'connections'],
      ['/en/daily', 'daily'],
      ['/en/daily-word-wheel', 'daily'],
      ['/en/challenge/abc', 'challenge'],
      ['/en/friend-challenge', 'challenge'],
      ['/en/singleplayer', 'singleplayer'],
    ];
    for (const [path, expected] of cases) {
      expect(classifyRoute(path)).toBe(expected);
    }
  });

  it('does NOT misclassify SEO/marketing pages whose slug merely contains a mode word', () => {
    // Substring matching would wrongly bucket these as a game mode; segment
    // matching keeps them in "other".
    expect(classifyRoute('/en/brain-training-word-games')).toBe('other');
    expect(classifyRoute('/en/best-online-word-games')).toBe('other');
    expect(classifyRoute('/en/lexiclash-vs-wordle')).toBe('other');
    expect(classifyRoute('/he/multiplayer-word-game-online')).toBe('other');
  });

  it('falls back to "other" for non-game routes', () => {
    expect(classifyRoute('/')).toBe('other');
    expect(classifyRoute('/en/leaderboard')).toBe('other');
    expect(classifyRoute('/en/settings')).toBe('other');
    expect(classifyRoute('/en/blog/some-post')).toBe('other');
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

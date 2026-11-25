/** Mode-specific game events and page context reach PostHog and Growth Radar with PII stripped. */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const captureMock = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: {
    register: vi.fn(),
    register_once: vi.fn(),
    capture: (...a: unknown[]) => captureMock(...a),
    people: { set: vi.fn(), set_once: vi.fn() },
    get_distinct_id: () => 'test-distinct-id',
    __loaded: true,
  },
}));

vi.mock('@/utils/posthogEngagement', () => ({
  setPostHogUserProps: vi.fn(),
  setPostHogUserPropsOnce: vi.fn(),
  setPostHogSuperProps: vi.fn(),
  setPostHogSuperPropsOnce: vi.fn(),
  incrementPostHogUserProp: vi.fn(),
  trackRageQuit: vi.fn(),
  trackSessionDepth: vi.fn(),
}));

vi.mock('@/components/GoogleAnalytics', () => ({ trackEvent: vi.fn() }));
vi.mock('@/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const grCapture = vi.fn();

const g = globalThis as Record<string, unknown>;
const savedWindow = g.window;
const savedSessionStorage = g.sessionStorage;

function installWindow(withGr: boolean): void {
  const store = new Map<string, string>();
  g.sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
  const base = {
    location: { pathname: '/en/multiplayer', search: '?utm_source=tiktok&utm_campaign=launch', hostname: 'lexiclash.live' },
    document: { title: 'LexiClash', referrer: 'https://www.google.com/' },
  };
  g.window = withGr ? { ...base, gr: { capture: grCapture } } : base;
}

import { trackGrowthEvent } from '../growthTracking';
import { specificGameEventName } from '../eventContext';
import { __resetGrowthRadarMirrorForTests } from '../growthRadarMirror';

describe('specific game events', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetGrowthRadarMirrorForTests();
    installWindow(true);
    trackGrowthEvent('page_view', {});
    captureMock.mockClear();
    grCapture.mockClear();
  });

  afterEach(() => {
    __resetGrowthRadarMirrorForTests();
    vi.useRealTimers();
    g.window = savedWindow;
    g.sessionStorage = savedSessionStorage;
  });

  it('names each mode, prefixing multiplayer rooms and bounding odd modes', () => {
    expect(specificGameEventName('game_started', { mode: 'word-hunt', isMultiplayer: true })).toBe('mp_word_hunt_game_started');
    expect(specificGameEventName('game_completed', { mode: 'singleplayer' })).toBe('singleplayer_game_completed');
    expect(specificGameEventName('game_completed', { mode: 'brain-drill' })).toBe('brain_drill_game_completed');
    expect(specificGameEventName('game_started', { mode: 'x'.repeat(40) })).toBe('other_game_started');
    expect(specificGameEventName('game_abandoned', { mode: 'blast' })).toBeNull();
  });

  it('a multiplayer word-hunt finish fires mp_word_hunt_game_completed to PostHog and Growth Radar with page context and no PII', () => {
    trackGrowthEvent('game_completed', {
      mode: 'word-hunt',
      engineMode: 'multiplayer',
      score: 12,
      username: 'user_x',
      email: 'a@b.c',
    });
    const ph = captureMock.mock.calls.find(([e]) => e === 'growth:mp_word_hunt_game_completed');
    expect(ph).toBeDefined();
    const gr = grCapture.mock.calls.find(([e]) => e === 'growth:mp_word_hunt_game_completed');
    expect(gr).toBeDefined();
    const props = gr![1] as Record<string, unknown>;
    expect(props).toMatchObject({
      mode: 'word-hunt',
      score: 12,
      page: '/en/multiplayer',
      page_title: 'LexiClash',
      referrer_host: 'www.google.com',
      utm_source: 'tiktok',
      utm_campaign: 'launch',
      landing_page: '/en/multiplayer',
      landing_referrer_host: 'www.google.com',
    });
    expect(props.username).toBeUndefined();
    expect(props.email).toBeUndefined();
    expect(grCapture.mock.calls.some(([e]) => e === 'growth:game_completed')).toBe(true);
  });

  it('other events get page context but no specific twin', () => {
    trackGrowthEvent('first_game_played', { mode: 'classic' });
    expect(captureMock.mock.calls.some(([e]) => /_game_(started|completed)$/.test(String(e)))).toBe(false);
    const gr = grCapture.mock.calls.find(([e]) => e === 'growth:first_game_played');
    expect(gr![1]).toMatchObject({ page: '/en/multiplayer' });
  });

  it('keeps the first page of the visit as landing_page, with its referrer and utm, after navigating', () => {
    const w = g.window as { location: Record<string, string>; document: Record<string, string> };
    w.location = { pathname: '/en/daily/word-wheel', search: '', hostname: 'lexiclash.live' };
    w.document = { title: 'Word Wheel', referrer: 'https://lexiclash.live/en/multiplayer' };
    trackGrowthEvent('game_started', { mode: 'word-wheel' });
    const gr = grCapture.mock.calls.find(([e]) => e === 'growth:word_wheel_game_started');
    const props = gr![1] as Record<string, unknown>;
    expect(props).toMatchObject({
      page: '/en/daily/word-wheel',
      landing_page: '/en/multiplayer',
      landing_referrer_host: 'www.google.com',
      utm_source: 'tiktok',
    });
    expect(props.referrer_host).toBeUndefined();
  });
});

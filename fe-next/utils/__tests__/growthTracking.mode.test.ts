/**
 * growthTracking — game_started / game_completed / game_abandoned must emit
 * a canonical `mode` property (not just `gameMode`) so PostHog breakdowns
 * by mode return populated cells. Historical emits used `gameMode` only,
 * which left every `growth:game_*` breakdown bucketed under
 * `$_posthog_breakdown_null_$` — blinding us to which modes finish.
 *
 * Contract: events MUST carry `mode`. `gameMode` kept as back-compat alias.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const captureMock = vi.fn();
vi.mock('posthog-js', () => ({
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

import { trackGameStart, trackGameEnd, trackGameCompletion } from '../growthTracking';

function findCapture(event: string): Record<string, unknown> | undefined {
  const hit = captureMock.mock.calls.find(([name]) => name === `growth:${event}`);
  return hit?.[1] as Record<string, unknown> | undefined;
}

describe('trackGameStart — mode property contract', () => {
  beforeEach(() => captureMock.mockClear());

  it('emits canonical `mode` property', () => {
    trackGameStart('singleplayer');
    const payload = findCapture('game_started');
    expect(payload).toBeDefined();
    expect(payload!.mode).toBe('singleplayer');
  });

  it('keeps `gameMode` alias for back-compat', () => {
    trackGameStart('multiplayer');
    const payload = findCapture('game_started');
    expect(payload!.gameMode).toBe('multiplayer');
  });

  it('does not let extras overwrite the canonical mode', () => {
    trackGameStart('adventure', { mode: 'stale-junk' });
    const payload = findCapture('game_started');
    expect(payload!.mode).toBe('adventure');
  });
});

describe('trackGameEnd — mode property contract', () => {
  beforeEach(() => captureMock.mockClear());

  it('emits `mode` on game_completed', () => {
    trackGameEnd('singleplayer', 100, 5, true, 60);
    const payload = findCapture('game_completed');
    expect(payload).toBeDefined();
    expect(payload!.mode).toBe('singleplayer');
    expect(payload!.gameMode).toBe('singleplayer');
  });

  it('emits `mode` on game_abandoned', () => {
    trackGameEnd('adventure', 0, 0, false, 10);
    const payload = findCapture('game_abandoned');
    expect(payload).toBeDefined();
    expect(payload!.mode).toBe('adventure');
  });
});

describe('trackGameCompletion — first_game_played mode propagation', () => {
  beforeEach(() => captureMock.mockClear());

  it('emits first_game_played with gameMode when isFirstGame=true', () => {
    trackGameCompletion(false, 80, 4, true, 'multiplayer');
    const payload = findCapture('first_game_played');
    expect(payload).toBeDefined();
    expect(payload!.gameMode).toBe('multiplayer');
    expect(payload!.mode).toBe('multiplayer');
  });

  it('emits first_game_played with mode=unknown when caller forgets gameMode', () => {
    trackGameCompletion(false, 80, 4, true);
    const payload = findCapture('first_game_played');
    expect(payload).toBeDefined();
    expect(payload!.gameMode).toBe('unknown');
    expect(payload!.mode).toBe('unknown');
  });

  it('does not emit first_game_played when isFirstGame=false', () => {
    trackGameCompletion(false, 80, 4, false, 'singleplayer');
    expect(findCapture('first_game_played')).toBeUndefined();
  });
});

describe('trackGameCompletion — first_game_won mode propagation', () => {
  beforeEach(() => captureMock.mockClear());

  it('passes gameMode through to first_game_won when isFirstGame=true', () => {
    trackGameCompletion(true, 250, 10, true, 'multiplayer');
    const payload = findCapture('first_game_won');
    expect(payload).toBeDefined();
    expect(payload!.gameMode).toBe('multiplayer');
    expect(payload!.mode).toBe('multiplayer');
  });

  it('still emits with mode=unknown when caller forgets to pass gameMode', () => {
    trackGameCompletion(true, 100, 5, true);
    const payload = findCapture('first_game_won');
    expect(payload).toBeDefined();
    expect(payload!.gameMode).toBe('unknown');
    expect(payload!.mode).toBe('unknown');
  });

  it('emits streak_continued (not first_game_won) when isFirstGame=false', () => {
    trackGameCompletion(true, 100, 5, false, 'blast');
    expect(findCapture('first_game_won')).toBeUndefined();
    const payload = findCapture('streak_continued');
    expect(payload).toBeDefined();
    expect(payload!.mode).toBe('blast');
  });
});

/**
 * mode_selected ↔ game_started funnel-link contract
 *
 * Background (PostHog 2026-04-27 sweep):
 *   - LandingChallengeCards emit `trackModeSelected('quickPlay'/'arena'/...)`
 *     using marketing names.
 *   - `trackGameStart` callsites use engine names (singleplayer/multiplayer/...).
 *   - Funnels broken-down by `gameMode` can't cross the boundary because the
 *     vocabularies don't overlap. blast (27 selects → 0 starts) and
 *     connections (18 → 0) appear to convert at 0% even though users do play.
 *
 * Fix: both events also emit `engineMode` (a canonical engine name). A
 * mapping table translates marketing → engine. trackGameStart already uses
 * engine names so it just mirrors `mode` into `engineMode`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));

vi.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    capture,
    identify: vi.fn(),
    register: vi.fn(),
    register_once: vi.fn(),
    people: { set: vi.fn(), set_once: vi.fn() },
  },
}));

vi.mock('@/utils/ga4', () => ({ trackGA4Event: vi.fn() }));
vi.mock('@/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  if (typeof window !== 'undefined') {
    try { window.localStorage.clear(); } catch { /* */ }
  }
});

const propsFor = (eventName: string): Record<string, unknown> | undefined => {
  const c = capture.mock.calls.find(call => call[0] === eventName);
  return c?.[1] as Record<string, unknown> | undefined;
};

describe('trackModeSelected — engineMode prop', () => {
  it.each([
    ['quickPlay', 'singleplayer'],
    ['practice', 'singleplayer'],
    ['arena', 'multiplayer'],
    ['blast', 'blast'],
    ['adventure', 'adventure'],
    ['connections', 'connections'],
    ['brainGym', 'brainGym'],
  ])('maps %s → engineMode=%s', async (uiMode, expectedEngine) => {
    const { trackModeSelected } = await import('../growthTracking');
    trackModeSelected(uiMode, 'home');

    const props = propsFor('growth:mode_selected');
    expect(props?.engineMode).toBe(expectedEngine);
    // Existing fields preserved (back-compat for old dashboards):
    expect(props?.gameMode).toBe(uiMode);
    expect(props?.fromScreen).toBe('home');
  });

  it('falls back to ui-name when no mapping is defined (forward-compat)', async () => {
    const { trackModeSelected } = await import('../growthTracking');
    trackModeSelected('hypothetical-future-mode', 'home');
    const props = propsFor('growth:mode_selected');
    expect(props?.engineMode).toBe('hypothetical-future-mode');
  });
});

describe('trackGameStart — engineMode prop mirrors mode', () => {
  it.each([
    'singleplayer',
    'multiplayer',
    'survival',
    'word-wheel',
    'adventure',
    'blast',
    'connections',
  ])('emits engineMode=%s for trackGameStart(%s)', async (mode) => {
    const { trackGameStart } = await import('../growthTracking');
    trackGameStart(mode);
    const props = propsFor('growth:game_started');
    expect(props?.engineMode).toBe(mode);
  });
});

describe('mode_selected → game_started — funnel linkage', () => {
  it('quickPlay click then singleplayer game_start share engineMode', async () => {
    const { trackModeSelected, trackGameStart } = await import('../growthTracking');
    trackModeSelected('quickPlay', 'home');
    trackGameStart('singleplayer');

    expect(propsFor('growth:mode_selected')?.engineMode).toBe('singleplayer');
    expect(propsFor('growth:game_started')?.engineMode).toBe('singleplayer');
  });

  it('blast click then blast game_start share engineMode', async () => {
    const { trackModeSelected, trackGameStart } = await import('../growthTracking');
    trackModeSelected('blast', 'home');
    trackGameStart('blast');
    expect(propsFor('growth:mode_selected')?.engineMode).toBe('blast');
    expect(propsFor('growth:game_started')?.engineMode).toBe('blast');
  });

  it('arena click then multiplayer game_start share engineMode', async () => {
    const { trackModeSelected, trackGameStart } = await import('../growthTracking');
    trackModeSelected('arena', 'home');
    trackGameStart('multiplayer');
    expect(propsFor('growth:mode_selected')?.engineMode).toBe('multiplayer');
    expect(propsFor('growth:game_started')?.engineMode).toBe('multiplayer');
  });
});

/**
 * growthTracking — trackLanguageChanged
 *
 * Locale is a first-class cohort dimension: we segment retention, conversion,
 * and feature adoption by UI language. Every switch must:
 *   1. Fire a `language_changed` growth event (event stream).
 *   2. Register `locale` as a PostHog super property so subsequent events
 *      are auto-tagged with the current locale (no per-call plumbing).
 *   3. Set `locale_last_used` on the user (last-touch).
 *   4. Set `locale_first_used` on the user via `$set_once` (first-touch).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const registerMock = vi.fn();
const captureMock = vi.fn();
vi.mock('posthog-js', () => ({
  default: {
    register: (...a: unknown[]) => registerMock(...a),
    register_once: vi.fn(),
    capture: (...a: unknown[]) => captureMock(...a),
    people: { set: vi.fn(), set_once: vi.fn() },
    get_distinct_id: () => 'test-distinct-id',
    __loaded: true,
  },
}));

const setUserPropsMock = vi.fn();
const setUserPropsOnceMock = vi.fn();
const setSuperPropsMock = vi.fn();
vi.mock('@/utils/posthogEngagement', () => ({
  setPostHogUserProps: (...a: unknown[]) => setUserPropsMock(...a),
  setPostHogUserPropsOnce: (...a: unknown[]) => setUserPropsOnceMock(...a),
  setPostHogSuperProps: (...a: unknown[]) => setSuperPropsMock(...a),
  setPostHogSuperPropsOnce: vi.fn(),
  incrementPostHogUserProp: vi.fn(),
  trackRageQuit: vi.fn(),
  trackSessionDepth: vi.fn(),
}));

vi.mock('@/components/GoogleAnalytics', () => ({ trackEvent: vi.fn() }));
vi.mock('@/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { trackLanguageChanged } from '../growthTracking';

describe('trackLanguageChanged', () => {
  beforeEach(() => {
    registerMock.mockClear();
    captureMock.mockClear();
    setUserPropsMock.mockClear();
    setUserPropsOnceMock.mockClear();
    setSuperPropsMock.mockClear();
  });

  it('fires a language_changed growth event with from/to payload', () => {
    trackLanguageChanged('en', 'he');

    const matching = captureMock.mock.calls.find(
      (c) => c[0] === 'growth:language_changed'
    );
    expect(matching).toBeDefined();
    expect(matching![1]).toMatchObject({ from: 'en', to: 'he' });
  });

  it('registers locale as a PostHog super property (for all future events)', () => {
    trackLanguageChanged('en', 'ja');

    expect(setSuperPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'ja' })
    );
  });

  it('writes last-touch + first-touch user props for cohort slicing', () => {
    trackLanguageChanged('en', 'sv');

    expect(setUserPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({ locale_last_used: 'sv' })
    );
    expect(setUserPropsOnceMock).toHaveBeenCalledWith(
      expect.objectContaining({ locale_first_used: 'sv' })
    );
  });

  it('is a no-op when from === to (guards against spurious re-render calls)', () => {
    trackLanguageChanged('en', 'en');

    const langEvents = captureMock.mock.calls.filter(
      (c) => c[0] === 'growth:language_changed'
    );
    expect(langEvents).toHaveLength(0);
    expect(setSuperPropsMock).not.toHaveBeenCalled();
  });
});

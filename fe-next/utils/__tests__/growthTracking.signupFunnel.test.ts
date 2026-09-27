/**
 * t_da22db9a — growthTracking signup-funnel semantics.
 *
 * `trackSignupFunnel` is the single chokepoint for prompt_shown / completed /
 * dismissed. These tests pin the sessionStorage pending latch (which
 * AuthContext reads to attribute the completion source) and the new optional
 * `props` merge + `trackSignupPromptClicked` mid-funnel event.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mirror the lazyPosthog mock style of growthTracking.signupCompleted.test.ts:
// growthTracking default-imports the client (`import posthog from …`) and
// vi.mock factories are hoisted, so the fn must come from vi.hoisted.
const { mockCapture } = vi.hoisted(() => ({ mockCapture: vi.fn() }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  __esModule: true,
  default: {
    capture: mockCapture,
    identify: vi.fn(),
    register: vi.fn(),
    register_once: vi.fn(),
    people: { set: vi.fn(), set_once: vi.fn() },
  },
}));

vi.mock('@/utils/ga4', () => ({
  trackGA4Event: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import {
  consumePendingSignupCompletion,
  trackSignupFunnel,
  trackSignupPromptClicked,
} from '@/utils/growthTracking';

const PENDING_KEY = 'lexiclash_signup_funnel_pending';

describe('trackSignupFunnel — props merge + pending latch (t_da22db9a)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it('prompt_shown latches the pending key and merges extra props into the event', () => {
    trackSignupFunnel('prompt_shown', false, { trigger: 'mp_sheet', mpSessionGame: 2 });

    expect(window.sessionStorage.getItem(PENDING_KEY)).toBe('multi_game');
    expect(mockCapture).toHaveBeenCalledWith(
      'growth:signup_prompt_shown',
      expect.objectContaining({ trigger: 'mp_sheet', mpSessionGame: 2 })
    );
  });

  it('first-win prompt_shown emits canonical signup_prompt_shown AND legacy first_win companion', () => {
    // t_c75cbe59: canonical pair is what UR host-filters; first_win_* alone
    // left prompt→completed structurally at 0%.
    trackSignupFunnel('prompt_shown', true, { surface: 'soft-sheet' });

    expect(window.sessionStorage.getItem(PENDING_KEY)).toBe('first_win');
    expect(window.localStorage.getItem(PENDING_KEY)).toBe('first_win');
    expect(mockCapture).toHaveBeenCalledWith(
      'growth:signup_prompt_shown',
      expect.objectContaining({ surface: 'soft-sheet', is_first_win: true })
    );
    expect(mockCapture).toHaveBeenCalledWith(
      'growth:first_win_signup_shown',
      expect.objectContaining({ surface: 'soft-sheet', is_first_win: true })
    );
  });

  it('dismissed clears the pending key (a later header signup must NOT attribute to the prompt)', () => {
    trackSignupFunnel('prompt_shown', false);
    expect(window.sessionStorage.getItem(PENDING_KEY)).toBe('multi_game');

    trackSignupFunnel('dismissed', false, { trigger: 'mp_sheet' });

    expect(window.sessionStorage.getItem(PENDING_KEY)).toBeNull();
    expect(mockCapture).toHaveBeenCalledWith(
      'growth:signup_dismissed',
      expect.objectContaining({ trigger: 'mp_sheet' })
    );
  });

  it('consumePendingSignupCompletion emits completed once and clears the key', () => {
    trackSignupFunnel('prompt_shown', false);
    consumePendingSignupCompletion();
    consumePendingSignupCompletion(); // second call must be a no-op

    // Dual-emit: growth:signup_completed + bare signup_completed (whitelist)
    const completed = mockCapture.mock.calls.filter(
      ([name]) => name === 'growth:signup_completed' || name === 'signup_completed'
    );
    expect(completed.length).toBeGreaterThanOrEqual(1);
    expect(window.sessionStorage.getItem(PENDING_KEY)).toBeNull();
    expect(window.localStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('consumePendingSignupCompletion recovers pending from localStorage after sessionStorage loss (OAuth redirect)', () => {
    trackSignupFunnel('prompt_shown', true);
    window.sessionStorage.removeItem(PENDING_KEY); // simulate partitioned session
    expect(window.localStorage.getItem(PENDING_KEY)).toBe('first_win');

    consumePendingSignupCompletion();

    expect(mockCapture).toHaveBeenCalledWith(
      'growth:signup_completed',
      expect.objectContaining({ is_first_win: true })
    );
    expect(window.localStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('consumePendingSignupCompletion is a no-op without a pending prompt', () => {
    consumePendingSignupCompletion();
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('trackSignupPromptClicked emits the new mid-funnel tap event with the source', () => {
    trackSignupPromptClicked('mp_sheet');

    expect(mockCapture).toHaveBeenCalledWith(
      'growth:signup_prompt_clicked',
      expect.objectContaining({ source: 'mp_sheet' })
    );
  });
});

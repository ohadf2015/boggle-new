/**
 * Activation must not burn the once-per-device slot while PostHog will drop
 * the capture (game routes defer init; the queue flushes into opt-out).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { capture, isLoaded } = vi.hoisted(() => ({
  capture: vi.fn(),
  isLoaded: vi.fn(() => false),
}));

vi.mock('@/lib/analytics/lazyPosthog', () => ({
  __esModule: true,
  default: {
    capture,
    identify: vi.fn(),
    register: vi.fn(),
    register_once: vi.fn(),
    people: { set: vi.fn(), set_once: vi.fn() },
    isLoaded,
  },
}));

vi.mock('@/utils/ga4', () => ({ trackGA4Event: vi.fn() }));
vi.mock('@/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/utils/authFetch', () => ({
  postWithAuth: vi.fn(() => Promise.resolve({ ok: true, status: 200 })),
}));

const args = { won: false, score: 40, wordCount: 1, mode: 'singleplayer' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  isLoaded.mockReturnValue(false);
  localStorage.clear();
  sessionStorage.clear();
});

describe('markFirstGameActivation — slot waits until PostHog will keep the capture', () => {
  it('does not consume the slot or capture while posthog is not loaded', async () => {
    const { markFirstGameActivation } = await import('../growthTracking');
    markFirstGameActivation(args);

    expect(capture).not.toHaveBeenCalled();
    expect(localStorage.getItem('lexiclash_first_game_played')).toBeNull();
    expect(sessionStorage.getItem('lexiclash_activation_pending')).toContain('singleplayer');
  });

  it('emits and consumes the slot once capture is armed and posthog is loaded', async () => {
    const { markFirstGameActivation } = await import('../growthTracking');
    const { armActivationCapture } = await import('../activationGate');
    markFirstGameActivation(args);
    capture.mockClear();

    isLoaded.mockReturnValue(true);
    armActivationCapture();
    const { takePendingActivation } = await import('../activationGate');
    const pending = takePendingActivation();
    expect(pending).toMatchObject(args);
    markFirstGameActivation(pending!);

    const names = capture.mock.calls.map(c => c[0]);
    expect(names).toContain('growth:first_game_played');
    expect(localStorage.getItem('lexiclash_first_game_played')).toBe('1');
    expect(sessionStorage.getItem('lexiclash_activation_pending')).toBeNull();
  });

  it('retries on the next call after a dropped attempt, instead of staying silent', async () => {
    const { markFirstGameActivation } = await import('../growthTracking');
    const { armActivationCapture } = await import('../activationGate');
    markFirstGameActivation(args);

    isLoaded.mockReturnValue(true);
    armActivationCapture();
    markFirstGameActivation({ ...args, score: 90, wordCount: 4 });

    expect(capture.mock.calls.map(c => c[0])).toContain('growth:first_game_played');
    const payload = capture.mock.calls.find(c => c[0] === 'growth:first_game_played')?.[1];
    expect(payload).toMatchObject({ score: 90, wordCount: 4 });
  });
});

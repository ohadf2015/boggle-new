/**
 * A mode tap fetches `/api/quick-play/round` with no deadline. A request that
 * never settles leaves the dancing mascot on screen forever AND latches
 * `loadingRef`, so even the retry button becomes a no-op — the player's only
 * way out is reloading the page. That is the mode_selected → board gap, and it
 * reported nothing: the catch set the error phase but captured no event, so the
 * failure point was invisible in the funnel.
 *
 * Written BEFORE implementation (RED phase).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import posthog from '@/lib/analytics/lazyPosthog';
import { QuickPlayHub, ROUND_FETCH_TIMEOUT_MS } from '../QuickPlayHub';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));
vi.mock('@/components/ui/BackButton', () => ({
  BackButton: ({ label }: any) => <button data-testid="mock-back">{label}</button>,
}));
vi.mock('@/hooks/useBackOneLevel', () => ({ useBackOneLevel: () => vi.fn() }));
vi.mock('../lightningPath', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lightningPath')>();
  return { ...actual, strikeHoldMs: () => 10, STRIKE_HOLD_MS: 10, STRIKE_HOLD_REDUCED_MS: 10 };
});
vi.mock('../adapters/QuickModeAdapter', () => ({
  QuickModeAdapter: () => <div data-testid="mock-round" />,
}));
vi.mock('../QuickPlayResults', () => ({
  QuickPlayResults: () => <div data-testid="mock-results" />,
}));

const ROUND = {
  mode: 'wheel-rush', seed: 's1', language: 'en', durationSec: 60,
  grid: [], wheel: { centerLetter: 'A', outerLetters: [], allLetters: [] },
  words: ['aa'], totalWords: 1, perfectScore: 10, ghosts: [],
};

function roundCalls(): number {
  return vi.mocked(fetch).mock.calls.filter(([u]) => String(u).includes('/round')).length;
}

function failedEvents() {
  return vi.mocked(posthog.capture).mock.calls.filter(([e]) => e === 'quick_play_board_fetch_failed');
}

describe('QuickPlayHub — the round fetch must have a deadline', () => {
  beforeEach(() => {
    vi.mocked(posthog.capture).mockClear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('time-boxes the request so a hung network cannot stall the mascot forever', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ROUND })) as any);
    render(<QuickPlayHub startMode="wheel-rush" />);

    await waitFor(() => expect(roundCalls()).toBe(1));
    const init = vi.mocked(fetch).mock.calls.find(([u]) => String(u).includes('/round'))?.[1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.signal!.aborted).toBe(false);
    expect(ROUND_FETCH_TIMEOUT_MS).toBe(8000);
  });

  it('on timeout shows the error with a retry that actually re-fetches', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new DOMException('signal timed out', 'TimeoutError');
      }) as any,
    );
    render(<QuickPlayHub startMode="wheel-rush" />);

    await waitFor(() => expect(screen.queryByTestId('quick-load-error')).toBeTruthy());
    const before = roundCalls();

    // The latch must be released by the failure, or this click does nothing.
    fireEvent.click(screen.getByTestId('quick-load-retry'));
    await waitFor(() => expect(roundCalls()).toBe(before + 1));
  });

  it('reports a timeout as its own reason, with how long the player waited', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new DOMException('signal timed out', 'TimeoutError');
      }) as any,
    );
    render(<QuickPlayHub startMode="wheel-rush" />);

    await waitFor(() => expect(failedEvents().length).toBeGreaterThan(0));
    const props = failedEvents()[0][1] as Record<string, unknown>;
    expect(props.reason).toBe('timeout');
    expect(props.mode).toBe('wheel-rush');
    expect(typeof props.ms).toBe('number');
  });

  it('separates a server refusal from a dead network', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) })) as any);
    render(<QuickPlayHub startMode="wheel-rush" />);

    await waitFor(() => expect(failedEvents().length).toBeGreaterThan(0));
    const props = failedEvents()[0][1] as Record<string, unknown>;
    expect(props.reason).toBe('http');
    expect(props.status).toBe(429);
  });
});

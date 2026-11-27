import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuickPlayHub } from '../QuickPlayHub';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));
const publishLevelUp = vi.hoisted(() => vi.fn());
vi.mock('@/lib/avatar/revealTrigger', () => ({ publishLevelUp }));
vi.mock('@/components/ui/BackButton', () => ({
  BackButton: ({ label }: any) => <button data-testid="mock-back">{label}</button>,
}));
const goBack = vi.fn();
vi.mock('@/hooks/useBackOneLevel', () => ({
  useBackOneLevel: () => goBack,
}));
// Speed up the strike/loading hold so tests stay snappy; still assert it runs.
vi.mock('../lightningPath', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lightningPath')>();
  return {
    ...actual,
    strikeHoldMs: () => 40,
    STRIKE_HOLD_MS: 40,
    STRIKE_HOLD_REDUCED_MS: 20,
  };
});
vi.mock('../adapters/QuickModeAdapter', () => ({
  QuickModeAdapter: ({ config, onDone, onQuit }: any) => {
    // Simulate a real adapter: onDone on user action, but schedule onQuit
    // after the round duration (typically ~60s). This reproduces the bug
    // where results auto-dismiss after the timer fires.
    React.useEffect(() => {
      const timeoutId = setTimeout(() => onQuit(), config.durationSec * 1000);
      return () => clearTimeout(timeoutId);
    }, [onQuit, config.durationSec]);
    return (
      <>
      <button data-testid="mock-quit" onClick={() => onQuit()}>quit</button>
      <button
        data-testid="mock-finish"
        onClick={() =>
          onDone({
            mode: config.mode, seed: config.seed, score: 340, perfectScore: 500,
            scorePct: 68, wordsFound: 7, totalWords: 12, durationMs: 60000,
          })
        }
      >
        finish
      </button>
      </>
    );
  },
}));

const resultsSpy = vi.hoisted(() => ({ rival: undefined as unknown }));
vi.mock('../QuickPlayResults', () => ({
  QuickPlayResults: ({ onNextRound, rival }: any) => {
    resultsSpy.rival = rival;
    return (
    <div data-testid="mock-results">
      <button data-testid="mock-next" onClick={() => onNextRound('random')}>next</button>
    </div>
    );
  },
}));

import posthog from '@/lib/analytics/lazyPosthog';
import { OVERLAY_QUIET_ZONE_ATTR } from '@/lib/overlayQuietZone';

const roundPayload = {
  mode: 'blast', seed: 's-1', language: 'en', durationSec: 60,
  grid: [['a']], totalWords: 12, perfectScore: 500,
};

describe('QuickPlayHub', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('/round')) {
        return Promise.resolve({ ok: true, json: async () => roundPayload });
      }
      if (String(url).includes('/submit')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ scorePct: 68, coins: 93, xp: 74, percentileToday: 73, history: [68] }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('never shows a mode picker: opening the hub starts a random round', async () => {
    render(<QuickPlayHub />);
    expect(screen.getByTestId('quick-play-hub')).toBeTruthy();
    expect(screen.queryByTestId('quick-mode-picker')).toBeNull();
    expect(screen.getByTestId('quick-loading-mascot')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('mock-finish')).toBeTruthy(), { timeout: 3000 });
    expect(vi.mocked(posthog.capture)).toHaveBeenCalledWith(
      'quick_play_mode_selected',
      expect.objectContaining({ method: 'random' })
    );
    expect(fetchMock.mock.calls.filter((c) => String(c[0]).includes('/round'))).toHaveLength(1);
  });

  it('the loading screen sits on the solo ambient backdrop instead of the halftone field', () => {
    const { container } = render(<QuickPlayHub />);
    expect(screen.queryByTestId('quick-hub-atmosphere')).toBeNull();
    const backdrop = container.querySelector('[data-ambient]');
    expect(backdrop).not.toBeNull();
    expect(screen.getByTestId('quick-play-hub').className).toContain('isolate');
  });

  it('a round that fails to load shows the error with a retry that fetches again', async () => {
    let fail = true;
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('/round')) {
        if (fail) return Promise.resolve({ ok: false, json: async () => ({}) });
        return Promise.resolve({ ok: true, json: async () => roundPayload });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    render(<QuickPlayHub startMode="blast" />);
    await waitFor(() => expect(screen.getByTestId('quick-load-error')).toBeTruthy());
    fireEvent.pointerDown(screen.getByTestId('quick-load-retry'), { button: 0 });
    expect(screen.getByTestId('quick-load-retry')).toHaveAttribute('data-pressed', 'true');
    fail = false;
    fireEvent.click(screen.getByTestId('quick-load-retry'));
    await waitFor(() => expect(screen.getByTestId('mock-finish')).toBeTruthy(), { timeout: 3000 });
    const bodies = fetchMock.mock.calls.filter((c) => String(c[0]).includes('/round')).map((c) => JSON.parse(c[1].body).mode);
    expect(bodies).toEqual(['blast', 'blast']);
  });

  it('holds the overlay quiet zone while results are on screen so the cookie bar stays off NEXT BOARD', async () => {
    render(<QuickPlayHub />);
    await waitFor(() => screen.getByTestId('mock-finish'));
    expect(document.body.getAttribute(OVERLAY_QUIET_ZONE_ATTR) ?? '').not.toContain('quick-results');
    fireEvent.click(screen.getByTestId('mock-finish'));
    await waitFor(() => screen.getByTestId('mock-results'));
    expect(document.body.getAttribute(OVERLAY_QUIET_ZONE_ATTR)).toContain('quick-results');
  });

  it('a 429 on the round fetch says too many games, not a connection problem', async () => {
    fetchMock.mockImplementation((url: string) =>
      String(url).includes('/round')
        ? Promise.resolve({ ok: false, status: 429, json: async () => ({}) })
        : Promise.resolve({ ok: true, json: async () => ({}) })
    );
    render(<QuickPlayHub startMode="blast" />);
    await waitFor(() => expect(screen.getByTestId('quick-load-error')).toHaveTextContent('quickPlay.solo.loadRateLimited'));
  });

  it('round completion shows results, and Next round starts another round instead of a picker', async () => {
    render(<QuickPlayHub />);
    await waitFor(() => screen.getByTestId('mock-finish'));
    fireEvent.click(screen.getByTestId('mock-finish'));
    await waitFor(() => expect(screen.getByTestId('mock-results')).toBeTruthy());
    expect(vi.mocked(posthog.capture)).toHaveBeenCalledWith(
      'quick_play_round_completed',
      expect.objectContaining({ mode: 'blast', scorePct: 68 })
    );
    fireEvent.click(screen.getByTestId('mock-next'));
    await waitFor(() => expect(screen.getByTestId('mock-finish')).toBeTruthy(), { timeout: 3000 });
    expect(fetchMock.mock.calls.filter((c) => String(c[0]).includes('/round'))).toHaveLength(2);
    expect(goBack).not.toHaveBeenCalled();
  });

  it('a round that crossed a level publishes the level-up through the shared path', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('/round')) return Promise.resolve({ ok: true, json: async () => roundPayload });
      if (String(url).includes('/submit')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ scorePct: 68, coins: 93, xp: 74, percentileToday: 73, history: [68], levelUp: { oldLevel: 1, newLevel: 2 } }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    render(<QuickPlayHub />);
    await waitFor(() => screen.getByTestId('mock-finish'));
    fireEvent.click(screen.getByTestId('mock-finish'));
    await waitFor(() => expect(screen.getByTestId('mock-results')).toBeTruthy());
    expect(publishLevelUp).toHaveBeenCalledWith({ oldLevel: 1, newLevel: 2 }, 'quickPlay');
  });

  it('quitting mid-round leaves Quick Play instead of opening a picker', async () => {
    render(<QuickPlayHub />);
    await waitFor(() => screen.getByTestId('mock-finish'));
    fireEvent.click(screen.getByTestId('mock-quit'));
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('submit network failure still reaches results (no stranded round)', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('/round')) {
        return Promise.resolve({ ok: true, json: async () => roundPayload });
      }
      if (String(url).includes('/submit')) {
        return Promise.reject(new Error('network down'));
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    render(<QuickPlayHub />);
    await waitFor(() => screen.getByTestId('mock-finish'));
    fireEvent.click(screen.getByTestId('mock-finish'));
    await waitFor(() => expect(screen.getByTestId('mock-results')).toBeTruthy());
  });

  it('challenge deep link shows banner and plays the friend board without a tap', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('/challenge?id=ch-9')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'ch-9', mode: 'classic', seed: 'shared-seed',
            challengerName: 'Maya', challenger_score_pct: 68,
          }),
        });
      }
      if (String(url).includes('/round')) {
        return Promise.resolve({ ok: true, json: async () => ({ ...roundPayload, mode: 'classic', seed: 'shared-seed' }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    render(<QuickPlayHub challengeId="ch-9" startMode="blast" />);
    await waitFor(() => screen.getByTestId('mock-finish'), { timeout: 3000 });
    const roundCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes('/round'));
    expect(roundCalls).toHaveLength(1);
    expect(JSON.parse(roundCalls[0][1].body as string)).toMatchObject({ mode: 'classic', seed: 'shared-seed' });
  });

  it('challenge deep link carries the challenger id to results so the add-friend moment can render', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('/challenge?id=ch-9')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'ch-9', mode: 'classic', seed: 'shared-seed',
            challenger_id: 'u-maya', challengerName: 'Maya', challenger_score_pct: 68,
          }),
        });
      }
      if (String(url).includes('/round')) {
        return Promise.resolve({ ok: true, json: async () => ({ ...roundPayload, mode: 'classic', seed: 'shared-seed' }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    render(<QuickPlayHub challengeId="ch-9" startMode="blast" />);
    await waitFor(() => screen.getByTestId('mock-finish'), { timeout: 3000 });
    fireEvent.click(screen.getByTestId('mock-finish'));
    await waitFor(() => screen.getByTestId('mock-results'));
    const rival = resultsSpy.rival as { type?: string; userId?: string; name?: string; avatarUserId?: string } | null;
    expect(rival).toMatchObject({ type: 'challenge', userId: 'u-maya', name: 'Maya', avatarUserId: 'u-maya' });
  });

  it('a guest-seeded challenge link has no challenger id, so no add-friend id is invented', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('/round')) {
        return Promise.resolve({ ok: true, json: async () => ({ ...roundPayload, mode: 'classic', seed: 'shared-seed' }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    render(<QuickPlayHub seeded={{ mode: 'classic', seed: 'shared-seed', score: 90, scorePct: 40, name: 'Maya' }} />);
    await waitFor(() => screen.getByTestId('mock-finish'), { timeout: 3000 });
    fireEvent.click(screen.getByTestId('mock-finish'));
    await waitFor(() => screen.getByTestId('mock-results'));
    const rival = resultsSpy.rival as { type?: string; userId?: string } | null;
    expect(rival?.type).toBe('challenge');
    expect(rival?.userId).toBeUndefined();
  });

  it('a challenge link that fails to load still starts a round', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('/challenge?id=')) return Promise.resolve({ ok: false, json: async () => null });
      if (String(url).includes('/round')) return Promise.resolve({ ok: true, json: async () => roundPayload });
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    render(<QuickPlayHub challengeId="gone" />);
    await waitFor(() => screen.getByTestId('mock-finish'), { timeout: 3000 });
  });

  it('a seeded share link plays that board for a signed-out recipient, with no challenge row', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('/round')) {
        return Promise.resolve({ ok: true, json: async () => ({ ...roundPayload, mode: 'classic', seed: 'shared-seed' }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    render(<QuickPlayHub seeded={{ mode: 'classic', seed: 'shared-seed', score: 90, scorePct: 40, name: 'Maya' }} />);
    await waitFor(() => screen.getByTestId('mock-finish'), { timeout: 3000 });
    expect(screen.getByTestId('quick-score-to-beat')).toBeTruthy();
    const roundCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes('/round'));
    expect(roundCalls).toHaveLength(1);
    expect(JSON.parse(roundCalls[0][1].body as string)).toMatchObject({ mode: 'classic', seed: 'shared-seed' });
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/challenge?id='))).toBe(false);
    expect(posthog.capture).toHaveBeenCalledWith(
      'challenge_opened',
      expect.objectContaining({ seed: 'shared-seed', source: 'link', surface: 'quick_play' }),
    );
  });

  it('results screen persists until player explicitly leaves (no auto-dismiss after timer)', async () => {
    render(<QuickPlayHub />);
    await waitFor(() => screen.getByTestId('mock-finish'), { timeout: 3000 });
    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByTestId('mock-finish'));
      await vi.waitFor(() => expect(screen.getByTestId('mock-results')).toBeTruthy());
      vi.advanceTimersByTime(70_000);
      expect(screen.getByTestId('mock-results')).toBeTruthy();
      expect(goBack).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});

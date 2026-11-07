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
vi.mock('@/components/ui/BackButton', () => ({
  BackButton: ({ label }: any) => <button data-testid="mock-back">{label}</button>,
}));
const { backParents, exitSpy } = vi.hoisted(() => ({
  backParents: [] as Array<string | undefined>,
  exitSpy: vi.fn(),
}));
vi.mock('@/hooks/useBackOneLevel', () => ({
  useBackOneLevel: (parent?: string) => {
    backParents.push(parent);
    return exitSpy;
  },
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
vi.mock('../adapters/preloadQuickMode', () => ({ preloadQuickMode: vi.fn() }));
vi.mock('../adapters/QuickModeAdapter', () => ({
  QuickModeAdapter: ({ config, onDone, onQuit }: any) => (
    <div data-testid="mock-round" data-mode={config.mode}>
      {/* Real boards hand onQuit a click event or their own payload. */}
      <button data-testid="mock-quit" onClick={onQuit}>quit</button>
      <button
        data-testid="mock-finish"
        onClick={() =>
          onDone({
            mode: config.mode, seed: config.seed, score: 120, perfectScore: 250,
            scorePct: 48, wordsFound: 9, totalWords: 25, durationMs: 60000,
          })
        }
      >
        finish
      </button>
    </div>
  ),
}));

vi.mock('../QuickPlayResults', () => ({
  QuickPlayResults: ({ onNextRound }: any) => (
    <div data-testid="mock-results">
      <button data-testid="mock-spin" onClick={() => onNextRound('random')}>spin</button>
      <button data-testid="mock-pick-wheel" onClick={() => onNextRound('wheel-rush')}>wheel</button>
    </div>
  ),
}));

import { preloadQuickMode } from '../adapters/preloadQuickMode';

describe('QuickPlayHub — the play / results loop', () => {
  const fetchMock = vi.fn();
  const roundCalls = () => fetchMock.mock.calls.filter(([u]) => String(u).includes('/round'));

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (String(url).includes('/round')) {
        const mode = JSON.parse(String(init?.body ?? '{}')).mode;
        return Promise.resolve({
          ok: true,
          json: async () => ({ mode, seed: 's-1', language: 'en', durationSec: 60, grid: [['a']], totalWords: 400, perfectScore: 20000, parScore: 250, parWords: 25 }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({ scorePct: 48, coins: 73, xp: 58, percentileToday: 0, history: [48], totalPoints: 48 }) });
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('a board passing its click event to onQuit just leaves Quick Play, no "couldn\'t build your board"', async () => {
    render(<QuickPlayHub startMode="blast" />);
    await waitFor(() => screen.getByTestId('mock-quit'));
    fireEvent.click(screen.getByTestId('mock-quit'));
    expect(exitSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('quick-load-error')).toBeNull();
    // The quit must not be mistaken for a mode and fetch another board.
    expect(roundCalls()).toHaveLength(1);
  });

  it('"Spin next round" deals a random round straight away', async () => {
    render(<QuickPlayHub startMode="blast" />);
    await waitFor(() => screen.getByTestId('mock-finish'));
    fireEvent.click(screen.getByTestId('mock-finish'));
    await waitFor(() => screen.getByTestId('mock-results'));
    fireEvent.click(screen.getByTestId('mock-spin'));
    await waitFor(() => screen.getByTestId('mock-round'));
    expect(roundCalls()).toHaveLength(2);
    const secondMode = JSON.parse(String(roundCalls()[1][1]?.body)).mode;
    expect(['classic', 'blast', 'word-hunt', 'wheel-rush']).toContain(secondMode);
  });

  it('picking a mode on the results screen plays that mode', async () => {
    render(<QuickPlayHub startMode="blast" />);
    await waitFor(() => screen.getByTestId('mock-finish'));
    fireEvent.click(screen.getByTestId('mock-finish'));
    await waitFor(() => screen.getByTestId('mock-results'));
    fireEvent.click(screen.getByTestId('mock-pick-wheel'));
    await waitFor(() => expect(screen.getByTestId('mock-round').dataset.mode).toBe('wheel-rush'));
  });

  it("starts downloading the chosen mode's board while the strike plays", async () => {
    render(<QuickPlayHub startMode="blast" />);
    expect(preloadQuickMode).toHaveBeenCalledWith('blast');
    await waitFor(() => screen.getByTestId('mock-round'));
  });
});

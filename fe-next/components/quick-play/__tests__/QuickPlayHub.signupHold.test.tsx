import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { isQuickResultsOnScreen, resetQuickResultsCalmForTests } from '@/lib/quickPlay/resultsCalm';
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
vi.mock('../QuickPlayModePicker', () => ({
  QuickPlayModePicker: ({ onSelect, pendingMode }: any) => (
    <div data-testid="mock-picker" data-pending-mode={pendingMode ?? ''}>
      <button data-testid="mock-select" onClick={() => onSelect('blast', 'tap')}>sel</button>
      <button data-testid="mock-play" onClick={() => onSelect('random', 'tap')}>play</button>
      {pendingMode && <div data-testid="quick-play-loading">loading</div>}
    </div>
  ),
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
    );
  },
}));

vi.mock('../QuickPlayResults', () => ({
  QuickPlayResults: ({ onNextRound, onExit }: any) => (
    <div data-testid="mock-results">
      <button data-testid="mock-next" onClick={onNextRound}>next</button>
      <button data-testid="mock-results-exit" onClick={onExit}>exit</button>
    </div>
  ),
}));

const roundPayload = {
  mode: 'blast', seed: 's-1', language: 'en', durationSec: 60,
  grid: [['a']], totalWords: 12, perfectScore: 500,
};

describe('QuickPlayHub signup hold across the submit gap', () => {
  const fetchMock = vi.fn();
  let resolveSubmit: (v: unknown) => void = () => {};

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('/round')) {
        return Promise.resolve({ ok: true, json: async () => roundPayload });
      }
      if (String(url).includes('/submit')) {
        return new Promise((resolve) => {
          resolveSubmit = resolve;
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    resetQuickResultsCalmForTests();
  });

  it('holds the signup nudge from the buzzer, before the results screen has even loaded', async () => {
    render(<QuickPlayHub backHref="/en" />);
    fireEvent.click(screen.getByTestId('mock-play'));
    await waitFor(() => screen.getByTestId('mock-finish'));
    expect(isQuickResultsOnScreen()).toBe(false);

    fireEvent.click(screen.getByTestId('mock-finish'));
    await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/submit'))).toBe(true));
    expect(screen.queryByTestId('mock-results')).toBeNull();
    expect(isQuickResultsOnScreen()).toBe(true);

    resolveSubmit({ ok: true, json: async () => ({ scorePct: 68, coins: 93, xp: 74, percentileToday: 73, history: [68] }) });
    await waitFor(() => expect(screen.getByTestId('mock-results')).toBeTruthy());
    // The real results screen takes over the hold; this mock doesn't, so the bridge must have let go.
    await waitFor(() => expect(isQuickResultsOnScreen()).toBe(false));
  });
});

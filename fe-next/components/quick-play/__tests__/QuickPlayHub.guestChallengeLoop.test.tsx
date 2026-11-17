import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuickPlayHub } from '../QuickPlayHub';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
const authUser = vi.hoisted(() => ({ current: null as { id: string } | null }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: authUser.current }),
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


describe('QuickPlayHub — answered-challenge check', () => {
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

  const mineCalls = () => fetchMock.mock.calls.filter(([u]) => String(u).includes('mine=1'));

  it('Given a guest, When the hub opens, Then it never asks for "my answered challenge" (an auth-only endpoint that 401s)', async () => {
    authUser.current = null;
    render(<QuickPlayHub />);
    await waitFor(() => expect(roundCalls().length).toBeGreaterThan(0));
    expect(mineCalls()).toHaveLength(0);
  });

  it('Given a signed-in player, When the hub opens, Then it checks for an answered challenge', async () => {
    authUser.current = { id: 'u1' };
    render(<QuickPlayHub />);
    await waitFor(() => expect(mineCalls()).toHaveLength(1));
  });
});

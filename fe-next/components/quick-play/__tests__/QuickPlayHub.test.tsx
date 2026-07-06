import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
vi.mock('@/hooks/useBackOneLevel', () => ({
  useBackOneLevel: () => vi.fn(),
}));
vi.mock('../QuickPlayWheel', () => ({
  QuickPlayWheel: ({ onSelect, onPlay }: any) => (
    <div>
      <button data-testid="mock-select" onClick={() => onSelect('blast', 'drag')}>sel</button>
      <button data-testid="mock-play" onClick={onPlay}>play</button>
    </div>
  ),
}));
vi.mock('../adapters/QuickModeAdapter', () => ({
  QuickModeAdapter: ({ config, onDone }: any) => (
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
  ),
}));
vi.mock('../QuickPlayResults', () => ({
  QuickPlayResults: ({ onNextRound }: any) => (
    <div data-testid="mock-results">
      <button data-testid="mock-next" onClick={onNextRound}>next</button>
    </div>
  ),
}));

import posthog from '@/lib/analytics/lazyPosthog';

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

  it('starts on the wheel', () => {
    render(<QuickPlayHub />);
    expect(screen.getByTestId('quick-play-hub')).toBeTruthy();
  });

  it('selection fires analytics with method', () => {
    render(<QuickPlayHub />);
    fireEvent.click(screen.getByTestId('mock-select'));
    expect(vi.mocked(posthog.capture)).toHaveBeenCalledWith(
      'quick_play_mode_selected',
      expect.objectContaining({ mode: 'blast', method: 'drag' })
    );
  });

  it('random PLAY resolves a mode, fetches round, mounts adapter', async () => {
    render(<QuickPlayHub />);
    fireEvent.click(screen.getByTestId('mock-play'));
    await waitFor(() => expect(screen.getByTestId('mock-finish')).toBeTruthy());
    expect(vi.mocked(posthog.capture)).toHaveBeenCalledWith(
      'quick_play_mode_selected',
      expect.objectContaining({ method: 'random' })
    );
    const roundCall = fetchMock.mock.calls.find((c) => String(c[0]).includes('/round'));
    expect(roundCall).toBeTruthy();
  });

  it('round completion submits and shows results, then next round returns to wheel', async () => {
    render(<QuickPlayHub />);
    fireEvent.click(screen.getByTestId('mock-play'));
    await waitFor(() => screen.getByTestId('mock-finish'));
    fireEvent.click(screen.getByTestId('mock-finish'));
    await waitFor(() => expect(screen.getByTestId('mock-results')).toBeTruthy());
    expect(vi.mocked(posthog.capture)).toHaveBeenCalledWith(
      'quick_play_round_completed',
      expect.objectContaining({ mode: 'blast', scorePct: 68 })
    );
    fireEvent.click(screen.getByTestId('mock-next'));
    await waitFor(() => expect(screen.getByTestId('quick-play-hub')).toBeTruthy());
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
    fireEvent.click(screen.getByTestId('mock-play'));
    await waitFor(() => screen.getByTestId('mock-finish'));
    fireEvent.click(screen.getByTestId('mock-finish'));
    await waitFor(() => expect(screen.getByTestId('mock-results')).toBeTruthy());
  });

  it('returning to the wheel screen moves focus to its heading (screen swap has no nav to anchor on)', async () => {
    render(<QuickPlayHub />);
    fireEvent.click(screen.getByTestId('mock-play'));
    await waitFor(() => screen.getByTestId('mock-finish'));
    fireEvent.click(screen.getByTestId('mock-finish'));
    await waitFor(() => screen.getByTestId('mock-next'));
    fireEvent.click(screen.getByTestId('mock-next'));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByText('quickPlay.solo.title')));
  });

  it('challenge deep link shows banner and locks board', async () => {
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
    render(<QuickPlayHub challengeId="ch-9" />);
    await waitFor(() => expect(screen.getByTestId('quick-challenge-banner')).toBeTruthy());
    fireEvent.click(screen.getByTestId('mock-play'));
    await waitFor(() => screen.getByTestId('mock-finish'));
    const roundCall = fetchMock.mock.calls.find((c) => String(c[0]).includes('/round'));
    expect(JSON.parse(roundCall![1].body as string)).toMatchObject({ mode: 'classic', seed: 'shared-seed' });
  });
});

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
vi.mock('@/lib/avatar/revealTrigger', () => ({ publishLevelUp: vi.fn() }));
vi.mock('@/components/ui/BackButton', () => ({
  BackButton: ({ label }: any) => <button data-testid="mock-back">{label}</button>,
}));
vi.mock('@/hooks/useBackOneLevel', () => ({ useBackOneLevel: () => vi.fn() }));
vi.mock('../lightningPath', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lightningPath')>();
  return { ...actual, strikeHoldMs: () => 40 };
});
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
  QuickPlayResults: () => <div data-testid="mock-results" />,
}));

import posthog from '@/lib/analytics/lazyPosthog';

const roundPayload = {
  mode: 'blast', seed: 's-1', language: 'en', durationSec: 60,
  grid: [['a']], totalWords: 12, perfectScore: 500,
};

function captured(name: string) {
  return vi.mocked(posthog.capture).mock.calls.filter((c) => c[0] === name);
}

describe('QuickPlayHub round telemetry', () => {
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

  it('Given a board that loads, When play begins, Then round_started fires once with the resolved mode', async () => {
    render(<QuickPlayHub startMode="random" />);
    await waitFor(() => screen.getByTestId('mock-finish'), { timeout: 3000 });
    const starts = captured('quick_play_round_started');
    expect(starts).toHaveLength(1);
    expect(starts[0][1]).toMatchObject({ mode: 'blast', roundIndex: 1 });
  });

  it('Given a round that never loads, When the hub errors, Then round_started does not fire', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('/round')) return Promise.resolve({ ok: false, json: async () => ({}) });
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    render(<QuickPlayHub startMode="blast" />);
    await waitFor(() => expect(screen.getByTestId('quick-load-error')).toBeTruthy());
    expect(captured('quick_play_round_started')).toHaveLength(0);
  });

  it('Given a round in play, When the hub unmounts, Then round_abandoned fires with the round it was playing', async () => {
    const { unmount } = render(<QuickPlayHub startMode="blast" />);
    await waitFor(() => screen.getByTestId('mock-finish'), { timeout: 3000 });
    unmount();
    const bail = captured('quick_play_round_abandoned');
    expect(bail).toHaveLength(1);
    expect(bail[0][1]).toMatchObject({ mode: 'blast', roundIndex: 1, reason: 'teardown' });
    expect(captured('quick_play_round_completed')).toHaveLength(0);
  });

  it('Given a finished round, When the hub unmounts from results, Then nothing is abandoned', async () => {
    const { unmount } = render(<QuickPlayHub startMode="blast" />);
    await waitFor(() => screen.getByTestId('mock-finish'), { timeout: 3000 });
    fireEvent.click(screen.getByTestId('mock-finish'));
    await waitFor(() => expect(screen.getByTestId('mock-results')).toBeTruthy());
    unmount();
    expect(captured('quick_play_round_abandoned')).toHaveLength(0);
    expect(captured('quick_play_round_completed')).toHaveLength(1);
  });

  it('Given a finished round whose submit is in flight, When the hub unmounts, Then nothing is abandoned', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('/round')) return Promise.resolve({ ok: true, json: async () => roundPayload });
      if (String(url).includes('/submit')) return new Promise(() => undefined);
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    const { unmount } = render(<QuickPlayHub startMode="blast" />);
    await waitFor(() => screen.getByTestId('mock-finish'), { timeout: 3000 });
    fireEvent.click(screen.getByTestId('mock-finish'));
    // The phase is still 'playing' here: handleDone only reaches 'results'
    // after submit settles, and this submit never does.
    await waitFor(() => expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/submit'))).toBe(true));
    expect(screen.queryByTestId('mock-results')).toBeNull();
    unmount();
    expect(captured('quick_play_round_abandoned')).toHaveLength(0);
  });

  it('Given a round still loading, When the hub unmounts, Then nothing is abandoned', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('/round')) return new Promise(() => undefined);
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    const { unmount } = render(<QuickPlayHub startMode="blast" />);
    expect(screen.getByTestId('quick-play-hub')).toBeTruthy();
    unmount();
    expect(captured('quick_play_round_abandoned')).toHaveLength(0);
  });
});

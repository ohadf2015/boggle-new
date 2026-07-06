import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Showdown from '../Showdown';

// Mock SharedFxApp with the correct relative path (../../ from test to components)
vi.mock('../../../lib/pixiFx/SharedFxApp', () => ({
  SharedFxApp: {
    spawnCoinStream: vi.fn(),
    spawnBurst: vi.fn(),
  },
}));

// t returns the key so we can assert which label rendered.
vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

describe('Showdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  const base = {
    onDone: () => {},
    reducedMotion: true,
    bots: [{ name: 'Bot A', word: 'TRAIN' }],
  };

  it('labels a rejected word (none outcome, word present) as not-a-word', async () => {
    render(
      <Showdown
        {...base}
        playerWord="ZZZZ"
        settlement={{ outcome: 'none', stake: 20, multiplier: 0, delta: -5 }}
      />,
    );
    vi.advanceTimersByTime(400);
    await waitFor(() => {
      expect(screen.getByText('sealedBid.notAWord')).toBeInTheDocument();
    });
  });

  it('labels a deliberate pass (none outcome, no word) as pass', async () => {
    render(
      <Showdown
        {...base}
        playerWord={null}
        settlement={{ outcome: 'none', stake: 0, multiplier: 0, delta: 0 }}
      />,
    );
    vi.advanceTimersByTime(400);
    await waitFor(() => {
      expect(screen.getByText('sealedBid.pass')).toBeInTheDocument();
    });
  });

  it('unique shows win + payout with +60 text', async () => {
    render(
      <Showdown
        {...base}
        playerWord="RETINAS"
        settlement={{ outcome: 'unique', stake: 20, multiplier: 4, delta: 60 }}
      />,
    );

    // Advance timers to trigger reveal
    vi.advanceTimersByTime(400);

    await waitFor(() => {
      expect(screen.getByText(/\+60/)).toBeInTheDocument();
    });
  });

  it('clash shows loss with -20 text', async () => {
    render(
      <Showdown
        {...base}
        playerWord="TRAIN"
        settlement={{ outcome: 'clash', stake: 20, multiplier: 2, delta: -20 }}
      />,
    );

    // Advance timers to trigger reveal
    vi.advanceTimersByTime(400);

    await waitFor(() => {
      expect(screen.getByText(/-20/)).toBeInTheDocument();
    });
  });
});

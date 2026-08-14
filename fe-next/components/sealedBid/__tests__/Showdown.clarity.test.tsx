import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import Showdown from '../Showdown';

vi.mock('../../../lib/pixiFx/SharedFxApp', () => ({
  SharedFxApp: { spawnCoinStream: vi.fn(), spawnBurst: vi.fn() },
}));

vi.mock('gsap', () => ({ default: { fromTo: vi.fn() } }));

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'sealedBid.notAWord': 'Not a word',
        'sealedBid.clash': 'Clash',
        'sealedBid.draw': 'Pass',
        'sealedBid.youWin': 'You win!',
        'sealedBid.youLose': 'Clashed',
        'sealedBid.continue': 'Continue',
        'sealedBid.chips': 'chips',
        'sealedBid.showdown': 'Showdown',
      };
      return map[key] ?? key;
    },
  }),
}));

const base = { onDone: vi.fn(), reducedMotion: true };

describe('Showdown clarity', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('rejected word vs deliberate pass', () => {
    // Both settle as outcome 'none'. The discriminator is the delta: a
    // deliberate pass risks nothing (0), a dict-rejected word forfeits
    // min(stake, 5). Showing "Pass" for a rejected word tells the player their
    // word was fine and they chose not to bid — the opposite of what happened.
    it('names a dict-rejected word instead of calling it a pass', () => {
      render(
        <Showdown
          {...base}
          playerWord="ZZZQX"
          bots={[{ name: 'Rival 1', word: 'TRAIN' }]}
          settlement={{ outcome: 'none', stake: 20, multiplier: 0, delta: -5 }}
        />
      );
      const banner = screen.getByTestId('showdown-outcome');
      expect(banner).toHaveTextContent('Not a word');
      expect(banner).not.toHaveTextContent('Pass');
    });

    it('still reads as a pass when the player deliberately passed', () => {
      render(
        <Showdown
          {...base}
          playerWord={null}
          bots={[{ name: 'Rival 1', word: 'TRAIN' }]}
          settlement={{ outcome: 'none', stake: 0, multiplier: 0, delta: 0 }}
        />
      );
      const banner = screen.getByTestId('showdown-outcome');
      expect(banner).toHaveTextContent('Pass');
      expect(banner).not.toHaveTextContent('Not a word');
    });
  });

  describe('clash attribution', () => {
    it('marks the rival card that matched the player word', () => {
      render(
        <Showdown
          {...base}
          playerWord="train"
          bots={[
            { name: 'Rival 1', word: 'RETINA' },
            { name: 'Rival 2', word: 'TRAIN' },
          ]}
          settlement={{ outcome: 'clash', stake: 20, multiplier: 2, delta: -20 }}
        />
      );
      const cards = screen.getAllByTestId('showdown-rival-card');
      expect(cards).toHaveLength(2);
      expect(cards[0]).toHaveAttribute('data-clashed', 'false');
      expect(cards[1]).toHaveAttribute('data-clashed', 'true');
    });

    it('marks no rival when the bid was unique', () => {
      render(
        <Showdown
          {...base}
          playerWord="RETINAS"
          bots={[{ name: 'Rival 1', word: 'TRAIN' }]}
          settlement={{ outcome: 'unique', stake: 20, multiplier: 4, delta: 60 }}
        />
      );
      expect(screen.getByTestId('showdown-rival-card')).toHaveAttribute('data-clashed', 'false');
    });
  });

  describe('payout math', () => {
    // The odds board shows "Unique pays 4x" while bidding, then the showdown
    // showed a bare "+60" — the player had no way to connect the two.
    it('shows the multiplier that produced the payout on a unique bid', () => {
      render(
        <Showdown
          {...base}
          playerWord="RETINAS"
          bots={[{ name: 'Rival 1', word: 'TRAIN' }]}
          settlement={{ outcome: 'unique', stake: 20, multiplier: 4, delta: 60 }}
        />
      );
      expect(screen.getByTestId('showdown-payout-math')).toHaveTextContent('4');
    });

    it('omits the payout math when there was no winning bid', () => {
      render(
        <Showdown
          {...base}
          playerWord={null}
          bots={[{ name: 'Rival 1', word: 'TRAIN' }]}
          settlement={{ outcome: 'none', stake: 0, multiplier: 0, delta: 0 }}
        />
      );
      expect(screen.queryByTestId('showdown-payout-math')).not.toBeInTheDocument();
    });
  });

  describe('delta count-up', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('counts the payout up and lands exactly on the settled delta', async () => {
      render(
        <Showdown
          {...base}
          reducedMotion={false}
          playerWord="RETINAS"
          bots={[{ name: 'Rival 1', word: 'TRAIN' }]}
          settlement={{ outcome: 'unique', stake: 20, multiplier: 4, delta: 60 }}
        />
      );
      // Banner appears after the cards flip.
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      const mid = screen.getByTestId('showdown-delta').textContent;
      expect(mid).not.toBe('+60');

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.getByTestId('showdown-delta')).toHaveTextContent('+60');
    });
  });
});

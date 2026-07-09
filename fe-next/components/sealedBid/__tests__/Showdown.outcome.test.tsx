import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Showdown from '../Showdown';

vi.mock('../../../lib/pixiFx/SharedFxApp', () => ({
  SharedFxApp: {
    spawnCoinStream: vi.fn(),
    spawnBurst: vi.fn(),
  },
}));

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'sealedBid.unique': 'Unique',
        'sealedBid.clash': 'Clash',
        'sealedBid.pass': 'Pass',
        'sealedBid.youWin': 'You win!',
        'sealedBid.youLose': 'Clashed',
        'sealedBid.draw': 'Pass',
        'sealedBid.continue': 'Continue',
        'sealedBid.chips': 'chips',
      };
      return map[key] ?? key;
    },
  }),
}));

describe('Showdown outcome banner (indicative)', () => {
  const base = {
    onDone: vi.fn(),
    reducedMotion: true,
    bots: [{ name: 'Bot A', word: 'TRAIN' }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('unique: outcome banner + positive delta + player word', () => {
    render(
      <Showdown
        {...base}
        playerWord="RETINAS"
        settlement={{ outcome: 'unique', stake: 20, multiplier: 4, delta: 60 }}
      />
    );
    expect(screen.getByTestId('showdown-outcome')).toHaveAttribute('data-outcome', 'unique');
    expect(screen.getByTestId('showdown-delta')).toHaveTextContent('+60');
    expect(screen.getByTestId('showdown-player-word')).toHaveTextContent('RETINAS');
  });

  it('clash: outcome banner + negative delta', () => {
    render(
      <Showdown
        {...base}
        playerWord="TRAIN"
        settlement={{ outcome: 'clash', stake: 20, multiplier: 2, delta: -20 }}
      />
    );
    expect(screen.getByTestId('showdown-outcome')).toHaveAttribute('data-outcome', 'clash');
    expect(screen.getByTestId('showdown-delta')).toHaveTextContent('-20');
  });

  it('pass/none: outcome banner + zero delta', () => {
    render(
      <Showdown
        {...base}
        playerWord={null}
        settlement={{ outcome: 'none', stake: 0, multiplier: 0, delta: 0 }}
      />
    );
    expect(screen.getByTestId('showdown-outcome')).toHaveAttribute('data-outcome', 'none');
    expect(screen.getByTestId('showdown-delta')).toHaveTextContent(/^\+?0$/);
  });
});

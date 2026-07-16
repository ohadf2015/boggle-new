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
        'sealedBid.revealing': 'Revealing…',
        'sealedBid.continue': 'Continue',
        'sealedBid.chips': 'chips',
        'sealedBid.youWin': 'You win!',
        'sealedBid.youLose': 'Clashed',
        'sealedBid.showdown': 'Showdown',
        'sealedBid.unique': 'Unique',
        'sealedBid.botRival': 'Bot',
      };
      return map[key] ?? key;
    },
  }),
}));

describe('Showdown staggered reveal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const makeProps = (overrides: Record<string, unknown> = {}) => ({
    playerWord: 'RETINAS',
    bots: [{ name: 'Bot A', word: 'TRAIN' }],
    settlement: { outcome: 'unique' as const, stake: 20, multiplier: 4, delta: 60 },
    onDone: vi.fn(),
    reducedMotion: false,
    ...overrides,
  });

  it('hides outcome banner initially when animation runs', () => {
    render(<Showdown {...makeProps()} />);
    expect(screen.queryByTestId('showdown-outcome')).not.toBeInTheDocument();
  });

  it('shows suspense text while waiting for reveal', () => {
    render(<Showdown {...makeProps()} />);
    expect(screen.getByTestId('showdown-suspense')).toBeInTheDocument();
  });

  it('reveals outcome banner after reveal delay', async () => {
    render(<Showdown {...makeProps()} />);
    expect(screen.queryByTestId('showdown-outcome')).not.toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('showdown-outcome')).toBeInTheDocument();
    expect(screen.queryByTestId('showdown-suspense')).not.toBeInTheDocument();
  });

  it('shows outcome immediately in reduced-motion mode', () => {
    render(<Showdown {...makeProps({ reducedMotion: true })} />);
    expect(screen.getByTestId('showdown-outcome')).toBeInTheDocument();
    expect(screen.queryByTestId('showdown-suspense')).not.toBeInTheDocument();
  });
});

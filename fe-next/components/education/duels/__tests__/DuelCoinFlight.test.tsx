import { render, screen, act } from '@testing-library/react';
import { DuelCoinFlight } from '../DuelCoinFlight';

const playSound = vi.fn();
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

vi.mock('framer-motion', () => ({
  m: { div: ({ children, ...props }: any) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

let skipAnimations = false;
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  useSkipAnimations: () => skipAnimations,
}));

describe('DuelCoinFlight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    skipAnimations = false;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('shows an empty coin counter before the award starts', () => {
    render(<DuelCoinFlight coins={40} active={false} />);
    expect(screen.getByTestId('duel-coin-counter')).toHaveTextContent('0');
  });

  it('flies coins into the counter and lands the full amount', () => {
    const onComplete = vi.fn();
    render(<DuelCoinFlight coins={40} active onComplete={onComplete} />);

    expect(screen.getAllByTestId('duel-coin-token').length).toBeGreaterThan(0);
    expect(screen.getByTestId('duel-coin-counter')).toHaveTextContent('0');

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.getByTestId('duel-coin-counter')).toHaveTextContent('40');
    expect(onComplete).toHaveBeenCalled();
  });

  it('plays a coin sound as the coins land', () => {
    render(<DuelCoinFlight coins={40} active />);

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(playSound).toHaveBeenCalledWith('coinCollect', expect.anything());
  });

  it('under reduced motion awards instantly with no flying coins', () => {
    skipAnimations = true;
    const onComplete = vi.fn();
    render(<DuelCoinFlight coins={25} active onComplete={onComplete} />);

    expect(screen.queryByTestId('duel-coin-token')).not.toBeInTheDocument();
    expect(screen.getByTestId('duel-coin-counter')).toHaveTextContent('25');
    expect(onComplete).toHaveBeenCalled();
  });

  it('never awards more than the coins it was given', () => {
    render(<DuelCoinFlight coins={3} active />);

    act(() => {
      vi.advanceTimersByTime(8000);
    });

    expect(screen.getByTestId('duel-coin-counter')).toHaveTextContent('3');
  });

  it('renders nothing to fly when there are no coins', () => {
    render(<DuelCoinFlight coins={0} active />);
    expect(screen.queryByTestId('duel-coin-token')).not.toBeInTheDocument();
  });
});

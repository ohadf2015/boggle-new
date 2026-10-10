import { render, screen, cleanup } from '@testing-library/react';

const { reducedMock } = vi.hoisted(() => ({ reducedMock: vi.fn(() => false) }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, params?: Record<string, string | number>) =>
      key === 'blast.wallet.coins' ? `Coins: ${params?.count}` : key,
  }),
}));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => reducedMock() }));

import BlastWalletHud, { reelStops } from '../BlastWalletHud';
import { markCoinsInFlight } from '@/utils/coinEarnedFx';

const chip = () => screen.getByTestId('coin-counter');
const delayOf = (el: HTMLElement) => parseInt(el.style.animationDelay, 10);

describe('BlastWalletHud', () => {
  beforeEach(() => {
    reducedMock.mockReturnValue(false);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('is the coin wallet coins fly into, visible even at 0', () => {
    render(<BlastWalletHud coins={0} />);
    expect(chip()).toHaveAttribute('data-coin-counter', 'true');
    expect(chip()).toHaveAttribute('aria-label', 'Coins: 0');
    expect(screen.getByTestId('coin-counter-value')).toHaveTextContent('0');
  });

  it('shows coins only, no second currency, and its text is just the balance', () => {
    render(<BlastWalletHud coins={1234} />);
    expect(screen.queryByLabelText(/gem/i)).toBeNull();
    expect(screen.getAllByTestId('coin-counter')).toHaveLength(1);
    expect(chip()).toHaveTextContent(/^1,234$/);
  });

  it('schedules the roll, bump and +N tag for the moment the flying coins land', () => {
    const { rerender } = render(<BlastWalletHud coins={10} />);
    markCoinsInFlight(600);
    rerender(<BlastWalletHud coins={14} />);
    expect(chip()).toHaveAttribute('data-landing', '10>14');
    const gain = screen.getByTestId('coin-counter-gain');
    expect(gain).toHaveAttribute('data-amount', '+4');
    expect(delayOf(gain)).toBe(600);
    expect(chip()).toHaveTextContent(/^14$/);
  });

  it('a top-up while coins are still flying keeps rolling from the pre-flight balance', () => {
    const { rerender } = render(<BlastWalletHud coins={10} />);
    markCoinsInFlight(600);
    rerender(<BlastWalletHud coins={12} />);
    vi.advanceTimersByTime(300);
    markCoinsInFlight(900);
    rerender(<BlastWalletHud coins={30} />);
    expect(chip()).toHaveAttribute('data-landing', '10>30');
    expect(screen.getByTestId('coin-counter-gain')).toHaveAttribute('data-amount', '+20');
    expect(delayOf(screen.getByTestId('coin-counter-gain'))).toBe(900);
  });

  it('after the coins land, the next earn rolls from the landed balance at once', () => {
    const { rerender } = render(<BlastWalletHud coins={10} />);
    rerender(<BlastWalletHud coins={12} />);
    vi.advanceTimersByTime(2000);
    rerender(<BlastWalletHud coins={15} />);
    expect(chip()).toHaveAttribute('data-landing', '12>15');
    expect(delayOf(screen.getByTestId('coin-counter-gain'))).toBe(0);
  });

  it('rolls down on a spend and shows what left the wallet', () => {
    markCoinsInFlight(600);
    const { rerender } = render(<BlastWalletHud coins={500} />);
    rerender(<BlastWalletHud coins={380} />);
    expect(chip()).toHaveAttribute('data-landing', '500>380');
    const spent = screen.getByTestId('coin-counter-spent');
    expect(spent).toHaveAttribute('data-amount', '-120');
    expect(delayOf(spent)).toBe(0);
    expect(screen.queryByTestId('coin-counter-gain')).toBeNull();
  });

  it('updates at once with no roll under reduced motion', () => {
    reducedMock.mockReturnValue(true);
    const { rerender } = render(<BlastWalletHud coins={10} />);
    rerender(<BlastWalletHud coins={14} />);
    expect(chip()).not.toHaveAttribute('data-landing');
    expect(screen.queryByTestId('coin-counter-gain')).toBeNull();
    expect(chip()).toHaveTextContent(/^14$/);
  });
});

describe('reelStops', () => {
  const at = (stops: ReturnType<typeof reelStops>) => stops.map((s) => (s.kind === 'digit' ? `${s.start}>${s.end}` : s.char));

  it('rolls each digit forward on an earn, a new leading digit rolling in from blank', () => {
    expect(at(reelStops(6, 21, '21'))).toEqual(['0>3', '7>12']);
  });

  it('leaves unchanged digits still', () => {
    expect(at(reelStops(120, 125, '125'))).toEqual(['2>2', '3>3', '1>6']);
  });

  it('rolls backward on a spend', () => {
    expect(at(reelStops(500, 380, '380'))).toEqual(['16>4', '11>9', '1>1']);
  });

  it('keeps separators as fixed cells', () => {
    expect(at(reelStops(999, 1000, '1,000'))).toEqual(['0>2', ',', '10>11', '10>11', '10>11']);
  });
});

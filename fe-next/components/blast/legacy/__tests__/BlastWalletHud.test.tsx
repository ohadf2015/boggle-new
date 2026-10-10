import { render, screen, act, cleanup } from '@testing-library/react';

const { reducedMock } = vi.hoisted(() => ({ reducedMock: vi.fn(() => false) }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, params?: Record<string, string | number>) =>
      key === 'blast.wallet.coins' ? `Coins: ${params?.count}` : key,
  }),
}));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => reducedMock() }));

import BlastWalletHud from '../BlastWalletHud';
import { markCoinsInFlight } from '@/utils/coinEarnedFx';

const shown = () => screen.getByTestId('coin-counter-value').textContent;

describe('BlastWalletHud', () => {
  beforeEach(() => {
    reducedMock.mockReturnValue(false);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('is the coin wallet coins fly into, visible even at 0', () => {
    render(<BlastWalletHud coins={0} />);
    const chip = screen.getByTestId('coin-counter');
    expect(chip).toHaveAttribute('data-coin-counter', 'true');
    expect(chip).toHaveAttribute('aria-label', 'Coins: 0');
    expect(shown()).toBe('0');
  });

  it('shows coins only, no second currency', () => {
    render(<BlastWalletHud coins={12} />);
    expect(screen.queryByLabelText(/gem/i)).toBeNull();
    expect(screen.getAllByTestId('coin-counter')).toHaveLength(1);
  });

  it('holds the old balance while coins are in flight, then rolls up as they land', () => {
    const { rerender } = render(<BlastWalletHud coins={10} />);
    markCoinsInFlight(600);
    rerender(<BlastWalletHud coins={14} />);
    act(() => { vi.advanceTimersByTime(550); });
    expect(shown()).toBe('10');
    expect(screen.queryByTestId('coin-counter-gain')).toBeNull();
    act(() => { vi.advanceTimersByTime(1200); });
    expect(shown()).toBe('14');
    expect(screen.getByTestId('coin-counter-gain')).toHaveTextContent('+4');
  });

  it('rolls straight away when no coins are in flight', () => {
    const { rerender } = render(<BlastWalletHud coins={10} />);
    act(() => { vi.advanceTimersByTime(2000); });
    rerender(<BlastWalletHud coins={12} />);
    act(() => { vi.advanceTimersByTime(600); });
    expect(shown()).toBe('12');
  });

  it('rolls down on a spend and shows what left the wallet', () => {
    const { rerender } = render(<BlastWalletHud coins={500} />);
    rerender(<BlastWalletHud coins={380} />);
    act(() => { vi.advanceTimersByTime(200); });
    const mid = Number(shown());
    expect(mid).toBeLessThan(500);
    expect(mid).toBeGreaterThan(380);
    expect(screen.getByTestId('coin-counter-spent')).toHaveTextContent('-120');
    act(() => { vi.advanceTimersByTime(800); });
    expect(shown()).toBe('380');
  });

  it('updates at once under reduced motion', () => {
    reducedMock.mockReturnValue(true);
    const { rerender } = render(<BlastWalletHud coins={10} />);
    rerender(<BlastWalletHud coins={14} />);
    act(() => { vi.advanceTimersByTime(20); });
    expect(shown()).toBe('14');
  });
});

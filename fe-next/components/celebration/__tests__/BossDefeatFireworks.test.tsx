import { render, screen } from '@testing-library/react';
import { BossDefeatFireworks, BOSS_TIER_CONFIG } from '../BossDefeatFireworks';

// Mock NewYearFireworks
vi.mock('../NewYearFireworks', () => ({
  __esModule: true,
  default: ({ active, count, duration }: { active: boolean; count: number; duration: number }) => (
    active ? (
      <div data-testid="mock-fireworks" data-count={count} data-duration={duration}>
        Fireworks
      </div>
    ) : null
  ),
}));

describe('BossDefeatFireworks', () => {
  it('renders nothing when not active', () => {
    render(<BossDefeatFireworks active={false} bossTier="standard" />);
    expect(screen.queryByTestId('mock-fireworks')).not.toBeInTheDocument();
  });

  it('renders fireworks when active', () => {
    render(<BossDefeatFireworks active={true} bossTier="standard" />);
    expect(screen.getByTestId('mock-fireworks')).toBeInTheDocument();
  });

  it('uses mini tier config (6 bursts, 3s)', () => {
    render(<BossDefeatFireworks active={true} bossTier="mini" />);
    const fireworks = screen.getByTestId('mock-fireworks');
    expect(fireworks.dataset.count).toBe('6');
    expect(fireworks.dataset.duration).toBe('3000');
  });

  it('uses standard tier config (10 bursts, 5s)', () => {
    render(<BossDefeatFireworks active={true} bossTier="standard" />);
    const fireworks = screen.getByTestId('mock-fireworks');
    expect(fireworks.dataset.count).toBe('10');
    expect(fireworks.dataset.duration).toBe('5000');
  });

  it('uses elite tier config (15 bursts, 8s)', () => {
    render(<BossDefeatFireworks active={true} bossTier="elite" />);
    const fireworks = screen.getByTestId('mock-fireworks');
    expect(fireworks.dataset.count).toBe('15');
    expect(fireworks.dataset.duration).toBe('8000');
  });

  it('exports BOSS_TIER_CONFIG constant', () => {
    expect(BOSS_TIER_CONFIG.mini).toEqual({ count: 6, duration: 3000 });
    expect(BOSS_TIER_CONFIG.standard).toEqual({ count: 10, duration: 5000 });
    expect(BOSS_TIER_CONFIG.elite).toEqual({ count: 15, duration: 8000 });
  });
});

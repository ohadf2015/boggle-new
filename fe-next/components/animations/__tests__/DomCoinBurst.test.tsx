import { render, screen, act, cleanup } from '@testing-library/react';
import { DomCoinBurst, coinFlightTiming } from '../DomCoinBurst';

describe('DomCoinBurst', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('lands the first coin while the 700ms frame is still mid-moment, and the last within ~1.1s', () => {
    const t = coinFlightTiming(12);
    expect(t.firstLandMs).toBeGreaterThan(300);
    expect(t.firstLandMs).toBeLessThan(700);
    expect(t.lastLandMs).toBeGreaterThan(t.firstLandMs);
    expect(t.lastLandMs).toBeLessThanOrEqual(1100);
    expect(t.totalMs).toBeGreaterThan(t.lastLandMs);
  });

  it('renders one coin per count, flying from source to target', () => {
    render(<DomCoinBurst source={{ x: 100, y: 500 }} target={{ x: 320, y: 40 }} count={6} onDone={() => {}} />);
    const burst = screen.getByTestId('dom-coin-burst');
    expect(burst).toHaveAttribute('data-from', '100,500');
    expect(burst).toHaveAttribute('data-to', '320,40');
    expect(screen.getAllByTestId('flying-coin')).toHaveLength(6);
  });

  it('reports each coin landing in order, then finishes', () => {
    vi.useFakeTimers();
    const onLand = vi.fn();
    const onDone = vi.fn();
    render(<DomCoinBurst source={{ x: 0, y: 0 }} target={{ x: 10, y: 10 }} count={3} onLand={onLand} onDone={onDone} />);
    const t = coinFlightTiming(3);
    act(() => { vi.advanceTimersByTime(t.firstLandMs - 1); });
    expect(onLand).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(onLand).toHaveBeenCalledWith(0);
    act(() => { vi.advanceTimersByTime(t.lastLandMs - t.firstLandMs); });
    expect(onLand.mock.calls.map((c) => c[0])).toEqual([0, 1, 2]);
    expect(onDone).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(t.totalMs - t.lastLandMs); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

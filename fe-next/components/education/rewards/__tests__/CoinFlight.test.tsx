import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { useRef } from 'react';
import { render, screen, cleanup, act } from '@testing-library/react';
import CoinFlight from '../CoinFlight';

function Harness({ count, withTarget = true, selector, onDone }: { count: number; withTarget?: boolean; selector?: string; onDone?: () => void }) {
  const from = useRef<HTMLDivElement>(null);
  const to = useRef<HTMLDivElement>(null);
  return (
    <div>
      <div ref={from} />
      {withTarget && <div ref={to} data-landing="" />}
      <CoinFlight count={count} fromRef={from} toRef={selector ? undefined : to} toSelector={selector} onDone={onDone} />
    </div>
  );
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('CoinFlight', () => {
  it('Given three coins, When it mounts, Then three coins are in the air', () => {
    render(<Harness count={3} />);
    expect(screen.getAllByTestId('coin-flight-token')).toHaveLength(3);
  });

  it('Given zero coins, Then nothing renders', () => {
    render(<Harness count={0} />);
    expect(screen.queryByTestId('coin-flight-token')).toBeNull();
  });

  it('Given a landing selector, When the node exists, Then the coins fly to it', () => {
    render(<Harness count={2} selector="[data-landing]" />);
    expect(screen.getAllByTestId('coin-flight-token')).toHaveLength(2);
  });

  it('Given no landing node at all, Then the coins still fly (to the top of the screen) instead of vanishing', () => {
    render(<Harness count={2} withTarget={false} selector="[data-missing]" />);
    expect(screen.getAllByTestId('coin-flight-token')).toHaveLength(2);
  });

  it('Given a flight, When every coin has landed, Then onDone fires once', () => {
    const onDone = vi.fn();
    render(<Harness count={4} onDone={onDone} />);
    expect(onDone).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('Given a finished flight, Then no coin is left hanging over the number it paid into', () => {
    render(<Harness count={3} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByTestId('coin-flight-token')).toBeNull();
  });
});

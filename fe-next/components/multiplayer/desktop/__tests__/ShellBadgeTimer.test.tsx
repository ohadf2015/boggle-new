import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { ShellBadgeTimer } from '../ShellBadgeTimer';

// Capture the props the underlying self-driven ring receives each render.
const calls: Array<Record<string, unknown>> = [];
vi.mock('../../../ui/CircularTimer', () => ({
  default: (props: Record<string, unknown>) => {
    calls.push(props);
    return <div data-testid="ring" data-key={String(props.timerKey)} data-init={String(props.initialRemainingTime)} />;
  },
}));

describe('ShellBadgeTimer', () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it('forwards mode color + size to the ring and starts at key 0', () => {
    const { getByTestId } = render(
      <ShellBadgeTimer remainingTime={90} totalTime={180} size={80} colorFamily="cyan" />,
    );
    const ring = getByTestId('ring');
    expect(ring.getAttribute('data-key')).toBe('0');
    const last = calls[calls.length - 1];
    expect(last.colorFamily).toBe('cyan');
    expect(last.size).toBe(80);
    expect(last.duration).toBe(180);
    expect(last.isPlaying).toBe(true);
  });

  it('does NOT remount the ring (stable key) across normal 1Hz server ticks', () => {
    const { rerender, getByTestId } = render(
      <ShellBadgeTimer remainingTime={90} totalTime={180} size={80} colorFamily="cyan" />,
    );
    const k0 = getByTestId('ring').getAttribute('data-key');
    rerender(<ShellBadgeTimer remainingTime={89} totalTime={180} size={80} colorFamily="cyan" />);
    rerender(<ShellBadgeTimer remainingTime={88} totalTime={180} size={80} colorFamily="cyan" />);
    // Normal countdown matches the ring's own prediction → no re-seed.
    expect(getByTestId('ring').getAttribute('data-key')).toBe(k0);
  });

  it('re-seeds the ring (new key) when the server time jumps past tolerance', () => {
    const { rerender, getByTestId } = render(
      <ShellBadgeTimer remainingTime={90} totalTime={180} size={80} colorFamily="cyan" />,
    );
    const k0 = Number(getByTestId('ring').getAttribute('data-key'));
    // Reconnect: server resends a value far from where the ring believes it is.
    rerender(<ShellBadgeTimer remainingTime={30} totalTime={180} size={80} colorFamily="cyan" />);
    const ring = getByTestId('ring');
    expect(Number(ring.getAttribute('data-key'))).toBeGreaterThan(k0);
    expect(ring.getAttribute('data-init')).toBe('30');
  });
});

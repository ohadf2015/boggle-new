import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MpCallouts, CALLOUT_MS, BANNER_MS } from '../MpCallouts';

describe('MpCallouts — two lanes, never a stack', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('uses the WT2 lane timings', () => {
    expect(CALLOUT_MS).toBe(780);
    expect(BANNER_MS).toBe(1450);
  });

  it('shows only the newest callout, then clears it after 780ms', () => {
    const { rerender } = render(<MpCallouts callout={{ id: 'a', text: 'ON FIRE' }} banners={[]} onBannerDone={() => {}} />);
    expect(screen.getByTestId('mp-callout').textContent).toBe('ON FIRE');
    rerender(<MpCallouts callout={{ id: 'b', text: 'x3' }} banners={[]} onBannerDone={() => {}} />);
    expect(screen.getAllByTestId('mp-callout')).toHaveLength(1);
    expect(screen.getByTestId('mp-callout').textContent).toBe('x3');
    act(() => { vi.advanceTimersByTime(CALLOUT_MS); });
    expect(screen.queryByTestId('mp-callout')).toBeNull();
  });

  it('shows only the head of the banner queue and reports it done after 1450ms', () => {
    const done = vi.fn();
    render(
      <MpCallouts
        callout={null}
        banners={[{ id: '1', text: 'first' }, { id: '2', text: 'second' }]}
        onBannerDone={done}
      />,
    );
    expect(screen.getAllByTestId('mp-banner')).toHaveLength(1);
    expect(screen.getByTestId('mp-banner').textContent).toBe('first');
    act(() => { vi.advanceTimersByTime(BANNER_MS); });
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('quiet tone renders the small low-contrast style', () => {
    render(<MpCallouts callout={{ id: 'q', text: 'quiet', tone: 'quiet' }} banners={[]} onBannerDone={() => {}} />);
    expect(screen.getByTestId('mp-callout').getAttribute('data-tone')).toBe('quiet');
  });

  it('never intercepts taps', () => {
    render(<MpCallouts callout={{ id: 'a', text: 'x' }} banners={[]} onBannerDone={() => {}} />);
    expect(screen.getByTestId('mp-callouts').className).toContain('pointer-events-none');
  });
});

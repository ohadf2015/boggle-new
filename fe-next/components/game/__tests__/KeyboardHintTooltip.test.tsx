import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KeyboardHintTooltip } from '../KeyboardHintTooltip';

const t = (k: string) => k;

describe('KeyboardHintTooltip', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/537.36',
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with explicit fixed width (not max-w) so long ES copy cannot blow it up', async () => {
    render(<KeyboardHintTooltip delaySeconds={1} t={t} />);
    await act(async () => { vi.advanceTimersByTime(1100); });

    const tip = screen.getByRole('tooltip');
    expect(tip.className.split(/\s+/)).toContain('w-[240px]');
    expect(tip.className.split(/\s+/)).not.toContain('max-w-[220px]');
  });

  it('anchors to bottom-left so it does not overlap the board or round-start countdown', async () => {
    render(<KeyboardHintTooltip delaySeconds={1} t={t} />);
    await act(async () => { vi.advanceTimersByTime(1100); });

    const tip = screen.getByRole('tooltip');
    expect(tip.className).toMatch(/\bbottom-28\b/);
    expect(tip.className).toMatch(/\bleft-3\b/);
    expect(tip.className).not.toMatch(/\btop-28\b/);
  });

  it('does not render when suppressed (e.g. during start countdown)', async () => {
    render(<KeyboardHintTooltip delaySeconds={1} suppressed t={t} />);
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});

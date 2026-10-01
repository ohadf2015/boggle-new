/**
 * BlastTileFirstUseCallout — first-time "what this special tile does" callout.
 *
 * Single-player: player reads it, taps "Got it" to dismiss early (or it
 * auto-dismisses after a while). Multiplayer is time-pressured and hands-busy,
 * so the callout must NOT demand a click — in MP we hide the ack button and let
 * it auto-disappear on a shorter timer so it never steals a tap mid-round.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, fb?: string) => fb ?? k }),
}));
vi.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => false,
}));

import { BlastTileFirstUseCallout } from '../BlastTileFirstUseCallout';

describe('BlastTileFirstUseCallout — single-player', () => {
  it('renders the ack button so the player can dismiss it', () => {
    render(<BlastTileFirstUseCallout type="bomb" onDismiss={vi.fn()} />);
    expect(screen.getByRole('button')).toBeDefined();
  });
});

describe('BlastTileFirstUseCallout — multiplayer auto-dismiss', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('hides the ack button in MP (no click required)', () => {
    render(<BlastTileFirstUseCallout type="bomb" onDismiss={vi.fn()} isMultiplayer />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('auto-dismisses in MP without any interaction', () => {
    const onDismiss = vi.fn();
    render(<BlastTileFirstUseCallout type="bomb" onDismiss={onDismiss} isMultiplayer />);
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(onDismiss).toHaveBeenCalled();
  });

  it('dismisses faster in MP than in SP', () => {
    const spDismiss = vi.fn();
    const { unmount } = render(<BlastTileFirstUseCallout type="bomb" onDismiss={spDismiss} />);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    // SP timer is longer — still up after 4s.
    expect(spDismiss).not.toHaveBeenCalled();
    unmount();
  });
});

describe('BlastTileFirstUseCallout — single-player auto-dismiss', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('clears off the board within 4.5s so it does not hide the top rows', () => {
    const onDismiss = vi.fn();
    render(<BlastTileFirstUseCallout type="bomb" onDismiss={onDismiss} />);
    act(() => { vi.advanceTimersByTime(4500); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('BlastTileFirstUseCallout — placement', () => {
  it('hangs below the board instead of covering its top rows', () => {
    render(<BlastTileFirstUseCallout type="bomb" onDismiss={vi.fn()} />);
    const wrapper = screen.getByTestId('blast-tile-first-use').parentElement!;
    expect(wrapper.className).toContain('top-full');
  });
});

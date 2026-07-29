/**
 * CrazyGamesWelcome - Tests
 *
 * Verifies the CG portal welcome:
 * - Fires `cg_welcome_view` on mount (existing behavior)
 * - Auto-routes to `daily` after 5s idle with `{ auto: true }` payload
 * - Cancels auto-route on any user CTA tap
 * - Cancels auto-route on pointer interaction inside the modal
 * - Fires `cg_welcome_dismissed { reason: 'unmount' }` if unmounted before CTA fires
 * - Does NOT fire `cg_welcome_dismissed` if a CTA fired (consumed intent)
 * - ESC key fires `cg_welcome_dismissed { reason: 'esc' }` and stops auto-route
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CrazyGamesWelcome from '../CrazyGamesWelcome';
import { trackGrowthEvent } from '@/utils/growthTracking';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr',
    language: 'en',
    setLanguage: vi.fn(),
  }),
}));

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
}));

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    getSystemInfo: vi.fn().mockResolvedValue({ countryCode: null }),
  }),
}));

vi.mock('@/utils/cgLocaleDetect', () => ({
  detectCrazyGamesLanguage: () => null,
}));

vi.mock('../WelcomeDemoGrid', () => ({
  __esModule: true,
  default: () => <div data-testid="welcome-demo-grid" />,
}));

vi.mock('../demoConfigs', () => ({
  getWelcomeDemoConfig: () => ({ word: 'PLAY' }),
}));

vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: () => ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  }),
  AnimatePresence: ({ children }: any) => children,
}));

describe('CrazyGamesWelcome auto-route + dismissal', () => {
  const onPlay = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires cg_welcome_view on mount', () => {
    render(<CrazyGamesWelcome onPlay={onPlay} />);
    expect(trackGrowthEvent).toHaveBeenCalledWith(
      'cg_welcome_view',
      expect.objectContaining({ source: 'crazygames' })
    );
  });

  it('auto-routes to daily after 5s idle with { auto: true } payload', () => {
    render(<CrazyGamesWelcome onPlay={onPlay} />);
    expect(onPlay).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(trackGrowthEvent).toHaveBeenCalledWith(
      'cg_welcome_play',
      expect.objectContaining({ mode: 'daily', auto: true })
    );
    expect(onPlay).toHaveBeenCalledWith('daily');
  });

  it('does not auto-route if user taps the daily CTA before 5s', () => {
    render(<CrazyGamesWelcome onPlay={onPlay} />);
    fireEvent.click(screen.getByTestId('crazygames-welcome-cta-daily'));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onPlay).toHaveBeenCalledWith('daily');
    // The user-initiated emit should NOT carry { auto: true }
    const playCalls = (trackGrowthEvent as any).mock.calls.filter(
      ([name]: [string]) => name === 'cg_welcome_play'
    );
    expect(playCalls).toHaveLength(1);
    expect(playCalls[0][1]).not.toMatchObject({ auto: true });
  });

  it('cancels auto-route when user clicks practice CTA', () => {
    render(<CrazyGamesWelcome onPlay={onPlay} />);
    fireEvent.click(screen.getByTestId('crazygames-welcome-cta-practice'));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onPlay).toHaveBeenCalledWith('practice');
  });

  it('cancels auto-route on pointer interaction inside modal', () => {
    render(<CrazyGamesWelcome onPlay={onPlay} />);
    const root = screen.getByTestId('crazygames-welcome');
    fireEvent.pointerDown(root);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onPlay).not.toHaveBeenCalled();
  });

  it('fires cg_welcome_dismissed { reason: unmount } if unmounted before CTA', () => {
    const { unmount } = render(<CrazyGamesWelcome onPlay={onPlay} />);
    unmount();

    expect(trackGrowthEvent).toHaveBeenCalledWith(
      'cg_welcome_dismissed',
      expect.objectContaining({ reason: 'unmount' })
    );
  });

  it('does not fire cg_welcome_dismissed if a CTA fired before unmount', () => {
    const { unmount } = render(<CrazyGamesWelcome onPlay={onPlay} />);
    fireEvent.click(screen.getByTestId('crazygames-welcome-cta-daily'));
    unmount();

    const dismissCalls = (trackGrowthEvent as any).mock.calls.filter(
      ([name]: [string]) => name === 'cg_welcome_dismissed'
    );
    expect(dismissCalls).toHaveLength(0);
  });

  it('does not fire cg_welcome_dismissed if auto-route fired before unmount', () => {
    const { unmount } = render(<CrazyGamesWelcome onPlay={onPlay} />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    unmount();

    const dismissCalls = (trackGrowthEvent as any).mock.calls.filter(
      ([name]: [string]) => name === 'cg_welcome_dismissed'
    );
    expect(dismissCalls).toHaveLength(0);
  });

  it('ESC key fires cg_welcome_dismissed { reason: esc } and stops auto-route', () => {
    render(<CrazyGamesWelcome onPlay={onPlay} />);
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(trackGrowthEvent).toHaveBeenCalledWith(
      'cg_welcome_dismissed',
      expect.objectContaining({ reason: 'esc' })
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onPlay).not.toHaveBeenCalled();
  });
});

import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockPathname = vi.fn(() => '/en');
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

const mockUseAuth = vi.fn(() => ({ isAuthenticated: true, isGuest: false }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

import { HomeOnlySeasonGate } from '../HomeOnlySeasonGate';

const Sentinel = () => <div data-testid="children-rendered">CHILDREN</div>;

describe('HomeOnlySeasonGate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPathname.mockReturnValue('/en');
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isGuest: false });
  });

  it('does NOT render children for unauthenticated guests, even on home with interaction', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isGuest: true });
    mockPathname.mockReturnValue('/en');
    const { queryByTestId } = render(
      <HomeOnlySeasonGate>
        <Sentinel />
      </HomeOnlySeasonGate>
    );
    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
      vi.advanceTimersByTime(5000);
    });
    expect(queryByTestId('children-rendered')).toBeNull();
  });

  it('does NOT render children on non-home routes', () => {
    mockPathname.mockReturnValue('/en/multiplayer');
    const { queryByTestId } = render(
      <HomeOnlySeasonGate>
        <Sentinel />
      </HomeOnlySeasonGate>
    );
    expect(queryByTestId('children-rendered')).toBeNull();
  });

  it('renders children on home with locale (e.g. /en)', () => {
    mockPathname.mockReturnValue('/en');
    const { queryByTestId } = render(
      <HomeOnlySeasonGate>
        <Sentinel />
      </HomeOnlySeasonGate>
    );
    // No interaction yet — should still be hidden
    expect(queryByTestId('children-rendered')).toBeNull();

    // Fire interaction
    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
    });
    // Still hidden until suspense delay elapses
    expect(queryByTestId('children-rendered')).toBeNull();

    // Advance suspense delay
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(queryByTestId('children-rendered')).not.toBeNull();
  });

  it('treats /en/ (trailing slash) as home', () => {
    mockPathname.mockReturnValue('/en/');
    const { queryByTestId } = render(
      <HomeOnlySeasonGate>
        <Sentinel />
      </HomeOnlySeasonGate>
    );
    expect(queryByTestId('children-rendered')).toBeNull();
    act(() => {
      window.dispatchEvent(new Event('keydown'));
      vi.advanceTimersByTime(2000);
    });
    expect(queryByTestId('children-rendered')).not.toBeNull();
  });

  it('does not render on root /', () => {
    mockPathname.mockReturnValue('/');
    const { queryByTestId } = render(
      <HomeOnlySeasonGate>
        <Sentinel />
      </HomeOnlySeasonGate>
    );
    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
      vi.advanceTimersByTime(5000);
    });
    expect(queryByTestId('children-rendered')).toBeNull();
  });
});

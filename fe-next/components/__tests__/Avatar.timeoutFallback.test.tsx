/**
 * Avatar slow-load recovery: if AvatarRenderer never commits (stale WebView
 * chunk, hung dynamic import), swap the pulsing placeholder for a letter disc
 * after ~8s.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, cleanup } from '@testing-library/react';
import { hashString } from '@/shared/types/customAvatar';
import Avatar from '../Avatar';

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () =>
    function HungDynamic() {
      return <div className="w-full h-full bg-neo-navy-light animate-pulse" />;
    },
}));

vi.mock('@/components/ui/skeleton', () => ({
  NeoSkeletonAvatar: ({ size, className }: { size: number; className?: string }) => (
    <div data-testid="avatar-skeleton" data-size={size} className={className} role="status" aria-busy="true" />
  ),
}));

describe('Avatar renderer timeout → letter fallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('replaces the pulsing loader with a letter disc after 8 seconds', () => {
    render(<Avatar userId="maya" />);

    expect(screen.queryByTestId('avatar-letter-fallback')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(7999);
    });
    expect(screen.queryByTestId('avatar-letter-fallback')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    const disc = screen.getByTestId('avatar-letter-fallback');
    expect(disc).toHaveTextContent('M');
    expect(String(disc.getAttribute('style'))).toContain(String(hashString('maya') % 360));
  });
});

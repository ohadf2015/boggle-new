import React from 'react';
import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

/**
 * The fourth overlay of the same class, and the worst of them.
 *
 * This one auto-opens on a 500ms timer AND cannot be dismissed — `handleClose`
 * is deliberately a no-op, because the user must save a name to get past it.
 * Landing on a student's round-end recap it would not merely cover the podium,
 * it would trap the child there. It is also the sibling the style picker stands
 * down for (`needsProfileCustomization` is an input to that gate), so hardening
 * only the picker would have handed this one the podium instead.
 *
 * Deferral here is inherently safe: nothing is marked as shown and the open is
 * driven by an auth flag, so the modal simply appears once the zone clears.
 */

const auth = {
  profile: { display_name: 'Noa', username: 'noa', avatar_config: null } as Record<string, unknown> | null,
  needsProfileCustomization: true,
  updateProfile: vi.fn(async () => ({ error: null })),
};
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('next/dynamic', () => ({
  default: () => {
    const Stub = () => <div data-testid="profile-customization" />;
    Stub.displayName = 'ProfileCustomizationModalStub';
    return Stub;
  },
}));

import ProfileCustomizationWrapper from '../ProfileCustomizationWrapper';
import {
  OVERLAY_QUIET_ZONE_GRACE_MS,
  claimOverlayQuietZone,
  resetOverlayQuietZoneForTests,
} from '@/lib/overlayQuietZone';

describe('ProfileCustomizationWrapper — overlay quiet zone', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetOverlayQuietZoneForTests();
  });
  afterEach(() => {
    resetOverlayQuietZoneForTests();
    vi.useRealTimers();
  });

  it('opens on an ordinary page (control)', () => {
    const { queryByTestId } = render(<ProfileCustomizationWrapper />);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(queryByTestId('profile-customization')).toBeInTheDocument();
  });

  it('does not trap a student behind it on a round-end recap', () => {
    const release = claimOverlayQuietZone('classroom-results');
    const { queryByTestId } = render(<ProfileCustomizationWrapper />);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(queryByTestId('profile-customization')).not.toBeInTheDocument();
    release();
  });

  it('opens once the zone clears — deferred, not dropped', () => {
    const release = claimOverlayQuietZone('classroom-results');
    const { queryByTestId } = render(<ProfileCustomizationWrapper />);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(queryByTestId('profile-customization')).not.toBeInTheDocument();

    act(() => {
      release();
      vi.advanceTimersByTime(OVERLAY_QUIET_ZONE_GRACE_MS + 100);
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(queryByTestId('profile-customization')).toBeInTheDocument();
  });
});

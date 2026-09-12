/**
 * The push prompt is the one in this set that can DROP itself rather than
 * defer: `evaluate()` calls `clearFirstWinPromptPending()` — a one-shot flag —
 * before it shows. Gating only the render would consume that flag during a
 * round-end recap and the prompt would never appear at all.
 *
 * So the zone has to be consulted BEFORE evaluation, and evaluation has to be
 * retried when the zone clears. That is what these two cases pin.
 */

import React, { type ReactNode } from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import {
  OVERLAY_QUIET_ZONE_GRACE_MS,
  claimOverlayQuietZone,
  resetOverlayQuietZoneForTests,
} from '@/lib/overlayQuietZone';

vi.mock('framer-motion', () => ({
  m: {
    div: ({
      children,
      initial: _i,
      animate: _a,
      exit: _e,
      transition: _t,
      ...props
    }: { children: ReactNode } & Record<string, unknown>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const mockShouldShow = vi.fn(() => true);
const mockShouldShowFirstWin = vi.fn(() => false);
const mockClearFirstWinPending = vi.fn();
const mockDismiss = vi.fn();
vi.mock('@/utils/pushNotifications', () => ({
  shouldShowPushPrompt: () => mockShouldShow(),
  shouldShowFirstWinPushPrompt: () => mockShouldShowFirstWin(),
  clearFirstWinPromptPending: () => mockClearFirstWinPending(),
  dismissPushPrompt: () => mockDismiss(),
}));
vi.mock('@/utils/pushNotifications/tokenRegistration', () => ({
  registerPushToken: vi.fn(async () => {}),
}));
vi.mock('@/hooks/useConsentDecided', () => ({ useConsentDecided: () => true }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import { PushNotificationPrompt } from '../PushNotificationPrompt';

describe('PushNotificationPrompt — overlay quiet zone', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetOverlayQuietZoneForTests();
    mockShouldShow.mockReturnValue(true);
    mockShouldShowFirstWin.mockReturnValue(false);
    mockClearFirstWinPending.mockClear();
  });
  afterEach(() => {
    resetOverlayQuietZoneForTests();
    vi.useRealTimers();
  });

  it('shows when nothing is being covered (control)', () => {
    render(<PushNotificationPrompt />);
    expect(screen.getByText('notifications.prompt.enable')).toBeInTheDocument();
  });

  it('does not show — and does not burn the first-win one-shot — during a round-end recap', () => {
    mockShouldShowFirstWin.mockReturnValue(true);
    const release = claimOverlayQuietZone('classroom-results');
    render(<PushNotificationPrompt />);

    expect(screen.queryByText('notifications.prompt.enable')).not.toBeInTheDocument();
    expect(mockClearFirstWinPending).not.toHaveBeenCalled();
    release();
  });

  it('evaluates again once the zone clears', () => {
    const release = claimOverlayQuietZone('classroom-results');
    render(<PushNotificationPrompt />);
    expect(screen.queryByText('notifications.prompt.enable')).not.toBeInTheDocument();

    act(() => {
      release();
      vi.advanceTimersByTime(OVERLAY_QUIET_ZONE_GRACE_MS + 100);
    });

    expect(screen.getByText('notifications.prompt.enable')).toBeInTheDocument();
  });
});

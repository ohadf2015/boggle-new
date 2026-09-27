/**
 * HeaderMobileMenu — outside-click vs. nested Radix portal regression guard.
 *
 * Bug (2026-07-06): tapping the Language row's Radix `<Select>` inside the
 * side drawer instantly closed the whole drawer instead of opening the
 * language picker. Root cause: `handleClickOutside` closes the drawer
 * whenever `event.target` is not a DOM descendant of `mobileMenuRef`. Radix
 * Select portals its popup content directly to `document.body` (see
 * components/ui/select.tsx `<SelectPrimitive.Portal>`), so that content is a
 * DOM *sibling* of the drawer, not a descendant — any interaction with it
 * (or any other Radix popover/dropdown/select rendered inside the drawer)
 * is misread as an "outside" click and slams the drawer shut mid-interaction.
 *
 * This test doesn't need a real Radix Select — it reproduces the exact DOM
 * shape (an element carrying Radix's `data-radix-popper-content-wrapper`
 * attribute, appended outside the drawer) and asserts the drawer survives a
 * mousedown on it.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { en } from '../../../translations/en.js';
import HeaderMobileMenu from '../HeaderMobileMenu';

function resolve(dotted: string): unknown {
  return dotted.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[part];
    return undefined;
  }, en as Record<string, unknown>);
}
const t = (key: string, params?: Record<string, string>) => {
  const val = resolve(key);
  if (typeof val !== 'string') return key;
  if (!params) return val;
  return Object.entries(params).reduce((s, [k, v]) => s.replace(`{{${k}}}`, v), val);
};

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t, language: 'en', dir: 'ltr' }),
}));

const mockUseAuth = vi.fn();
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

vi.mock('../../../contexts/PlayerStyleContext', () => ({
  usePlayerStyle: () => ({ style: 'default' }),
}));

vi.mock('@/hooks/useDailyMissions', () => ({
  useDailyMissions: () => ({
    missions: [], completedCount: 0, isGrandSlam: false, grandSlamClaimed: false,
    loading: false, refresh: vi.fn(),
  }),
}));

vi.mock('@/hooks/useEngagementStatus', () => ({ useEngagementStatus: () => ({}) }));
vi.mock('@/hooks/useRealtimeNotifications', () => ({
  useRealtimeNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    dismissNotification: vi.fn(),
    fetchPreviousNotifications: vi.fn(),
    previousNotifications: [],
    isLoadingPrevious: false,
  }),
}));
vi.mock('@/hooks/useCrazyGamesAuth', () => ({ useCrazyGamesAuth: () => ({ isCrazyGames: false }) }));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ isLoading: false }) }));
vi.mock('@/hooks/useFriends', () => ({
  useFriends: () => ({ pendingRequests: [], pendingChallenges: [] }),
}));
vi.mock('@/hooks/useFriendMessages', () => ({ useFriendMessages: () => ({ unreadCount: 0 }) }));

vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({}) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

vi.mock('framer-motion', () => {
  const passthrough = (tag: string) => {
    const Motion = ({ children, ...rest }: Record<string, unknown>) => {
      const clean = { ...rest };
      ['animate', 'initial', 'exit', 'transition', 'variants', 'whileTap', 'whileHover', 'drag', 'layout'].forEach(
        (k) => delete (clean as Record<string, unknown>)[k],
      );
      return React.createElement(tag, clean as Record<string, unknown>, children as React.ReactNode);
    };
    Motion.displayName = `motion.${tag}`;
    return Motion;
  };
  return {
    LazyMotion: ({ children }: { children: React.ReactNode }) => children,
    domAnimation: {},
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    m: new Proxy({}, { get: (_t, tag: string) => passthrough(tag) }),
  };
});

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}));
vi.mock('../../auth/AuthButton', () => ({ default: () => null }));
vi.mock('../../MusicControls', () => ({ default: () => null }));
vi.mock('../../feedback/ReportBugModal', () => ({ ReportBugModal: () => null }));
vi.mock('../../CoinBalance', () => ({ CoinBalance: () => null }));
vi.mock('../../seasons/RankTierChip', () => ({ RankTierChip: () => null }));
vi.mock('@/lib/seasons/scoreTier', () => ({ scoreTier: () => 'bronze' }));
vi.mock('../../gift/GiftNotificationBadge', () => ({ GiftNotificationBadge: () => null }));
vi.mock('../../QuickLanguageSwitcher', () => ({ QuickLanguageSwitcher: () => null }));
vi.mock('../../notifications/NotificationItem', () => ({ NotificationItem: () => null }));
vi.mock('@/components/icons/SocialIcons', () => ({ InstagramIcon: () => null }));
vi.mock('@/components/CookieConsent', () => ({ ManageCookiesButton: () => null }));
vi.mock('@/components/android-install/GetAppMenuRow', () => ({ default: () => null }));
vi.mock('../../Avatar', () => ({ default: () => null }));
vi.mock('../../../utils/profileStorage', () => ({
  getStoredCustomAvatar: () => null,
  getStoredUsername: () => 'Guest',
  setStoredUsername: vi.fn(),
}));
vi.mock('../../../utils/guestManager', () => ({ setGuestName: vi.fn() }));
vi.mock('../../../utils/dailyChallenge/guestPlayer', () => ({ updateGuestDailyPlayer: vi.fn() }));
vi.mock('../../../lib/queryKeys', () => ({ queryKeys: {} }));
vi.mock('../../../lib/header/notificationScroll', () => ({ notificationListScrollClass: '' }));

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  mockUseAuth.mockReturnValue({
    isAuthenticated: false, isAdmin: false, profile: null, user: null, loading: false,
  });
});

async function openMenu() {
  render(
    <HeaderMobileMenu unclaimedCount={0} onOpenGiftModal={vi.fn()} onSignIn={vi.fn()} onSignUp={vi.fn()} />,
  );
  const toggle = await screen.findByLabelText(t('common.openMenu'));
  fireEvent.click(toggle);
  await waitFor(() => {
    expect(screen.getByTestId('mobile-menu-drawer')).toBeTruthy();
  });
}

describe('HeaderMobileMenu — outside-click vs. nested Radix portal', () => {
  it('does not close the drawer when a Radix popper-portaled element (e.g. the language Select dropdown) is clicked', async () => {
    await openMenu();

    // Simulate Radix's own portal output: an element appended to document.body
    // (sibling of the drawer, not a descendant) carrying the attribute Radix
    // stamps on every popper-positioned portal (Select/Dropdown/Popover/etc.)
    const radixPortalNode = document.createElement('div');
    radixPortalNode.setAttribute('data-radix-popper-content-wrapper', '');
    document.body.appendChild(radixPortalNode);

    fireEvent.mouseDown(radixPortalNode);

    expect(screen.getByTestId('mobile-menu-drawer')).toBeTruthy();

    document.body.removeChild(radixPortalNode);
  });

  it('still closes the drawer on a genuine outside click (real regression stays caught)', async () => {
    await openMenu();

    const outsideNode = document.createElement('div');
    document.body.appendChild(outsideNode);

    fireEvent.mouseDown(outsideNode);

    await waitFor(() => {
      expect(screen.queryByTestId('mobile-menu-drawer')).toBeNull();
    });

    document.body.removeChild(outsideNode);
  });
});

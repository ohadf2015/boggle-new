/**
 * HeaderMobileMenu — Daily Missions translation regression guard.
 *
 * Prod bug (2026-06-27): the expanded mobile menu rendered raw keys
 * `dailyMissions.longWord` / `dailyMissions.combo` / `dailyMissions.mpWin`
 * instead of translated quest titles. The menu built a key from the quest
 * CONDITION TYPE (`dailyMissions.${m.type}`) — keys that don't exist in any
 * locale — while the rest of the app (DailyMissionsHub) uses `m.titleKey`
 * (`quests.daily.<id>.title`), which IS fully translated in all 5 locales.
 *
 * This test renders the menu with a real translation dictionary (en) and
 * asserts the mission rows show the translated quest titles, never the raw
 * `dailyMissions.<type>` key.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { en } from '../../../translations/en.js';
import HeaderMobileMenu from '../HeaderMobileMenu';

// Real-dictionary t(): resolves dotted keys against en.js (with {{param}} interp).
function resolve(dotted: string): unknown {
  return dotted.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[part];
    return undefined;
  }, en as Record<string, unknown>);
}
const t = (key: string, params?: Record<string, string>) => {
  const val = resolve(key);
  if (typeof val !== 'string') return key; // unresolved → raw key (the bug's symptom)
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

const mockUseDailyMissions = vi.fn();
vi.mock('@/hooks/useDailyMissions', () => ({
  useDailyMissions: () => mockUseDailyMissions(),
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

// framer-motion: render children, drop motion-only props.
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

// Heavy / irrelevant children → stubs.
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}));
vi.mock('../../auth/AuthButton', () => ({ default: () => null }));
vi.mock('../../MusicControls', () => ({ default: () => null }));
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

// Today's three quests — real titleKeys from the quest pool.
const missions = [
  {
    slot: 0, questId: 'long_word_6', type: 'longWord' as const, family: 'skill' as const,
    target: 6, titleKey: 'quests.daily.long_word_6.title', descKey: 'quests.daily.long_word_6.desc',
    icon: '📏', completed: true, href: '/daily',
  },
  {
    slot: 1, questId: 'combo_4', type: 'combo' as const, family: 'skill' as const,
    target: 4, titleKey: 'quests.daily.combo_4.title', descKey: 'quests.daily.combo_4.desc',
    icon: '🔥', completed: false, href: '/singleplayer',
  },
  {
    slot: 2, questId: 'mp_win', type: 'mpWin' as const, family: 'pvp' as const,
    target: 1, titleKey: 'quests.daily.mp_win.title', descKey: 'quests.daily.mp_win.desc',
    icon: '👑', completed: true, href: '/multiplayer',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  mockUseAuth.mockReturnValue({
    isAuthenticated: true, isAdmin: false, profile: null, user: { id: 'u1' }, loading: false,
  });
  mockUseDailyMissions.mockReturnValue({
    missions, completedCount: 2, isGrandSlam: false, grandSlamClaimed: false,
    loading: false, refresh: vi.fn(),
  });
});

async function openMenu() {
  render(
    <HeaderMobileMenu unclaimedCount={0} onOpenGiftModal={vi.fn()} onSignIn={vi.fn()} onSignUp={vi.fn()} />,
  );
  const toggle = await screen.findByLabelText(t('common.openMenu'));
  fireEvent.click(toggle);
}

describe('HeaderMobileMenu — daily missions translations', () => {
  it('renders translated quest titles, not raw dailyMissions.<type> keys', async () => {
    await openMenu();

    await waitFor(() => {
      expect(screen.getByText(t('quests.daily.long_word_6.title'))).toBeTruthy();
    });
    expect(screen.getByText(t('quests.daily.combo_4.title'))).toBeTruthy();
    expect(screen.getByText(t('quests.daily.mp_win.title'))).toBeTruthy();

    // The buggy dynamic keys must NOT leak into the DOM.
    expect(screen.queryByText('dailyMissions.longWord')).toBeNull();
    expect(screen.queryByText('dailyMissions.combo')).toBeNull();
    expect(screen.queryByText('dailyMissions.mpWin')).toBeNull();
  });
});

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
const cg = { isCrazyGames: false };
vi.mock('@/hooks/useCrazyGamesAuth', () => ({ useCrazyGamesAuth: () => cg }));
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
  default: ({ children, href, onClick }: { children: React.ReactNode; href: string; onClick?: () => void }) =>
    React.createElement('a', { href, onClick }, children),
}));
vi.mock('../../auth/AuthButton', () => ({ default: () => null }));
vi.mock('../../MusicControls', () => ({ default: () => null }));
vi.mock('../../feedback/ReportBugModal', () => ({ ReportBugModal: () => null }));
vi.mock('../../CoinBalance', () => ({ CoinBalance: () => null }));
vi.mock('../../seasons/RankTierChip', () => ({ RankTierChip: () => null }));
vi.mock('../../gift/GiftNotificationBadge', () => ({ GiftNotificationBadge: () => null }));
vi.mock('../../QuickLanguageSwitcher', () => ({
  QuickLanguageSwitcher: ({ compact }: { compact?: boolean }) =>
    React.createElement('div', { 'data-testid': compact ? 'bar-language' : 'drawer-language' }),
}));
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
vi.mock('../../../utils/guestManager', () => ({
  setGuestName: vi.fn(),
  saveGuestNameEverywhere: vi.fn(),
  markGuestNameChosen: vi.fn(),
  ensureGuestDisplayName: () => 'Sly Fox',
}));
vi.mock('../../../utils/dailyChallenge/guestPlayer', () => ({ updateGuestDailyPlayer: vi.fn() }));
vi.mock('../../../lib/queryKeys', () => ({ queryKeys: {} }));
vi.mock('../../../lib/header/notificationScroll', () => ({ notificationListScrollClass: '' }));


function auth(profile: Record<string, unknown> | null) {
  mockUseAuth.mockReturnValue({
    isAuthenticated: !!profile, isAdmin: !!profile?.is_admin, profile, user: null, loading: false,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  cg.isCrazyGames = false;
  auth(null);
});

const renderMenu = () =>
  render(<HeaderMobileMenu unclaimedCount={0} onOpenGiftModal={vi.fn()} onSignIn={vi.fn()} onSignUp={vi.fn()} />);

describe('HeaderMobileMenu — phone bar stays logo · sound · menu', () => {
  it('Given the web, When the bar renders, Then the language pill is not in the bar but lives in the drawer', async () => {
    renderMenu();
    fireEvent.click(await screen.findByLabelText(t('common.openMenu')));
    await waitFor(() => expect(screen.getByTestId('mobile-menu-drawer')).toBeTruthy());
    expect(screen.queryByTestId('bar-language')).toBeNull();
    expect(screen.getByTestId('drawer-language')).toBeTruthy();
  });

  it('Given CrazyGames (no menu), Then the bar keeps the language pill as its only home', async () => {
    cg.isCrazyGames = true;
    renderMenu();
    expect(await screen.findByTestId('bar-language')).toBeTruthy();
    expect(screen.queryByLabelText(t('common.openMenu'))).toBeNull();
  });
});

describe('HeaderMobileMenu — classroom entry in the drawer', () => {
  it.each([
    ['a teacher', { user_role: 'teacher' }, '/en/teacher', 'education.nav.myClassroom'],
    ['an admin', { user_role: 'student', is_admin: true }, '/en/teacher', 'education.nav.myClassroom'],
    ['a player', { user_role: 'student' }, '/en/education', 'education.nav.forTeachers'],
    ['a guest', null, '/en/education', 'education.nav.forTeachers'],
  ])('Given %s, When the drawer opens, Then it links to the right classroom page', async (_who, profile, href, key) => {
    auth(profile);
    renderMenu();
    fireEvent.click(await screen.findByLabelText(t('common.openMenu')));
    const link = (await screen.findByText(t(key))).closest('a');
    expect(link).toHaveAttribute('href', href);
  });
});

describe('HeaderMobileMenu — organized drawer', () => {
  it('Given a player, When the drawer opens, Then the main destinations sit together as tiles at the top', async () => {
    auth({ user_role: 'student' });
    renderMenu();
    fireEvent.click(await screen.findByLabelText(t('common.openMenu')));
    const tiles = await screen.findByTestId('drawer-quick-nav');
    const hrefs = Array.from(tiles.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/en/quests', '/en/friends', '/en/leaderboard', '/en/community']);
  });

  it('Given an admin, Then the drawer admin entry shows on desktop only (phones use the bottom tab)', async () => {
    auth({ user_role: 'student', is_admin: true });
    renderMenu();
    fireEvent.click(await screen.findByLabelText(t('common.openMenu')));
    const admin = await screen.findByTestId('drawer-admin');
    expect(admin.className).toMatch(/(^|\s)hidden(\s|$)/);
    expect(admin.className).toContain('sm:flex');
    expect(admin.querySelector('a')).toHaveAttribute('href', '/en/admin');
  });

  it('Given a player, Then the drawer has no admin entry', async () => {
    auth({ user_role: 'student' });
    renderMenu();
    fireEvent.click(await screen.findByLabelText(t('common.openMenu')));
    await screen.findByTestId('drawer-quick-nav');
    expect(screen.queryByTestId('drawer-admin')).toBeNull();
  });
});

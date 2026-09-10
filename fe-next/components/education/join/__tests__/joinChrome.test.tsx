/**
 * The join screen is the whole screen.
 *
 * `/student/join` has always been free of the global tab bar — it starts with
 * `/student`, which `GlobalBottomNav` already treats as a surface with its own
 * navigation. The two doors students actually arrive through do NOT start with
 * `/student`: `/join` is the address a teacher reads out, `/join/<code>` is
 * where the projector's QR lands. Both were painting QUESTS / FRIENDS / HOME
 * across the bottom of a screen whose only job is six characters and a name.
 *
 * That is recurring pitfall class 3 in miniature — three routes to one screen,
 * one of them behaving differently — and on a 390px phone the tab bar is three
 * ways out of the ten seconds we are trying to win.
 *
 * The control case matters as much as the assertion: these tests mock nine
 * hooks, and a mock that stops the nav rendering at all would make the real
 * assertion pass for the wrong reason.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

let pathname = '/en';

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  // The real context's language always agrees with the locale segment, and the
  // nav strips `/${language}` off the path before matching — a fixed 'en' here
  // would quietly stop the Hebrew case from ever reaching the join check.
  useLanguage: () => {
    const language = pathname.split('/')[1] || 'en';
    return { t: (k: string) => k, language, dir: language === 'he' ? 'rtl' : 'ltr' };
  },
}));

vi.mock('@/contexts/NavigationContext', () => ({
  useNavigation: () => ({ isInGame: false }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null, profile: null }),
}));

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));

vi.mock('@/hooks/useSafeArea', () => ({
  useSafeArea: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('@/hooks/useDailyMissions', () => ({
  useDailyMissions: () => ({ missions: [] }),
}));

vi.mock('@/hooks/useFriends', () => ({
  useFriends: () => ({ pendingRequests: [], pendingChallenges: [], friends: [] }),
}));

vi.mock('@/hooks/useFriendMessages', () => ({
  useFriendMessages: () => ({ unreadCount: 0 }),
}));

import GlobalBottomNav from '@/components/GlobalBottomNav';

const navBar = () => screen.queryByRole('navigation');

describe('global tab bar on the student join routes', () => {
  beforeEach(() => {
    pathname = '/en';
  });

  it('still shows on an ordinary page — the mocks did not just break rendering', () => {
    render(<GlobalBottomNav />);
    expect(navBar()).toBeInTheDocument();
  });

  it('stays out of the way on /join — the address a teacher reads out', () => {
    pathname = '/en/join';
    render(<GlobalBottomNav />);
    expect(navBar()).not.toBeInTheDocument();
  });

  it('stays out of the way on /join/<code> — where the QR lands', () => {
    pathname = '/he/join/AB3K9Z';
    render(<GlobalBottomNav />);
    expect(navBar()).not.toBeInTheDocument();
  });

  it('was already out of the way on /student/join, and still is', () => {
    pathname = '/en/student/join';
    render(<GlobalBottomNav />);
    expect(navBar()).not.toBeInTheDocument();
  });

  it('does not swallow an unrelated route that merely starts with the letters', () => {
    // `/joinable-something` is not a join route. Prefix matching must be on the
    // path SEGMENT, or a future route beginning with "join" silently loses its nav.
    pathname = '/en/joinery';
    render(<GlobalBottomNav />);
    expect(navBar()).toBeInTheDocument();
  });
});

/**
 * The other half of the chrome: the deferred layout widgets.
 *
 * A real 390×844 capture of `/join/AB3K9Z` on 2026-09-11 showed the cookie
 * bottom sheet sitting over the code cells — a student who scanned the QR
 * could not reach the field at all. The same stack also carries an install
 * prompt, a push-permission prompt and `AndroidAppRedirect`, which sends an
 * Android visitor to the Play Store: on this screen that is a student bounced
 * out of the lesson by a link their teacher just read aloud.
 *
 * Kahoot's PIN page shows a PIN box and nothing else. So does this one now.
 * The consent ask is DEFERRED, not skipped — non-essential scripts stay gated
 * on a decision that has not been made, and the sheet mounts on the very next
 * screen (`/multiplayer`), which is the same layout with a different path.
 */
vi.mock('@/components/CookieConsent', () => ({
  default: () => <div data-testid="cookie-consent" />,
}));
vi.mock('@/components/AndroidAppRedirect', () => ({
  default: () => <div data-testid="android-redirect" />,
}));
vi.mock('@/components/PWAInstallPrompt', () => ({
  default: () => <div data-testid="pwa-prompt" />,
}));
vi.mock('@/components/notifications/PushNotificationPrompt', () => ({
  default: () => <div data-testid="push-prompt" />,
}));
vi.mock('@/components/AndroidAppInstallPromo', () => ({
  default: () => <div data-testid="android-promo" />,
}));
vi.mock('@/components/android-install/AndroidInstallPill', () => ({
  default: () => <div data-testid="android-pill" />,
}));
vi.mock('@/components/celebration/NewYearCountdown', () => ({
  default: () => <div data-testid="new-year" />,
}));
vi.mock('@/components/VersionChecker', () => ({
  default: () => <div data-testid="version-checker" />,
}));
vi.mock('@/components/engagement/ChurnSignalTracker', () => ({
  ChurnSignalTracker: () => <div data-testid="churn-tracker" />,
}));
vi.mock('@/components/referral/ReferralCodeClaimer', () => ({
  default: () => <div data-testid="referral-claimer" />,
}));

import DeferredLayoutWidgets from '@/components/DeferredLayoutWidgets';

/** Every widget that PAINTS or NAVIGATES — the ones a student would meet. */
const INTERRUPTERS = [
  'cookie-consent',
  'android-redirect',
  'pwa-prompt',
  'push-prompt',
  'android-promo',
  'android-pill',
  'new-year',
];

describe('deferred layout widgets on the student join routes', () => {
  beforeEach(() => {
    pathname = '/en';
  });

  it('still mounts everywhere else — the mocks did not just break rendering', async () => {
    render(<DeferredLayoutWidgets />);
    for (const id of INTERRUPTERS) {
      expect(await screen.findByTestId(id)).toBeInTheDocument();
    }
  });

  it('mounts nothing that can cover the code field on /join/<code>', async () => {
    pathname = '/he/join/AB3K9Z';
    render(<DeferredLayoutWidgets />);
    // Wait for the silent ones so a null result cannot just mean "not loaded yet".
    expect(await screen.findByTestId('version-checker')).toBeInTheDocument();
    for (const id of INTERRUPTERS) {
      expect(screen.queryByTestId(id)).not.toBeInTheDocument();
    }
  });

  it('stays quiet on /join and /student/join too', async () => {
    for (const p of ['/en/join', '/en/student/join']) {
      pathname = p;
      const view = render(<DeferredLayoutWidgets />);
      expect(await screen.findByTestId('version-checker')).toBeInTheDocument();
      expect(screen.queryByTestId('cookie-consent')).not.toBeInTheDocument();
      view.unmount();
    }
  });

  it('asks for cookie consent on the very next screen — deferred, not skipped', async () => {
    // The whole defence of this change. A joined student lands on
    // `/multiplayer?room=…`: same layout, different path, sheet back.
    pathname = '/en/multiplayer';
    render(<DeferredLayoutWidgets />);
    expect(await screen.findByTestId('cookie-consent')).toBeInTheDocument();
  });

  it('keeps the silent, non-painting widgets running — this is not a blackout', async () => {
    pathname = '/en/join/AB3K9Z';
    render(<DeferredLayoutWidgets />);
    // Version checks, churn telemetry and referral attribution have no UI and
    // no reason to stop; suppressing them would be a bigger change than the
    // problem, and referral attribution is money.
    expect(await screen.findByTestId('version-checker')).toBeInTheDocument();
    expect(await screen.findByTestId('churn-tracker')).toBeInTheDocument();
    expect(await screen.findByTestId('referral-claimer')).toBeInTheDocument();
  });
});

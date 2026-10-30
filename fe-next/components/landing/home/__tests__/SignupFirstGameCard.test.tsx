import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACCOUNT_FIRST_GAME_PENDING_KEY,
  FRESH_SIGNUP_KEY,
} from '@/lib/retention/signupFirstGame';

const flag = vi.hoisted(() => ({
  value: null as string | null,
  calls: [] as Array<{ key: string; enabled: boolean }>,
}));

vi.mock('@/hooks/useGrowthRadarFlag', () => ({
  useGrowthRadarFlag: (key: string, enabled = true) => {
    flag.calls.push({ key, enabled });
    return enabled ? flag.value : null;
  },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback?: string, params?: Record<string, string>) => {
      const template = fallback || key;
      if (!params) return template;
      return template.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? `{${name}}`);
    },
    language: 'he',
    dir: 'rtl',
  }),
}));

const nav = vi.hoisted(() => ({ pathname: '/he' as string | null }));

vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
}));

const auth = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string; is_anonymous?: boolean } | null,
  profile: { display_name: 'Maya Cohen', username: 'maya', user_role: 'student' as string | undefined },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: auth.user, profile: auth.profile }),
}));

const roomInvite = vi.hoisted(() => ({ pending: null as object | null }));

vi.mock('@/utils/onboardingStorage', () => ({
  getPendingRoomInvite: () => roomInvite.pending,
}));

import { SignupFirstGameCard, SignupFirstGameGlobalCard } from '../SignupFirstGameCard';

function arm(surface = 'header_or_menu') {
  sessionStorage.setItem(FRESH_SIGNUP_KEY, JSON.stringify({ userId: 'u1', surface }));
  localStorage.setItem(
    ACCOUNT_FIRST_GAME_PENDING_KEY,
    JSON.stringify({ userId: 'u1', surface }),
  );
}

describe('SignupFirstGameCard', () => {
  beforeEach(() => {
    flag.value = null;
    flag.calls = [];
    sessionStorage.clear();
    localStorage.clear();
    nav.pathname = '/he';
    roomInvite.pending = null;
    auth.user = { id: 'u1' };
    auth.profile = { display_name: 'Maya Cohen', username: 'maya', user_role: 'student' };
  });

  it('does not read the flag and renders nothing when there is no fresh-signup mark', () => {
    const { container } = render(<SignupFirstGameCard />);
    expect(container).toBeEmptyDOMElement();
    expect(flag.calls.every((call) => call.enabled === false)).toBe(true);
  });

  it('keeps today\'s home on control — but the exposure IS logged', () => {
    arm();
    flag.value = 'control';
    const { container } = render(<SignupFirstGameCard />);
    expect(container).toBeEmptyDOMElement();
    expect(flag.calls.some((call) => call.enabled && call.key === 'signup-first-game')).toBe(true);
  });

  it('one tap goes to quick play, the second to today\'s wheel, with the first name', () => {
    arm();
    flag.value = 'play';
    render(<SignupFirstGameCard />);
    const card = screen.getByTestId('signup-first-game');
    expect(card).toHaveAttribute('dir', 'rtl');
    const quick = screen.getByTestId('signup-first-game-quick');
    expect(quick).toHaveAttribute('href', '/he/multiplayer?quickPlay=true');
    expect(quick).toHaveTextContent('Play your first game, Maya');
    expect(screen.getByTestId('signup-first-game-daily')).toHaveAttribute(
      'href',
      '/he/daily/word-wheel?start=1',
    );
    fireEvent.click(quick);
    expect(quick.tagName).toBe('A');
  });

  it('exposes a Google ID-token signup that never left the Swedish SEO landing', () => {
    // signInWithIdToken resolves in-page: no /auth/callback, no redirect, no
    // home landing. The old callback marker could never arm this user.
    nav.pathname = '/sv/swedish-multiplayer-word-game';
    arm();
    flag.value = 'play';
    render(<SignupFirstGameGlobalCard />);
    expect(flag.calls.some((call) => call.enabled && call.key === 'signup-first-game')).toBe(true);
    const card = screen.getByTestId('signup-first-game');
    expect(card).toHaveAttribute('data-placement', 'floating');
    expect(screen.getByTestId('signup-first-game-quick')).toHaveAttribute(
      'href',
      '/he/multiplayer?quickPlay=true',
    );
  });

  it('exposes a Discord redirect signup whose next was the page they were on', () => {
    // appendNextParam always sets next=<current page>, so the callback's
    // isDefault branch (the old eligibility) never ran for them either.
    nav.pathname = '/en/play-boggle-online-free';
    arm();
    flag.value = 'play';
    render(<SignupFirstGameGlobalCard />);
    expect(flag.calls.some((call) => call.enabled && call.key === 'signup-first-game')).toBe(true);
    expect(screen.getByTestId('signup-first-game')).toBeTruthy();
  });

  it('does not expose on an active game route, even fully armed', () => {
    nav.pathname = '/he/multiplayer';
    arm();
    flag.value = 'play';
    const { container } = render(<SignupFirstGameGlobalCard />);
    expect(container).toBeEmptyDOMElement();
    expect(flag.calls.filter((call) => call.enabled)).toHaveLength(0);
  });

  it('the floating card stays off home, where the inline slot already runs', () => {
    nav.pathname = '/he';
    arm();
    flag.value = 'play';
    const { container } = render(<SignupFirstGameGlobalCard />);
    expect(container).toBeEmptyDOMElement();
    expect(flag.calls.filter((call) => call.enabled)).toHaveLength(0);
  });

  it('does not expose teachers, game-context signups, or a first-win with a pending room', () => {
    arm('results_inline');
    flag.value = 'play';
    const { container, rerender } = render(<SignupFirstGameCard />);
    expect(container).toBeEmptyDOMElement();

    sessionStorage.clear();
    localStorage.clear();
    arm('header_or_menu');
    auth.profile = { ...auth.profile, user_role: 'teacher' };
    rerender(<SignupFirstGameCard />);
    expect(screen.queryByTestId('signup-first-game')).toBeNull();
    expect(flag.calls.filter((call) => call.enabled)).toHaveLength(0);
  });

  it('does not expose anonymous sessions even if a stale mark exists', () => {
    arm();
    auth.user = { id: 'u1', is_anonymous: true };
    flag.value = 'play';
    const { container } = render(<SignupFirstGameCard />);
    expect(container).toBeEmptyDOMElement();
    expect(flag.calls.filter((call) => call.enabled)).toHaveLength(0);
  });

  it('does not expose when a room invite is waiting', () => {
    arm('first_win_sheet');
    roomInvite.pending = { roomCode: 'ABC123' };
    flag.value = 'play';
    const { container } = render(<SignupFirstGameCard />);
    expect(container).toBeEmptyDOMElement();
    expect(flag.calls.filter((call) => call.enabled)).toHaveLength(0);
  });
});

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  __resetRevealSessionForTests,
  buildUnlockReveal,
  hasUnseenUnlock,
  markRevealShown,
} from '@/lib/avatar/revealTrigger';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, a?: unknown) => (a && typeof a === 'object' ? `${key}:${JSON.stringify(a)}` : key),
    language: 'he',
    dir: 'rtl',
  }),
}));
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock('@/components/AvatarLite', () => ({
  __esModule: true,
  default: ({ userId }: { userId?: string }) => <span data-testid="avatar-lite" data-user={userId} />,
}));
const cg = vi.hoisted(() => ({ value: { isOnCrazyGamesPlatform: false, isLoading: false } }));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => cg.value }));
const auth = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.value }));

import HeaderProfileEntry from '../HeaderProfileEntry';

beforeEach(() => {
  __resetRevealSessionForTests();
  cg.value = { isOnCrazyGamesPlatform: false, isLoading: false };
  auth.value = {
    isAuthenticated: true,
    loading: false,
    user: { id: 'u-1' },
    profile: { id: 'u-1', current_level: 7, avatar_config: { bgColor: '#123456' } },
  };
});

describe('HeaderProfileEntry', () => {
  it('authed players get their avatar as a link to their profile, with level', () => {
    render(<HeaderProfileEntry />);
    const link = screen.getByTestId('header-profile-entry');
    expect(link).toHaveAttribute('href', '/he/profile?from=header');
    expect(link).toHaveAttribute('aria-label', expect.stringContaining('revealUnlock.profileEntry'));
    expect(screen.getByTestId('avatar-lite')).toHaveAttribute('data-user', 'u-1');
    expect(screen.getByTestId('header-profile-level')).toHaveTextContent('7');
  });

  it('renders nothing for guests or while auth resolves', () => {
    auth.value = { ...auth.value, isAuthenticated: false };
    const { container, rerender } = render(<HeaderProfileEntry />);
    expect(container).toBeEmptyDOMElement();
    auth.value = { ...auth.value, isAuthenticated: true, loading: true };
    rerender(<HeaderProfileEntry />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing on CrazyGames (profile navigates off-mode) or while its SDK resolves', () => {
    cg.value = { isOnCrazyGamesPlatform: true, isLoading: false };
    const { container, rerender } = render(<HeaderProfileEntry />);
    expect(container).toBeEmptyDOMElement();
    cg.value = { isOnCrazyGamesPlatform: false, isLoading: true };
    rerender(<HeaderProfileEntry />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a "new" dot after an unlock reveal and clears it on tap', () => {
    render(<HeaderProfileEntry />);
    expect(screen.queryByTestId('header-profile-new')).not.toBeInTheDocument();
    act(() => { markRevealShown(buildUnlockReveal({ oldLevel: 1, newLevel: 2 })!); });
    expect(screen.getByTestId('header-profile-new')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('header-profile-entry'));
    expect(hasUnseenUnlock()).toBe(false);
    expect(screen.queryByTestId('header-profile-new')).not.toBeInTheDocument();
  });
});

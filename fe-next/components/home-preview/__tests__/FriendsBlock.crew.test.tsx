import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const h = vi.hoisted(() => ({ auth: { user: null as unknown, loading: false }, session: false }));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => h.auth }));
vi.mock('@/utils/onboardingStorage', () => ({ hasSupabaseSession: () => h.session }));
vi.mock('next/dynamic', () => ({
  default: () =>
    function CrewStub() {
      return <div data-testid="crew-card" />;
    },
}));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

import { FriendsBlock } from '../FriendsBlock';

const t = (k: string) => k;

describe('FriendsBlock', () => {
  beforeEach(() => {
    h.auth = { user: null, loading: false };
    h.session = false;
  });

  it('Given a guest, Then the demo room shows', () => {
    render(<FriendsBlock lang="en" t={t} showAvatars />);
    expect(screen.getByTestId('hp-friends')).toBeTruthy();
    expect(screen.queryByTestId('crew-card')).toBeNull();
  });

  it('Given a signed-in player, Then the real crew card replaces the demo', () => {
    h.auth = { user: { id: 'me' }, loading: false };
    render(<FriendsBlock lang="en" t={t} showAvatars />);
    expect(screen.getByTestId('crew-card')).toBeTruthy();
    expect(screen.queryByTestId('hp-friends')).toBeNull();
  });

  it('Given a saved session still restoring, Then the crew card (with its skeleton), never the fake room', () => {
    h.auth = { user: null, loading: true };
    h.session = true;
    render(<FriendsBlock lang="en" t={t} showAvatars />);
    expect(screen.getByTestId('crew-card')).toBeTruthy();
  });
});

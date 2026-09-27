import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';
import { buildUnlockReveal, __resetRevealSessionForTests, hasUnseenUnlock } from '@/lib/avatar/revealTrigger';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/components/avatar/AvatarRenderer', () => ({ __esModule: true, default: () => <div data-testid="avatar-renderer" /> }));

const auth = vi.hoisted(() => ({
  value: {} as Record<string, unknown>,
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.value }));

const tel = vi.hoisted(() => ({ revealed: vi.fn(), saved: vi.fn() }));
vi.mock('@/lib/avatar/avatarTelemetry', () => ({
  trackAvatarUnlockRevealed: tel.revealed,
  trackAvatarSaved: tel.saved,
}));

const authModal = vi.hoisted(() => ({ props: null as null | Record<string, unknown> }));
vi.mock('@/components/auth/AuthModal', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    authModal.props = props;
    return props.isOpen ? <div data-testid="auth-modal" /> : null;
  },
}));
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => (props: Record<string, unknown>) => {
    authModal.props = props;
    return props.isOpen ? <div data-testid="auth-modal" /> : null;
  },
}));

const share = vi.hoisted(() => ({ fn: vi.fn(async (_o: unknown) => 'shared' as string) }));
vi.mock('@/utils/shareWithFallback', () => ({ shareWithFallback: share.fn }));

import ConnectedUnlockReveal from '../ConnectedUnlockReveal';

const reveal = () => buildUnlockReveal({ oldLevel: 1, newLevel: 2 })!; // headphones

function authed(over: Record<string, unknown> = {}) {
  auth.value = {
    isAuthenticated: true,
    loading: false,
    profile: { id: 'u1', current_level: 2, avatar_config: { ...DEFAULT_AVATAR_CONFIG, hair: 'short' } },
    updateProfile: vi.fn(async () => ({ data: {}, error: null })),
    refreshProfile: vi.fn(async () => {}),
    ...over,
  };
}

beforeEach(() => {
  __resetRevealSessionForTests();
  tel.revealed.mockReset();
  tel.saved.mockReset();
  authModal.props = null;
});

describe('ConnectedUnlockReveal', () => {
  it('tracks the reveal once and flags the header entry', () => {
    authed();
    const r = reveal();
    const { unmount } = render(<ConnectedUnlockReveal reveal={r} onClose={() => {}} />);
    expect(tel.revealed).toHaveBeenCalledTimes(1);
    expect(tel.revealed).toHaveBeenCalledWith(r.unlocks, 2);
    expect(hasUnseenUnlock()).toBe(true);
    unmount();
    render(<ConnectedUnlockReveal reveal={r} onClose={() => {}} />);
    expect(tel.revealed).toHaveBeenCalledTimes(1);
  });

  it('Share links the player\'s public profile (from=share), not a private page', async () => {
    authed({ profile: { id: 'u1', username: 'ada_l', current_level: 2, avatar_config: DEFAULT_AVATAR_CONFIG } });
    share.fn.mockClear();
    render(<ConnectedUnlockReveal reveal={reveal()} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'revealUnlock.share' }));
    await waitFor(() => expect(share.fn).toHaveBeenCalledTimes(1));
    const arg = share.fn.mock.calls[0][0] as { url: string };
    expect(arg.url).toBe(`${window.location.origin}/en/u/ada_l?from=share`);
  });

  it('a replay (chip) never re-fires telemetry', () => {
    authed();
    render(<ConnectedUnlockReveal reveal={reveal()} onClose={() => {}} replay />);
    expect(tel.revealed).not.toHaveBeenCalled();
  });

  it('Equip now saves the player avatar wearing the part via updateProfile', async () => {
    authed();
    const onClose = vi.fn();
    render(<ConnectedUnlockReveal reveal={reveal()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'revealUnlock.equip' }));
    const update = auth.value.updateProfile as ReturnType<typeof vi.fn>;
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    const saved = (update.mock.calls[0] as unknown as [{ avatar_config: Record<string, unknown> }])[0].avatar_config;
    expect(saved.accessory).toBe('headphones');
    expect(saved.hair).toBe('short'); // keeps the rest of their look
    await waitFor(() => expect(tel.saved).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onClose).toHaveBeenCalled(), { timeout: 2000 });
  });

  it('shows the error state when the save fails', async () => {
    authed({ updateProfile: vi.fn(async () => ({ data: null, error: { message: 'nope' } })) });
    render(<ConnectedUnlockReveal reveal={reveal()} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'revealUnlock.equip' }));
    expect(await screen.findByText('revealUnlock.equipError')).toBeInTheDocument();
  });

  it('guests get sign-up: the reveal closes and the signup modal opens', () => {
    auth.value = { isAuthenticated: false, loading: false, profile: null, updateProfile: vi.fn(), refreshProfile: vi.fn() };
    const onClose = vi.fn();
    render(<ConnectedUnlockReveal reveal={reveal()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'revealUnlock.guestTitle' }));
    expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
    expect(authModal.props?.initialMode).toBe('signup');
    expect(screen.queryByTestId('unlock-reveal')).not.toBeInTheDocument();
  });

  it('while auth is still resolving it shows Equip (pessimistic), not the guest tease', () => {
    auth.value = { isAuthenticated: false, loading: true, profile: null, updateProfile: vi.fn(), refreshProfile: vi.fn() };
    render(<ConnectedUnlockReveal reveal={reveal()} onClose={() => {}} />);
    expect(screen.queryByRole('button', { name: 'revealUnlock.guestTitle' })).not.toBeInTheDocument();
  });
});

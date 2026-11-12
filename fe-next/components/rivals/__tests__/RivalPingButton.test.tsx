import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}|${Object.values(params).join(',')}` : key;
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t, language: 'en' }) }));
const auth = vi.hoisted(() => ({ value: { user: { id: 'me' }, loading: false, isAuthenticated: true } as Record<string, unknown> }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.value }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));
vi.mock('@/lib/rivals/pingClient', async (orig) => ({
  ...(await orig<typeof import('@/lib/rivals/pingClient')>()),
  sendRivalPing: vi.fn(),
  reportRival: vi.fn(async () => true),
}));
vi.mock('@/utils/friends', () => ({ blockUser: vi.fn(async () => ({ success: true })) }));
vi.mock('next/dynamic', () => ({ default: () => (p: { isOpen: boolean }) => (p.isOpen ? <div data-testid="auth-modal" /> : null) }));

import { RivalPingButton } from '../RivalPingButton';
import { sendRivalPing, reportRival } from '@/lib/rivals/pingClient';
import { blockUser } from '@/utils/friends';
import posthog from '@/lib/analytics/lazyPosthog';
import { RIVAL_PING_IDS } from '@/lib/rivals/pings';

const props = { targetUserId: 'them', targetName: 'Noam', context: 'daily' as const };
const open = () => fireEvent.click(screen.getByRole('button', { name: 'rivalPings.buttonLabel|Noam' }));

beforeEach(() => {
  vi.clearAllMocks();
  auth.value = { user: { id: 'me' }, loading: false, isAuthenticated: true };
});

describe('RivalPingButton', () => {
  it('opens a grid of every canned ping, each a 44px target', () => {
    render(<RivalPingButton {...props} />);
    open();
    const chips = RIVAL_PING_IDS.map((id) => screen.getByRole('button', { name: new RegExp(`rivalPings.ping.${id}`) }));
    expect(chips).toHaveLength(8);
    for (const chip of chips) expect(chip.className).toContain('min-h-[44px]');
  });

  it('opens the choices on top of the page, outside a card that clips its overflow', () => {
    const { container } = render(
      <div style={{ overflow: 'hidden' }}>
        <RivalPingButton {...props} />
      </div>,
    );
    open();
    const sheet = screen.getByTestId('rival-ping-sheet');
    expect(container.contains(sheet)).toBe(false);
    expect(sheet.parentElement).toBe(document.body);
    expect(sheet.className).toContain('fixed');
  });

  it('closes the choices on a tap outside or Escape without sending', () => {
    render(<RivalPingButton {...props} />);
    open();
    fireEvent.click(screen.getByTestId('rival-ping-sheet'));
    expect(screen.queryByTestId('rival-ping-sheet')).toBeNull();
    open();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('rival-ping-sheet')).toBeNull();
    expect(sendRivalPing).not.toHaveBeenCalled();
  });

  it('shows Sent! straight away, sends the ping and tracks it', async () => {
    let resolve!: (v: unknown) => void;
    vi.mocked(sendRivalPing).mockReturnValue(new Promise((r) => (resolve = r)) as never);
    render(<RivalPingButton {...props} />);
    open();
    fireEvent.click(screen.getByRole('button', { name: /rivalPings.ping.rematch/ }));

    expect(screen.getByText('rivalPings.sent')).toBeTruthy();
    expect(sendRivalPing).toHaveBeenCalledWith('them', 'rematch', 'daily');
    await act(async () => resolve({ ok: true }));
    expect(posthog.capture).toHaveBeenCalledWith('rival_ping_sent', { pingId: 'rematch', context: 'daily' });
    expect(screen.getByText('rivalPings.sent')).toBeTruthy();
  });

  it('rolls back to a disabled button with the reason when the server refuses', async () => {
    vi.mocked(sendRivalPing).mockResolvedValue({ ok: false, code: 'target_cooldown' });
    render(<RivalPingButton {...props} />);
    open();
    fireEvent.click(screen.getByRole('button', { name: /rivalPings.ping.gg/ }));

    await waitFor(() => expect(screen.getByText('rivalPings.error.target_cooldown')).toBeTruthy());
    expect(screen.queryByText('rivalPings.sent')).toBeNull();
    expect((screen.getByRole('button', { name: 'rivalPings.buttonLabel|Noam' }) as HTMLButtonElement).disabled).toBe(true);
    expect(posthog.capture).not.toHaveBeenCalledWith('rival_ping_sent', expect.anything());
  });

  it('nudges a guest to sign up without calling the server', () => {
    auth.value = { user: null, loading: false, isAuthenticated: false };
    render(<RivalPingButton {...props} />);
    open();
    fireEvent.click(screen.getByRole('button', { name: /rivalPings.ping.gg/ }));

    expect(sendRivalPing).not.toHaveBeenCalled();
    expect(screen.getByText('rivalPings.error.sign_in_required')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'rivalPings.signIn' }));
    expect(screen.getByTestId('auth-modal')).toBeTruthy();
  });

  it('blocks from the ... menu and tracks it', async () => {
    render(<RivalPingButton {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'rivalPings.more' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'rivalPings.block|Noam' }));

    await waitFor(() => expect(blockUser).toHaveBeenCalledWith('them'));
    expect(posthog.capture).toHaveBeenCalledWith('rival_ping_blocked', { context: 'daily' });
    await waitFor(() => expect(screen.getByText('rivalPings.error.blocked')).toBeTruthy());
  });

  it('reports from the ... menu', async () => {
    render(<RivalPingButton {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'rivalPings.more' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'rivalPings.report' }));

    await waitFor(() => expect(reportRival).toHaveBeenCalledWith('them'));
    await waitFor(() => expect(screen.getByText('rivalPings.reported')).toBeTruthy());
  });

  it('renders nothing on classroom screens', () => {
    const { container } = render(<RivalPingButton {...props} context="edu" />);
    expect(container.innerHTML).toBe('');
  });
});

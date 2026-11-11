import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}|${Object.values(params).join(',')}` : key;
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t, language: 'he' }) }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));
vi.mock('@/lib/supabaseRealtimeNotifications', () => ({ markNotificationRead: vi.fn(async () => true) }));
vi.mock('@/lib/rivals/pingClient', async (orig) => ({
  ...(await orig<typeof import('@/lib/rivals/pingClient')>()),
  sendRivalPing: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar" /> }));
const nav = vi.hoisted(() => ({ pathname: '/he/daily' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));
const inGame = vi.hoisted(() => ({ value: false }));
vi.mock('@/lib/inGameSurface', () => ({ useInGameSurface: () => inGame.value }));
const pings = vi.hoisted(() => ({ queue: [] as unknown[], dismiss: vi.fn() }));
vi.mock('@/hooks/useIncomingRivalPings', () => ({ useIncomingRivalPings: () => pings }));

import IncomingPingToast from '../IncomingPingToast';
import posthog from '@/lib/analytics/lazyPosthog';
import { markNotificationRead } from '@/lib/supabaseRealtimeNotifications';
import { sendRivalPing } from '@/lib/rivals/pingClient';

const ping = {
  id: 'n1',
  pingId: 'rematch',
  createdAt: '2026-11-11T10:00:00Z',
  sender: { id: 'maya-id', name: 'Maya', avatar: { emoji: null, color: null, image: null, config: null } },
};

beforeEach(() => {
  vi.clearAllMocks();
  pings.queue = [ping];
  nav.pathname = '/he/daily';
  inGame.value = false;
});

describe('IncomingPingToast', () => {
  it('shows who pinged, the canned line, and marks it read once with a viewed event', () => {
    const { rerender } = render(<IncomingPingToast />);
    expect(screen.getByText('rivalPings.toast.title|Maya')).toBeTruthy();
    expect(screen.getByText('rivalPings.ping.rematch')).toBeTruthy();
    expect(screen.getByTestId('avatar')).toBeTruthy();
    rerender(<IncomingPingToast />);
    expect(markNotificationRead).toHaveBeenCalledTimes(1);
    expect(markNotificationRead).toHaveBeenCalledWith('n1');
    expect(posthog.capture).toHaveBeenCalledWith('rival_ping_received_viewed', { pingId: 'rematch' });
  });

  it('holds the ping while a game is on screen and shows it once the round ends', () => {
    inGame.value = true;
    const { rerender } = render(<IncomingPingToast />);
    expect(screen.queryByText('rivalPings.toast.title|Maya')).toBeNull();
    expect(markNotificationRead).not.toHaveBeenCalled();

    inGame.value = false;
    rerender(<IncomingPingToast />);
    expect(screen.getByText('rivalPings.toast.title|Maya')).toBeTruthy();
  });

  it('never shows on classroom pages', () => {
    nav.pathname = '/he/teacher';
    render(<IncomingPingToast />);
    expect(screen.queryByText('rivalPings.toast.title|Maya')).toBeNull();
  });

  it('Play deep-links to the sender profile in my language', () => {
    render(<IncomingPingToast />);
    const play = screen.getByRole('link', { name: 'rivalPings.toast.play' });
    expect(play.getAttribute('href')).toBe('/he/player/maya-id');
  });

  it('Ping back opens the picker and sends a reply to the sender', async () => {
    render(<IncomingPingToast />);
    fireEvent.click(screen.getByRole('button', { name: 'rivalPings.toast.pingBack' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /rivalPings.ping.gg/ }));
    });
    expect(sendRivalPing).toHaveBeenCalledWith('maya-id', 'gg', 'reply');
    expect(posthog.capture).toHaveBeenCalledWith('rival_ping_sent', { pingId: 'gg', context: 'reply' });
    expect(pings.dismiss).toHaveBeenCalledWith('n1');
  });

  it('keeps the toast up with the reason when a ping-back is refused', async () => {
    vi.mocked(sendRivalPing).mockResolvedValueOnce({ ok: false, code: 'daily_limit' });
    render(<IncomingPingToast />);
    fireEvent.click(screen.getByRole('button', { name: 'rivalPings.toast.pingBack' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /rivalPings.ping.gg/ }));
    });
    expect(screen.getByText('rivalPings.error.daily_limit')).toBeTruthy();
    expect(pings.dismiss).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalledWith('rival_ping_sent', expect.anything());
  });

  it('close dismisses it', () => {
    render(<IncomingPingToast />);
    fireEvent.click(screen.getByRole('button', { name: 'rivalPings.toast.close' }));
    expect(pings.dismiss).toHaveBeenCalledWith('n1');
  });

  it('renders nothing with an empty queue', () => {
    pings.queue = [];
    const { container } = render(<IncomingPingToast />);
    expect(container.innerHTML).toBe('');
  });
});

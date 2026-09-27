/**
 * Games-log per-player block button.
 *
 * TDD contract:
 *   RED   → written against the panel with no block affordance (button absent).
 *   GREEN → button renders for any identifiable player and POSTs the right
 *           blockType to /api/admin/blocks.
 *
 * Why this matters: the games log is where an admin actually notices someone
 * playing nonstop, and guests are the common case — they have no profile page,
 * so the blocklist admin screen alone cannot reach them.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameGroupDetailPanel } from '../GameGroupDetailPanel';
import type { GameGroup, GamePlayer } from '@/lib/admin/gameLog/groupGames';

vi.mock('@/hooks/useAdminAuth', () => ({
  useAdminAuth: () => ({
    authToken: 'test-token',
    refreshToken: vi.fn(),
    isLoading: false,
    isRefreshing: false,
    error: null,
  }),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

const mockT = (_key: string, fallback: string) => fallback;

const mockGamePlayer = (overrides?: Partial<GamePlayer>): GamePlayer => ({
  key: 'player1',
  playerId: 'user123',
  guestSessionId: null,
  isGuest: false,
  displayName: 'Alice',
  profile: null,
  isHost: true,
  role: 'host',
  invitedByName: null,
  score: 100,
  wordCount: 5,
  isWinner: null,
  country: 'IL',
  platform: 'web',
  deviceType: 'iPhone',
  os: 'iOS',
  browser: 'Safari',
  userAgent: null,
  acquisition: { kind: 'direct', rawLabel: null, tooltip: '' },
  status: 'completed',
  errorReason: null,
  eventCount: 2,
  firstSeen: '2026-05-30T10:00:00Z',
  ...overrides,
});

const mockGameGroup = (players: GamePlayer[]): GameGroup => ({
  key: 'game1',
  gameCode: 'ABC123',
  isMultiplayer: true,
  isRanked: false,
  modeRaw: 'classic',
  typeBucket: 'multiplayer',
  language: 'en',
  createdAt: '2026-05-30T10:00:00Z',
  endedAt: '2026-05-30T10:05:00Z',
  status: 'completed',
  host: players[0] ?? null,
  hostAcquisition: { kind: 'direct', rawLabel: null, tooltip: '' },
  players,
  playerCount: players.length,
  botCount: null,
  topScore: 100,
  totalWords: 10,
  errorReasons: [],
});

let fetchMock: ReturnType<typeof vi.fn>;
let confirmMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  toastSuccess.mockClear();
  toastError.mockClear();
  fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
  vi.stubGlobal('fetch', fetchMock);
  // jsdom does not implement window.confirm, so it cannot be spied on — stub it.
  confirmMock = vi.fn().mockReturnValue(true);
  vi.stubGlobal('confirm', confirmMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const bodyOf = (call: unknown[]) =>
  JSON.parse((call[1] as { body: string }).body) as Record<string, unknown>;

describe('GameGroupDetailPanel — block from games log', () => {
  it('Given an authed player, When admin clicks Block, Then it posts an auth_user block', async () => {
    const group = mockGameGroup([mockGamePlayer({ playerId: 'user123', guestSessionId: null })]);
    render(<GameGroupDetailPanel group={group} t={mockT} />);

    await userEvent.click(screen.getByTestId('block-player-btn'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/admin/blocks');
    expect((init as { method: string }).method).toBe('POST');
    expect(bodyOf(fetchMock.mock.calls[0])).toMatchObject({
      blockType: 'auth_user',
      value: 'user123',
    });
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
  });

  it('Given a GUEST row, When admin clicks Block, Then it posts a guest_session block', async () => {
    const group = mockGameGroup([
      mockGamePlayer({
        key: 'g1',
        playerId: null,
        guestSessionId: 'guest_1789398143977_k2xvw9z6v',
        isGuest: true,
        displayName: 'Guest User',
      }),
    ]);
    render(<GameGroupDetailPanel group={group} t={mockT} />);

    await userEvent.click(screen.getByTestId('block-player-btn'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(bodyOf(fetchMock.mock.calls[0])).toMatchObject({
      blockType: 'guest_session',
      value: 'guest_1789398143977_k2xvw9z6v',
    });
  });

  it('Given both ids, Then the durable auth_user id wins over the guest session', async () => {
    const group = mockGameGroup([
      mockGamePlayer({ playerId: 'user999', guestSessionId: 'guest_abc', isGuest: false }),
    ]);
    render(<GameGroupDetailPanel group={group} t={mockT} />);

    await userEvent.click(screen.getByTestId('block-player-btn'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(bodyOf(fetchMock.mock.calls[0])).toMatchObject({
      blockType: 'auth_user',
      value: 'user999',
    });
  });

  it('Given the admin cancels the confirm, Then nothing is posted', async () => {
    confirmMock.mockReturnValue(false);
    const group = mockGameGroup([mockGamePlayer()]);
    render(<GameGroupDetailPanel group={group} t={mockT} />);

    await userEvent.click(screen.getByTestId('block-player-btn'));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Given the API fails, Then it surfaces an error toast and does not claim success', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    const group = mockGameGroup([mockGamePlayer()]);
    render(<GameGroupDetailPanel group={group} t={mockT} />);

    await userEvent.click(screen.getByTestId('block-player-btn'));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('Given a player with NO identifier, Then no block button is offered', () => {
    const group = mockGameGroup([
      mockGamePlayer({ key: 'anon', playerId: null, guestSessionId: null, displayName: 'Bot' }),
    ]);
    render(<GameGroupDetailPanel group={group} t={mockT} />);

    expect(screen.queryByTestId('block-player-btn')).not.toBeInTheDocument();
  });
});

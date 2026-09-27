/**
 * Admin game-log avatars must render for GUEST rows.
 *
 * Bug: the collapsed list row (VirtualGamesList) and the expanded per-player
 * rows (GameGroupDetailPanel) seeded the avatar with `playerId ?? undefined`.
 * Every play in analytics_events is a guest (player_id null), so `userId` was
 * always undefined and `customAvatar` null → Avatar's `shouldLoad` gate stayed
 * true → a skeleton spinner rendered forever. The fix falls back to the guest
 * session id (a deterministic seed) like GameRow's PlayerCell already does.
 *
 * Avatar renders `data-testid="header-avatar"` ONLY on the generated/custom
 * path; the loading skeleton (NeoSkeletonAvatar) has no such testid. So the
 * presence of that testid proves the avatar resolved instead of spinning.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { classifyAcquisition } from '../utils/classifyAcquisition';
import type { GameGroup, GamePlayer } from '@/lib/admin/gameLog/groupGames';
import { GameGroupDetailPanel } from '../components/GameGroupDetailPanel';
import { VirtualGamesList } from '../components/VirtualGamesList';

const t = (_k: string, fallback?: string) => fallback ?? _k;

function guestPlayer(over: Partial<GamePlayer> = {}): GamePlayer {
  return {
    key: 'guest_1780164352053_09js4zd6s',
    playerId: null,
    guestSessionId: 'guest_1780164352053_09js4zd6s',
    isGuest: true,
    displayName: 'Guest 09js4z',
    profile: null,
    isHost: true,
    role: null,
    score: 12,
    wordCount: 4,
    isWinner: null,
    country: 'IL',
    platform: null,
    deviceType: 'mobile',
    os: null,
    browser: null,
    userAgent: null,
    acquisition: classifyAcquisition({ is_guest: true }),
    status: 'completed',
    errorReason: null,
    eventCount: 1,
    firstSeen: '2026-05-30T10:00:00.000Z',
    ...over,
  };
}

function guestGroup(over: Partial<GameGroup> = {}): GameGroup {
  const host = over.host ?? guestPlayer();
  return {
    key: 'solo:end',
    gameCode: null,
    isMultiplayer: false,
    isRanked: false,
    modeRaw: 'connections',
    typeBucket: 'connections',
    language: 'he',
    createdAt: '2026-05-30T10:00:00.000Z',
    endedAt: '2026-05-30T10:00:30.000Z',
    status: 'completed',
    host,
    hostAcquisition: host.acquisition,
    players: [host],
    playerCount: 1,
    botCount: null,
    topScore: 12,
    totalWords: 4,
    errorReasons: [],
    ...over,
  };
}

describe('admin game-log avatars — guest rows must not spin forever', () => {
  it('renders a resolved avatar (not a skeleton) for a guest in the expanded detail panel', () => {
    render(<GameGroupDetailPanel group={guestGroup()} t={t} />);
    // Generated avatar present → not the forever-loading skeleton.
    expect(screen.getAllByTestId('header-avatar').length).toBeGreaterThan(0);
  });

  it('renders a resolved host avatar (not a skeleton) for a guest in the collapsed list row', () => {
    render(
      <VirtualGamesList
        gameGroups={[guestGroup()]}
        pagination={null}
        page={1}
        pageSize={50}
        onPageChange={() => {}}
        t={t}
      />,
    );
    expect(screen.getAllByTestId('header-avatar').length).toBeGreaterThan(0);
  });
});

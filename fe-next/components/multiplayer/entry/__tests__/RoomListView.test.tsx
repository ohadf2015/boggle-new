/**
 * The entry body (DESIGN §b.1) composes identity, JOIN BY CODE and OPEN ARENAS
 * on one screen. Replaces the RoomListView.* suites of the old scrolling lobby:
 * list a11y / keyboard / one-join-at-a-time moved with the rows to
 * ArenaList.test, How-to-play moved to the header (EntryHeader.test). The hero
 * art banner, the single max-w-2xl column and the in-list CrazyGames back link
 * are removed by DESIGN §b.1 ("Removed: the hero art banner … the CG back link";
 * "Desktop and TV: two columns").
 */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ActiveRoom } from '@/shared/types/game';

const markGuidanceShown = vi.fn();
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/utils/contextualGuidanceStorage', () => ({ shouldShowGuidance: () => true, markGuidanceShown: () => markGuidanceShown() }));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ isOnCrazyGamesPlatform: true }) }));
vi.mock('@/components/multiplayer/CrazyGamesFriendsStrip', () => ({ __esModule: true, default: () => null }));
vi.mock('../EntryIdentity', () => ({ EntryIdentity: () => <div data-testid="entry-identity" /> }));
const net = { online: true, rttMs: 20 };
vi.mock('@/hooks/useNetworkState', () => ({ useNetworkState: () => net }));
vi.mock('@/utils/posthogEngagement', () => ({ trackMpRoomJoinClicked: vi.fn(), trackMpRoomJoinBlocked: vi.fn() }));

import RoomListView from '../../RoomListView';

const rooms: ActiveRoom[] = [
  { gameCode: 'ABC123', roomName: 'Test Room 1', playerCount: 3, language: 'en', gameState: 'waiting', isRanked: false, createdAt: 1 },
  { gameCode: 'DEF456', roomName: 'Test Room 2', playerCount: 1, language: 'he', gameState: 'in-progress', isRanked: false, createdAt: 2 },
];
const props = {
  activeRooms: rooms, roomsLoading: false, onRefreshRooms: vi.fn(), onRoomClick: vi.fn(), onCreateRoom: vi.fn(),
  onJoinCode: vi.fn(),
};

describe('RoomListView (entry body)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    net.online = true;
  });

  it('puts identity, join-by-code and the arenas on one screen', () => {
    render(<RoomListView {...props} />);
    expect(screen.getByTestId('entry-identity')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(6);
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(2);
  });

  it('a complete code joins through onJoinCode', () => {
    render(<RoomListView {...props} />);
    fireEvent.paste(screen.getAllByRole('textbox')[0], { clipboardData: { getData: () => 'xwuct4' } });
    expect(props.onJoinCode).toHaveBeenCalledWith('XWUCT4');
  });

  it('desktop: two columns, CREATE in the left column', () => {
    render(<RoomListView {...props} />);
    expect(screen.getByTestId('entry-body').className).toMatch(/lg:grid-cols-/);
    const create = screen.getByTestId('entry-create-side');
    expect(create.className).toMatch(/hidden lg:flex/);
    fireEvent.click(create);
    expect(props.onCreateRoom).toHaveBeenCalledTimes(1);
  });

  it('no hero art, no links out of multiplayer (not even on CrazyGames)', () => {
    const { container } = render(<RoomListView {...props} />);
    expect(container.querySelector('img[src*="arena-hub-hero"]')).toBeNull();
    expect(container.querySelector('a[href]')).toBeNull();
  });

  it('never auto-shows a tutorial and writes no guidance flag', () => {
    render(<RoomListView {...props} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(markGuidanceShown).not.toHaveBeenCalled();
  });

  it('offline: the desktop CREATE goes inert like the footer CTAs', () => {
    net.online = false;
    render(<RoomListView {...props} />);
    const create = screen.getByTestId('entry-create-side');
    expect(create).toBeDisabled();
    fireEvent.click(create);
    expect(props.onCreateRoom).not.toHaveBeenCalled();
  });
});

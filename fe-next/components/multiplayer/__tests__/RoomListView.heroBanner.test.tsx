/**
 * @jest-environment jsdom
 *
 * Hero banner image must not clip on desktop. Source art is ~16:9 (1600x893).
 * Prior `lg:aspect-[64/15]` cropped ~58% of vertical, anchored at y=60%,
 * hiding the "ARENA HUB" title and top floating tiles.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import RoomListView from '../RoomListView';
import type { ActiveRoom } from '@/shared/types/game';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, dir: 'ltr', locale: 'en' }),
}));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));
vi.mock('framer-motion', () => {
  const proxy = new Proxy({}, {
    get: (_t, prop) => {
      const C = React.forwardRef(function M(props: Record<string, unknown>, ref: React.Ref<HTMLElement>) {
        const { initial, animate, transition, whileHover, whileTap, ...rest } = props;
        const Tag = prop as unknown as React.ElementType;
        return React.createElement(Tag, { ...rest, ref });
      });
      return C;
    },
  });
  return { m: proxy, AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</> };
});
vi.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({ pullToRefreshHandlers: {}, pullState: { pullDistance: 0, isRefreshing: false } }),
}));
vi.mock('@/components/ui/PullToRefreshIndicator', () => ({ PullToRefreshIndicator: () => null }));
vi.mock('@/components/LandscapeIndicator', () => ({ default: () => null }));
vi.mock('@/components/HowToPlay', () => ({ default: () => null }));
vi.mock('@/components/ui/Loader', () => ({ Loader: () => null }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => null }));
vi.mock('@/utils/contextualGuidanceStorage', () => ({
  shouldShowGuidance: () => false,
  markGuidanceShown: vi.fn(),
}));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: () => null,
  DialogContent: () => null,
  DialogHeader: () => null,
  DialogTitle: () => null,
}));

const rooms: ActiveRoom[] = [];
const props = {
  activeRooms: rooms,
  roomsLoading: false,
  onRefreshRooms: vi.fn(),
  onRoomClick: vi.fn(),
  onCreateRoom: vi.fn(),
  onQuickPlay: vi.fn(),
  isQuickPlayLoading: false,
};

describe('RoomListView hero banner — no clip', () => {
  it('uses object-contain at lg+ so the full art is visible on desktop', () => {
    render(<RoomListView {...props} />);
    const img = screen.getByAltText('multiplayerFlow.roomList.heroAlt');
    expect(img.className).toMatch(/lg:object-contain/);
  });

  it('does not anchor object-position at y=60% (which hid the ARENA HUB title)', () => {
    render(<RoomListView {...props} />);
    const img = screen.getByAltText('multiplayerFlow.roomList.heroAlt');
    expect(img.className).not.toMatch(/object-\[center_60%\]/);
  });

  it('does not apply the extreme 64/15 desktop aspect that over-cropped the source', () => {
    render(<RoomListView {...props} />);
    const img = screen.getByAltText('multiplayerFlow.roomList.heroAlt');
    const frame = img.parentElement as HTMLElement;
    expect(frame.className).not.toMatch(/lg:aspect-\[64\/15\]/);
  });

  it('paints the frame with neo-navy so object-contain letterboxes blend with the art', () => {
    render(<RoomListView {...props} />);
    const img = screen.getByAltText('multiplayerFlow.roomList.heroAlt');
    const frame = img.parentElement as HTMLElement;
    expect(frame.className).toMatch(/bg-neo-navy/);
  });
});

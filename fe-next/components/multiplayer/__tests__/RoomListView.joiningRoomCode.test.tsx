/**
 * @jest-environment jsdom
 *
 * Regression test: `joiningRoomCode` prop must reach the room-card buttons.
 * Root cause of a rage-click signal on /multiplayer — the prop was declared
 * on RoomListViewProps and passed by the parent, but never destructured in
 * the component, so clicking a room while a join was in flight gave zero
 * visual feedback and stayed clickable.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RoomListView from '../RoomListView';
import type { ActiveRoom } from '@/shared/types/game';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr',
    locale: 'en',
  }),
}));

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));

vi.mock('framer-motion', () => {
  const proxy = new Proxy({}, {
    get: (_target, prop) => {
      const Component = React.forwardRef(function MotionMock(props: Record<string, unknown>, ref: React.Ref<HTMLElement>) {
        const { initial, animate, transition, whileHover, whileTap, ...rest } = props;
        const Tag = prop as unknown as React.ElementType;
        return React.createElement(Tag, { ...rest, ref });
      });
      return Component;
    },
  });
  return {
    m: proxy,
    AnimatePresence: function AnimatePresenceMock({ children }: { children: React.ReactNode }) { return <>{children}</>; },
  };
});

vi.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullToRefreshHandlers: {},
    pullState: { pullDistance: 0, isRefreshing: false },
  }),
}));

vi.mock('@/components/ui/PullToRefreshIndicator', () => ({ PullToRefreshIndicator: () => null }));
vi.mock('@/components/LandscapeIndicator', () => ({ default: () => null }));
vi.mock('@/components/HowToPlay', () => ({
  default: function HowToPlayMock({ onClose }: { onClose: () => void }) {
    return <button onClick={onClose}>Close HowToPlay</button>;
  },
}));
vi.mock('@/components/ui/Loader', () => ({ Loader: () => <span data-testid="room-join-spinner">Loading...</span> }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <span>Loading page...</span> }));
vi.mock('@/utils/contextualGuidanceStorage', () => ({
  shouldShowGuidance: () => false,
  markGuidanceShown: vi.fn(),
}));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => (open ? <div role="dialog">{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

const mockRooms: ActiveRoom[] = [
  { gameCode: 'ABC123', roomName: 'Test Room 1', playerCount: 3, language: 'en', gameState: 'waiting', isRanked: false, createdAt: Date.now() },
  { gameCode: 'DEF456', roomName: 'Test Room 2', playerCount: 1, language: 'he', gameState: 'waiting', isRanked: false, createdAt: Date.now() },
];

const defaultProps = {
  activeRooms: mockRooms,
  roomsLoading: false,
  onRefreshRooms: vi.fn(),
  onRoomClick: vi.fn(),
  onCreateRoom: vi.fn(),
  onQuickPlay: vi.fn(),
  isQuickPlayLoading: false,
};

describe('RoomListView joiningRoomCode feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disables the clicked room card and shows a spinner while it is joining', () => {
    render(<RoomListView {...defaultProps} joiningRoomCode="ABC123" />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toBeDisabled();
    expect(items[0]).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('room-join-spinner')).toBeInTheDocument();
  });

  it('disables the other room cards too, so a second card cannot be tapped mid-join', () => {
    render(<RoomListView {...defaultProps} joiningRoomCode="ABC123" />);
    const items = screen.getAllByRole('listitem');
    expect(items[1]).toBeDisabled();
    expect(items[1]).toHaveAttribute('aria-busy', 'false');
  });

  it('does not call onRoomClick for a disabled card even if clicked', () => {
    render(<RoomListView {...defaultProps} joiningRoomCode="ABC123" />);
    const items = screen.getAllByRole('listitem');
    fireEvent.click(items[1]);
    expect(defaultProps.onRoomClick).not.toHaveBeenCalled();
  });

  it('leaves cards enabled and click-through when no join is in flight', () => {
    render(<RoomListView {...defaultProps} joiningRoomCode={null} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).not.toBeDisabled();
    fireEvent.click(items[0]);
    expect(defaultProps.onRoomClick).toHaveBeenCalledWith(mockRooms[0]);
  });
});

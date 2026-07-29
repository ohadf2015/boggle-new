/**
 * @jest-environment jsdom
 *
 * Tests for RoomListView accessibility:
 * - ARIA list pattern for room list
 * - Keyboard navigation
 * - Color contrast (via class checks)
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoomListView from '../RoomListView';
import type { ActiveRoom } from '@/shared/types/game';

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr',
    locale: 'en',
  }),
}));

const cgState = { isOnCrazyGamesPlatform: true };
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => cgState,
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

vi.mock('@/components/ui/PullToRefreshIndicator', () => ({
  PullToRefreshIndicator: () => null,
}));

vi.mock('@/components/LandscapeIndicator', () => ({ default: () => null }));
vi.mock('@/components/HowToPlay', () => ({
  default: function HowToPlayMock({ onClose }: { onClose: () => void }) {
    return <button onClick={onClose}>Close HowToPlay</button>;
  },
}));
vi.mock('@/components/ui/Loader', () => ({
  Loader: () => <span>Loading...</span>,
}));
vi.mock('@/components/ui/PageLoader', () => ({
  PageLoader: () => <span>Loading page...</span>,
}));
vi.mock('@/utils/contextualGuidanceStorage', () => ({
  shouldShowGuidance: () => false,
  markGuidanceShown: vi.fn(),
}));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

const mockRooms: ActiveRoom[] = [
  {
    gameCode: 'ABC123',
    roomName: 'Test Room 1',
    playerCount: 3,
    language: 'en',
    gameState: 'waiting',
    isRanked: false,
    createdAt: Date.now(),
  },
  {
    gameCode: 'DEF456',
    roomName: 'Test Room 2',
    playerCount: 1,
    language: 'he',
    gameState: 'in-progress',
    isRanked: false,
    createdAt: Date.now(),
  },
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

describe('RoomListView accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ARIA list pattern', () => {
    it('should have role="list" on the room list container', () => {
      render(<RoomListView {...defaultProps} />);
      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
    });

    it('should have role="listitem" on each room card', () => {
      render(<RoomListView {...defaultProps} />);
      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(2);
    });

    it('should have aria-label on the list', () => {
      render(<RoomListView {...defaultProps} />);
      const list = screen.getByRole('list');
      expect(list).toHaveAttribute('aria-label', 'multiplayerFlow.roomList.roomsListLabel');
    });
  });

  describe('icon-only buttons have aria-labels', () => {
    it('should have aria-label on the back link when on CrazyGames', () => {
      cgState.isOnCrazyGamesPlatform = true;
      render(<RoomListView {...defaultProps} />);
      const backLink = screen.getByRole('link', { name: 'common.back' });
      expect(backLink).toHaveAttribute('aria-label');
    });

    it('should not render an in-lobby back link off CrazyGames (global Header provides one)', () => {
      cgState.isOnCrazyGamesPlatform = false;
      render(<RoomListView {...defaultProps} />);
      expect(screen.queryByRole('link', { name: 'common.back' })).toBeNull();
      cgState.isOnCrazyGamesPlatform = true;
    });

    it('should have aria-label on the refresh button', () => {
      render(<RoomListView {...defaultProps} />);
      const refreshBtn = screen.getByLabelText('common.refresh');
      expect(refreshBtn).toBeInTheDocument();
    });

    it('should have aria-label on the help button', () => {
      render(<RoomListView {...defaultProps} />);
      const helpBtn = screen.getByLabelText('landing.tutorial');
      expect(helpBtn).toBeInTheDocument();
    });
  });

  describe('room cards are keyboard accessible', () => {
    it('should call onRoomClick when Enter is pressed on a room item', () => {
      render(<RoomListView {...defaultProps} />);
      const items = screen.getAllByRole('listitem');
      fireEvent.keyDown(items[0], { key: 'Enter' });
      expect(defaultProps.onRoomClick).toHaveBeenCalledWith(mockRooms[0]);
    });

    it('should call onRoomClick when Space is pressed on a room item', () => {
      render(<RoomListView {...defaultProps} />);
      const items = screen.getAllByRole('listitem');
      fireEvent.keyDown(items[0], { key: ' ' });
      expect(defaultProps.onRoomClick).toHaveBeenCalledWith(mockRooms[0]);
    });

    it('should navigate between rooms with arrow keys', () => {
      render(<RoomListView {...defaultProps} />);
      const items = screen.getAllByRole('listitem');

      // Focus first item and press ArrowDown
      items[0].focus();
      fireEvent.keyDown(items[0], { key: 'ArrowDown' });
      expect(document.activeElement).toBe(items[1]);
    });
  });

  describe('does not reference maxPlayers on ActiveRoom', () => {
    it('should render without maxPlayers property', () => {
      // ActiveRoom type does not have maxPlayers
      render(<RoomListView {...defaultProps} />);
      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(2);
    });
  });

  describe('responsive desktop width (2026-05-25 single-column refocus)', () => {
    // The prior min-[720px] 2-col split (left CTA rail / right arenas pane)
    // looked broken on wide + medium-short laptops: it forced the content into
    // a 1024px shell with ~205px dead gutters, orphaned the CTAs in a narrow
    // 360px rail above a tall void, and floated the empty-state alone in the
    // right pane. We collapse to one centered max-w-2xl column at all widths.
    it('keeps a single centered column (max-w-2xl) — no 2-col desktop shell', () => {
      const { container } = render(<RoomListView {...defaultProps} />);
      const root = container.querySelector('[dir]');
      expect(root).toHaveClass('max-w-2xl');
      expect(root).not.toHaveClass('min-[720px]:max-w-5xl');
    });

    it('stays single-column flow at all widths (no min-[720px]:grid split)', () => {
      const { container } = render(<RoomListView {...defaultProps} />);
      const list = container.querySelector('[role="list"]');
      expect(list).toBeTruthy();
      // No ancestor may switch to a 2-col grid at the 720px breakpoint.
      let el: HTMLElement | null = list as HTMLElement | null;
      let foundGrid = false;
      while (el) {
        if (/min-\[720px\]:grid\b/.test(el.className) || /min-\[720px\]:grid-cols/.test(el.className)) {
          foundGrid = true;
          break;
        }
        el = el.parentElement;
      }
      expect(foundGrid).toBe(false);
    });
  });
});

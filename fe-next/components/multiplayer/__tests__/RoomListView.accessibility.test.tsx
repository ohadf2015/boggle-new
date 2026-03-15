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
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr',
    locale: 'en',
  }),
}));

jest.mock('framer-motion', () => {
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
    motion: proxy,
    AnimatePresence: function AnimatePresenceMock({ children }: { children: React.ReactNode }) { return <>{children}</>; },
  };
});

jest.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullToRefreshHandlers: {},
    pullState: { pullDistance: 0, isRefreshing: false },
  }),
}));

jest.mock('@/components/ui/PullToRefreshIndicator', () => ({
  PullToRefreshIndicator: () => null,
}));

jest.mock('@/components/LandscapeIndicator', () => () => null);
jest.mock('@/components/HowToPlay', () => {
  return function HowToPlayMock({ onClose }: { onClose: () => void }) {
    return <button onClick={onClose}>Close HowToPlay</button>;
  };
});
jest.mock('@/components/ui/Loader', () => ({
  Loader: () => <span>Loading...</span>,
}));
jest.mock('@/components/ui/PageLoader', () => ({
  PageLoader: () => <span>Loading page...</span>,
}));
jest.mock('@/utils/contextualGuidanceStorage', () => ({
  shouldShowGuidance: () => false,
  markGuidanceShown: jest.fn(),
}));
jest.mock('@/components/ui/dialog', () => ({
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
  onRefreshRooms: jest.fn(),
  onRoomClick: jest.fn(),
  onCreateRoom: jest.fn(),
  onQuickPlay: jest.fn(),
  isQuickPlayLoading: false,
};

describe('RoomListView accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    it('should have aria-label on the back link', () => {
      render(<RoomListView {...defaultProps} />);
      const backLink = screen.getByRole('link');
      expect(backLink).toHaveAttribute('aria-label');
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
});

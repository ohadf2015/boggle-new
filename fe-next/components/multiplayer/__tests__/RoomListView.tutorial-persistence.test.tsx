/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoomListView from '../RoomListView';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { hasPlayedAnyGame, markGameAsPlayed } from '@/utils/playerProgressStorage';

// Mock dependencies
jest.mock('@/utils/playerProgressStorage');
jest.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullToRefreshHandlers: {},
    pullState: { pullDistance: 0, isRefreshing: false },
  }),
}));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
  },
}));
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

const mockHasPlayedAnyGame = hasPlayedAnyGame as jest.MockedFunction<typeof hasPlayedAnyGame>;
const mockMarkGameAsPlayed = markGameAsPlayed as jest.MockedFunction<typeof markGameAsPlayed>;

describe('RoomListView - Tutorial Persistence', () => {
  const mockProps = {
    activeRooms: [],
    roomsLoading: false,
    onRefreshRooms: jest.fn(),
    onRoomClick: jest.fn(),
    onCreateRoom: jest.fn(),
    onQuickPlay: jest.fn(),
    isQuickPlayLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows tutorial modal on first visit when no games played', async () => {
    // GIVEN: User has never played any game
    mockHasPlayedAnyGame.mockReturnValue(false);

    // WHEN: Component mounts
    render(
      <LanguageProvider>
        <RoomListView {...mockProps} />
      </LanguageProvider>
    );

    // THEN: Tutorial modal should be visible
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('does NOT show tutorial modal on return visits', () => {
    // GIVEN: User has played games before
    mockHasPlayedAnyGame.mockReturnValue(true);

    // WHEN: Component mounts
    render(
      <LanguageProvider>
        <RoomListView {...mockProps} />
      </LanguageProvider>
    );

    // THEN: Tutorial modal should NOT be visible
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does NOT show tutorial again after dismissal on same session', async () => {
    const user = userEvent.setup();

    // GIVEN: First-time user
    mockHasPlayedAnyGame.mockReturnValue(false);

    // WHEN: Component mounts and user dismisses tutorial
    const { rerender } = render(
      <LanguageProvider>
        <RoomListView {...mockProps} />
      </LanguageProvider>
    );

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // User closes modal (click outside or close button)
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    // Mark as played (simulating the actual flow)
    mockHasPlayedAnyGame.mockReturnValue(true);

    // WHEN: Component re-mounts (e.g., navigation back)
    rerender(
      <LanguageProvider>
        <RoomListView {...mockProps} />
      </LanguageProvider>
    );

    // THEN: Tutorial should NOT show again
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('allows user to manually open tutorial via help button after dismissal', async () => {
    const user = userEvent.setup();

    // GIVEN: User has already played (tutorial dismissed)
    mockHasPlayedAnyGame.mockReturnValue(true);

    // WHEN: Component mounts
    render(
      <LanguageProvider>
        <RoomListView {...mockProps} />
      </LanguageProvider>
    );

    // Tutorial not shown initially
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // WHEN: User clicks help button
    const helpButton = screen.getByRole('button', { name: /tutorial/i });
    await user.click(helpButton);

    // THEN: Tutorial modal should open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('does NOT show tutorial modal every time component mounts after first dismissal', async () => {
    // GIVEN: User dismissed tutorial
    mockHasPlayedAnyGame.mockReturnValue(true);

    // WHEN: Component mounts first time
    const { unmount } = render(
      <LanguageProvider>
        <RoomListView {...mockProps} />
      </LanguageProvider>
    );

    // First mount - no tutorial
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    unmount();

    // Second mount - no tutorial
    render(
      <LanguageProvider>
        <RoomListView {...mockProps} />
      </LanguageProvider>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

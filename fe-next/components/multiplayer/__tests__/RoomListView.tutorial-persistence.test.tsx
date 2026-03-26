/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoomListView from '../RoomListView';
import { LanguageProvider } from '@/contexts/LanguageContext';
import * as contextualGuidanceStorage from '@/utils/contextualGuidanceStorage';

// Mock dependencies
vi.mock('@/utils/contextualGuidanceStorage');
vi.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullToRefreshHandlers: {},
    pullState: { pullDistance: 0, isRefreshing: false },
  }),
}));
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
  },
}));
vi.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return { default: MockLink };
});

const mockShouldShowGuidance = contextualGuidanceStorage.shouldShowGuidance as vi.MockedFunction<typeof contextualGuidanceStorage.shouldShowGuidance>;
const mockMarkGuidanceShown = contextualGuidanceStorage.markGuidanceShown as vi.MockedFunction<typeof contextualGuidanceStorage.markGuidanceShown>;

describe('RoomListView - Tutorial Persistence', () => {
  const mockProps = {
    activeRooms: [],
    roomsLoading: false,
    onRefreshRooms: vi.fn(),
    onRoomClick: vi.fn(),
    onCreateRoom: vi.fn(),
    onQuickPlay: vi.fn(),
    isQuickPlayLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows welcome card on first visit when tutorial has not been shown', async () => {
    // GIVEN: User has never seen the multiplayer tutorial
    mockShouldShowGuidance.mockReturnValue(true);

    // WHEN: Component mounts
    render(
      <LanguageProvider>
        <RoomListView {...mockProps} />
      </LanguageProvider>
    );

    // THEN: Inline welcome card should be visible (not a blocking dialog)
    await waitFor(() => {
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });

    // AND: Tutorial should be marked as shown
    expect(mockMarkGuidanceShown).toHaveBeenCalledWith('multiplayerTutorialShown');
  });

  it('does NOT show tutorial modal on return visits', () => {
    // GIVEN: User has already seen the multiplayer tutorial
    mockShouldShowGuidance.mockReturnValue(false);

    // WHEN: Component mounts
    render(
      <LanguageProvider>
        <RoomListView {...mockProps} />
      </LanguageProvider>
    );

    // THEN: Tutorial modal should NOT be visible
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // AND: markGuidanceShown should NOT be called
    expect(mockMarkGuidanceShown).not.toHaveBeenCalled();
  });

  it('does NOT show welcome card again after dismissal on same session', async () => {
    const user = userEvent.setup();

    // GIVEN: First-time user
    mockShouldShowGuidance.mockReturnValueOnce(true);

    // WHEN: Component mounts and user dismisses welcome card
    const { rerender } = render(
      <LanguageProvider>
        <RoomListView {...mockProps} />
      </LanguageProvider>
    );

    // Wait for welcome card to appear
    await waitFor(() => {
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });

    // Verify tutorial was marked as shown on mount
    expect(mockMarkGuidanceShown).toHaveBeenCalledWith('multiplayerTutorialShown');

    // User closes the welcome card
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    // Mark as shown (simulating the actual storage update)
    mockShouldShowGuidance.mockReturnValue(false);

    // WHEN: Component re-mounts (e.g., navigation back)
    rerender(
      <LanguageProvider>
        <RoomListView {...mockProps} />
      </LanguageProvider>
    );

    // THEN: Welcome card should NOT show again
    await waitFor(() => {
      expect(screen.queryByText(/welcome/i)).not.toBeInTheDocument();
    });
  });

  it('allows user to manually open tutorial via help button after dismissal', async () => {
    const user = userEvent.setup();

    // GIVEN: User has already seen tutorial (auto-show dismissed)
    mockShouldShowGuidance.mockReturnValue(false);

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
    // GIVEN: User has seen tutorial before
    mockShouldShowGuidance.mockReturnValue(false);

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

    // Verify markGuidanceShown was never called (tutorial already shown)
    expect(mockMarkGuidanceShown).not.toHaveBeenCalled();
  });
});

/**
 * @jest-environment jsdom
 *
 * The auto-showing multiplayer welcome/tutorial card ("Game on. Find your
 * people.") was removed — it cluttered the Arena Hub. The tutorial content is
 * now reachable ONLY on demand via the header help (?) button → HowToPlay
 * dialog. These tests lock that behavior so the card can't silently return.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoomListView from '../RoomListView';
import { LanguageProvider } from '@/contexts/LanguageContext';
import * as contextualGuidanceStorage from '@/utils/contextualGuidanceStorage';

// next/dynamic with ssr:false never resolves in jsdom — mock to resolve eagerly
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: (importFn: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>) => {
    const DynamicComp = (props: Record<string, unknown>) => {
      const [Comp, setComp] = React.useState<React.ComponentType<Record<string, unknown>> | null>(null);
      React.useEffect(() => {
        void importFn().then((mod) => setComp(() => mod.default));
      }, []);
      if (!Comp) return null;
      return React.createElement(Comp, props);
    };
    return DynamicComp;
  },
}));

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

describe('RoomListView - Tutorial (auto-card removed)', () => {
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

  it('does NOT auto-show a welcome/tutorial card, even on a first visit', async () => {
    // GIVEN: storage says this would have been a first visit
    mockShouldShowGuidance.mockReturnValue(true);

    // WHEN: component mounts
    render(
      <LanguageProvider>
        <RoomListView {...mockProps} />
      </LanguageProvider>
    );

    // THEN: no welcome card, and no blocking dialog auto-opens
    expect(screen.queryByText(/welcome/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('no longer writes the multiplayerTutorialShown guidance flag on mount', () => {
    mockShouldShowGuidance.mockReturnValue(true);
    render(
      <LanguageProvider>
        <RoomListView {...mockProps} />
      </LanguageProvider>
    );
    expect(mockMarkGuidanceShown).not.toHaveBeenCalled();
  });

  it('opens the HowToPlay tutorial dialog on demand via the help button', async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <RoomListView {...mockProps} />
      </LanguageProvider>
    );

    // No dialog initially
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // WHEN: user clicks the help (?) button
    const helpButton = screen.getByRole('button', { name: /tutorial/i });
    await user.click(helpButton);

    // THEN: tutorial dialog opens
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});

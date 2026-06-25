/**
 * Test: Multiplayer Lobby Mobile/Desktop Layout Split
 *
 * The lobby was redesigned from tab-based navigation to:
 * - Mobile: single-scroll vertical flow (lg:hidden)
 * - Desktop: two-column DesktopLobbyLayout (hidden lg:block)
 *
 * Requirements:
 * 1. Mobile layout is hidden on desktop (lg:hidden)
 * 2. Desktop layout is hidden on mobile (hidden lg:block)
 * 3. Both HostPreGameView and PlayerWaitingView follow this pattern
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Socket context
vi.mock('@/components/boosts/BoostButton', () => ({ BoostButton: () => null }));
vi.mock('@/components/boosts/BoostPicker', () => ({ BoostPicker: () => null }));

vi.mock('../../utils/SocketContext', () => ({
  useSocket: () => ({
    socket: null,
    isConnected: true,
  }),
  useSocketOptional: () => ({
    socket: null,
    isConnected: true,
  }),
}));

vi.mock('@/hooks/gameState', () => ({ useGameMode: () => 'classic', useHostSelectedGameMode: () => 'random', useGameActions: () => ({ setGameActive: vi.fn(), setGameMode: vi.fn(), setHostSelectedGameMode: vi.fn() }) }));
vi.mock('@/components/ads/RewardedAdGoldButton', () => ({ __esModule: true, default: () => null, RewardedAdGoldButton: () => null }));
vi.mock('@/lib/animation/presets', () => ({ SPRING_PRESETS: { balanced: { type: 'spring', stiffness: 300, damping: 26 } } }));
vi.mock('@/utils/profileStorage', () => ({ getOrCreateStoredCustomAvatar: () => null, setStoredCustomAvatar: vi.fn() }));
vi.mock('@/hooks/useAvatarPremium', () => ({ useAvatarPremium: () => ({ isPremium: false }) }));
vi.mock('@/components/avatar/AvatarBuilderModal', () => ({ __esModule: true, default: () => null }));

// Mock framer-motion
vi.mock('framer-motion', () => {
  const motionObj = {
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>{children}</div>
    ),
    button: ({ children, className, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
      <button className={className} {...props}>{children}</button>
    ),
    span: ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span className={className} {...props}>{children}</span>
    ),
    li: ({ children, className, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
      <li className={className} {...props}>{children}</li>
    ),
  };
  return {
    m: motionObj,
    m: motionObj,
    LazyMotion: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    domAnimation: {},
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useReducedMotion: () => false,
  };
});

// Mock useCrazyGamesInvite
vi.mock('../../hooks/useCrazyGamesInvite', () => ({
  useCrazyGamesInvite: () => ({
    showInviteButton: vi.fn(),
    hideInviteButton: vi.fn(),
    isInviteButtonVisible: false,
  }),
}));

// Mock qrcode.react
vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => <div data-testid="qr-code">QR Code</div>,
}));

// Mock RoomChat component since it requires LanguageProvider
vi.mock('../../components/RoomChat', () => ({
  __esModule: true,
  default: ({ className }: { className?: string }) => (
    <div data-testid="room-chat-mock" className={className}>Mock RoomChat</div>
  ),
}));

// Mock BotControls component since it requires LanguageProvider
vi.mock('../../components/BotControls', () => ({
  __esModule: true,
  default: () => <div data-testid="bot-controls-mock">Mock BotControls</div>,
}));

// Mock TvTutorialOverlay component
vi.mock('../../host/components/tv-broadcast/TvTutorialOverlay', () => ({
  __esModule: true,
  default: () => null,
  isTvTutorialComplete: () => true,
}));

import HostPreGameView from '../../host/components/HostPreGameView';
import PlayerWaitingView from '../../player/components/PlayerWaitingView';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MusicProvider } from '../../contexts/MusicContext';

const mockT = (key: string) => key;


const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('Multiplayer Lobby Mobile/Desktop Layout Split', () => {
  describe('HostPreGameView', () => {
    const defaultHostProps = {
      gameCode: 'ABC123',
      roomLanguage: 'en' as const,
      language: 'en' as const,
      username: 'TestHost',
      t: mockT,
      timerValue: 2,
      setTimerValue: vi.fn(),
      timerDirection: 0,
      setTimerDirection: vi.fn(),
      difficulty: 'MEDIUM' as const,
      setDifficulty: vi.fn(),
      minWordLength: 2,
      setMinWordLength: vi.fn(),
      gameType: 'regular' as const,
      setGameType: vi.fn(),
      tournamentRounds: 3,
      setTournamentRounds: vi.fn(),
      tournamentData: null,
      hostPlaying: true,
      setHostPlaying: vi.fn(),
      playersReady: [{ username: 'TestHost', isHost: true }],
      playerWordCounts: {},
      shufflingGrid: null,
      highlightedCells: [],
      tableData: [['A', 'B'], ['C', 'D']],
      onStartGame: vi.fn(),
      onExitRoom: vi.fn(),
      onCancelTournament: vi.fn(),
      onRegenerateBoard: vi.fn(),
      tournamentCreating: false,
    };

    it('should have mobile layout hidden on desktop (lg screens)', () => {
      render(<MusicProvider><HostPreGameView {...defaultHostProps} /></MusicProvider>, { wrapper: createWrapper() });

      // The mobile single-scroll container has lg:hidden class
      const desktopLayout = screen.getByTestId('desktop-lobby-layout');
      const mobileContainer = desktopLayout.parentElement?.nextElementSibling;

      // Mobile container uses lg:hidden
      expect(mobileContainer?.className).toContain('min-[720px]:hidden');
    });

    it('should have start button in both desktop and mobile layouts', () => {
      render(<MusicProvider><HostPreGameView {...defaultHostProps} /></MusicProvider>, { wrapper: createWrapper() });

      // StartButton renders t('hostView.startBattle') which returns 'hostView.startBattle' via mockT
      const startButtons = screen.getAllByRole('button', { name: /startBattle/i });

      // Two start buttons: one in desktop layout, one in mobile layout
      expect(startButtons.length).toBe(2);

      // Find the desktop start button (inside hidden min-[720px]:flex container)
      const desktopStartButton = startButtons.find((btn) => {
        let parent = btn.parentElement;
        while (parent) {
          if (parent.className?.includes('min-[720px]:flex')) {
            return true;
          }
          parent = parent.parentElement;
        }
        return false;
      });

      expect(desktopStartButton).toBeTruthy();
    });

    it('should have desktop layout with two-column grid', () => {
      render(<MusicProvider><HostPreGameView {...defaultHostProps} /></MusicProvider>, { wrapper: createWrapper() });

      const desktopLayout = screen.getByTestId('desktop-lobby-layout');

      // DesktopLobbyLayout uses a 12-column grid
      expect(desktopLayout.className).toContain('grid-cols-12');

      // Left column (7/12) and right column (5/12)
      const leftColumn = screen.getByTestId('desktop-left-column');
      const rightColumn = screen.getByTestId('desktop-right-column');
      expect(leftColumn.className).toContain('col-span-7');
      expect(rightColumn.className).toContain('col-span-5');
    });
  });

  describe('PlayerWaitingView', () => {
    const defaultPlayerProps = {
      gameCode: 'ABC123',
      gameLanguage: 'en' as const,
      username: 'TestPlayer',
      t: mockT,
      playersReady: [
        { username: 'TestHost', isHost: true },
        { username: 'TestPlayer', isHost: false },
      ],
      showQR: false,
      setShowQR: vi.fn(),
      showExitConfirm: false,
      setShowExitConfirm: vi.fn(),
      onExitRoom: vi.fn(),
      onConfirmExit: vi.fn(),
    };

    it('should have mobile layout hidden on desktop (lg screens)', () => {
      render(<MusicProvider><PlayerWaitingView {...defaultPlayerProps} /></MusicProvider>, { wrapper: createWrapper() });

      // The mobile single-scroll container has lg:hidden class
      const desktopLayout = screen.getByTestId('desktop-lobby-layout');
      const mobileContainer = desktopLayout.parentElement?.nextElementSibling;

      // Mobile container uses lg:hidden
      expect(mobileContainer?.className).toContain('min-[720px]:hidden');
    });

    it('should have desktop two-column layout with chat', () => {
      render(<MusicProvider><PlayerWaitingView {...defaultPlayerProps} /></MusicProvider>, { wrapper: createWrapper() });

      // Desktop layout renders chat area
      const chatArea = screen.queryByTestId('desktop-chat-area');
      expect(chatArea).toBeInTheDocument();

      // Desktop layout uses grid columns
      const desktopLayout = screen.getByTestId('desktop-lobby-layout');
      expect(desktopLayout.className).toContain('grid-cols-12');
    });
  });
});

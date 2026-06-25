/**
 * Test: Multiplayer Desktop Functionality Access
 *
 * The desktop layout uses a two-column DesktopLobbyLayout:
 * - Left column: Start button (host) or waiting status (player), player roster, settings
 * - Right column: QR/share invite, chat (desktop-chat-area)
 *
 * Requirements:
 * 1. Desktop users must have access to all functionality (players list, chat)
 * 2. Content is shown side-by-side via DesktopLobbyLayout
 * 3. Mobile uses single-scroll layout
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

// Mock framer-motion with all motion element types used by components
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

describe('Multiplayer Desktop Functionality Access', () => {
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

    it('should show chat content on desktop (not hidden behind tabs)', () => {
      render(<MusicProvider><HostPreGameView {...defaultHostProps} /></MusicProvider>, { wrapper: createWrapper() });

      // Desktop two-column layout renders chat in right column with data-testid="desktop-chat-area"
      const desktopChatArea = screen.queryByTestId('desktop-chat-area');
      expect(desktopChatArea).toBeInTheDocument();
    });

    it('should have a visible start game button on desktop', () => {
      render(<MusicProvider><HostPreGameView {...defaultHostProps} /></MusicProvider>, { wrapper: createWrapper() });

      // StartButton renders with text from t('hostView.startBattle')
      // mockT returns the key itself, so button text is 'hostView.startBattle'
      const startButtons = screen.getAllByRole('button', { name: /startBattle/i });

      // Verify at least one start button exists
      expect(startButtons.length).toBeGreaterThanOrEqual(1);

      // Find the desktop start button (one that is NOT inside min-[720px]:hidden container)
      const desktopStartButton = startButtons.find((btn) => {
        let parent = btn.parentElement;
        while (parent) {
          if (parent.className?.includes('min-[720px]:hidden')) {
            return false;
          }
          parent = parent.parentElement;
        }
        return true;
      });

      // There must be at least one button visible on desktop
      expect(desktopStartButton).toBeTruthy();
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

    it('should show chat content on desktop (not hidden behind tabs)', () => {
      render(<MusicProvider><PlayerWaitingView {...defaultPlayerProps} /></MusicProvider>, { wrapper: createWrapper() });

      // Desktop two-column layout renders chat in right column with data-testid="desktop-chat-area"
      const desktopChatArea = screen.queryByTestId('desktop-chat-area');
      expect(desktopChatArea).toBeInTheDocument();
    });

    it('should show both players list and chat simultaneously on desktop', () => {
      render(<MusicProvider><PlayerWaitingView {...defaultPlayerProps} /></MusicProvider>, { wrapper: createWrapper() });

      // Desktop layout uses DesktopLobbyLayout with left/right columns
      // Left column has data-testid="desktop-left-column" (players + waiting status)
      // Right column has data-testid="desktop-chat-area" (chat)
      const playersSection = screen.queryByTestId('desktop-left-column');
      const chatSection = screen.queryByTestId('desktop-chat-area');

      // Both should be present in the DOM for desktop layout
      expect(playersSection).toBeInTheDocument();
      expect(chatSection).toBeInTheDocument();
    });
  });
});

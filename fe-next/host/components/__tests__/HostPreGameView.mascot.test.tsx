import React from 'react';
import { render, screen } from '@testing-library/react';
import HostPreGameView from '../HostPreGameView';

// Mock all heavy dependencies
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>{children}</div>
    ),
    button: ({ children, className, onClick, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
      <button className={className} onClick={onClick} {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/utils/SocketContext', () => ({
  useSocket: () => ({ socket: null }),
}));

jest.mock('@/hooks/gameState', () => ({
  useGameActions: () => ({ setGameMode: jest.fn() }),
}));

jest.mock('../../../components/Avatar', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar">Avatar</div>,
}));

jest.mock('../../../components/RoomChat', () => ({
  __esModule: true,
  default: () => <div data-testid="room-chat">Chat</div>,
}));

jest.mock('../../../components/BotControls', () => ({
  __esModule: true,
  default: () => <div data-testid="bot-controls">BotControls</div>,
}));

jest.mock('../../../hooks/useCrazyGamesInvite', () => ({
  useCrazyGamesInvite: () => ({
    showInviteButton: jest.fn(),
    hideInviteButton: jest.fn(),
    isInviteButtonVisible: false,
  }),
}));

jest.mock('../../../hooks/useNativeShare', () => ({
  useNativeShare: () => ({ tryNativeShare: jest.fn() }),
}));

jest.mock('../../../utils/share', () => ({
  getJoinUrl: jest.fn(),
  copyJoinUrl: jest.fn(),
}));

jest.mock('../pre-game/PresetSelector', () => ({
  GAME_PRESETS: {
    fast: { timer: 1, difficulty: 'EASY', nameKey: 'presets.fast' },
    party: { timer: 2, difficulty: 'MEDIUM', nameKey: 'presets.party' },
    challenge: { timer: 3, difficulty: 'HARD', nameKey: 'presets.challenge' },
  },
}));

jest.mock('../pre-game/StartButton', () => ({
  StartButton: () => <button data-testid="start-button">Start</button>,
}));

jest.mock('../pre-game/MobileShareSection', () => ({
  MobileShareSection: () => <div data-testid="mobile-share">Share</div>,
}));

jest.mock('../pre-game/PresetInfoDrawer', () => ({
  PresetInfoDrawer: () => null,
}));

jest.mock('../pre-game/desktop', () => ({
  DesktopLobbyLayout: ({ leftContent, rightContent }: { leftContent: React.ReactNode; rightContent: React.ReactNode }) => (
    <div data-testid="desktop-layout">{leftContent}{rightContent}</div>
  ),
  InviteCard: () => <div data-testid="invite-card">Invite</div>,
}));

jest.mock('../tv-broadcast/TvTutorialOverlay', () => {
  const component = () => null;
  component.isTvTutorialComplete = () => true;
  return {
    __esModule: true,
    default: component,
    isTvTutorialComplete: () => true,
  };
});

jest.mock('@/components/GameModeSelector', () => ({
  GameModeSelector: () => <div data-testid="game-mode-selector">GameMode</div>,
}));

jest.mock('../../../components/ui/checkbox', () => ({
  Checkbox: () => <input type="checkbox" data-testid="checkbox" />,
}));

// Mock DJMascot — this is what we're testing for
jest.mock('@/components/ui/DJMascot', () => ({
  DJMascotWithEntrance: ({ size }: { size?: string }) => (
    <div data-testid="dj-mascot" data-size={size}>DJ Mascot</div>
  ),
}));

describe('HostPreGameView DJMascot', () => {
  const defaultProps = {
    gameCode: 'TEST',
    roomLanguage: 'en' as const,
    language: 'en' as const,
    username: 'Host',
    t: (key: string) => key,
    timerValue: 2,
    setTimerValue: jest.fn(),
    timerDirection: 0,
    setTimerDirection: jest.fn(),
    difficulty: 'MEDIUM' as const,
    setDifficulty: jest.fn(),
    minWordLength: 2,
    setMinWordLength: jest.fn(),
    gameType: 'regular' as const,
    setGameType: jest.fn(),
    tournamentRounds: 3,
    setTournamentRounds: jest.fn(),
    tournamentData: null,
    hostPlaying: true,
    setHostPlaying: jest.fn(),
    playersReady: [{ username: 'Host', isHost: true }],
    playerWordCounts: {},
    shufflingGrid: null,
    highlightedCells: [],
    tableData: [['A', 'B'], ['C', 'D']],
    onStartGame: jest.fn(),
    onExitRoom: jest.fn(),
    onCancelTournament: jest.fn(),
    tournamentCreating: false,
  };

  // GIVEN the host lobby view
  // WHEN it renders
  // THEN a DJMascot should be visible in the header
  it('should render DJMascot in the lobby header', () => {
    render(<HostPreGameView {...defaultProps} />);

    expect(screen.getByTestId('dj-mascot')).toBeInTheDocument();
  });

  // GIVEN the DJMascot in the header
  // WHEN it renders
  // THEN it should use size 'sm' to not overwhelm the header
  it('should render DJMascot with sm size', () => {
    render(<HostPreGameView {...defaultProps} />);

    const mascot = screen.getByTestId('dj-mascot');
    expect(mascot).toHaveAttribute('data-size', 'sm');
  });
});

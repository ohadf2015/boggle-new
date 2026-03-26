import { vi, type Mock, } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import HostPreGameView from '../HostPreGameView';

// Mock all heavy dependencies
vi.mock('framer-motion', () => ({
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

vi.mock('@/utils/SocketContext', () => ({
  useSocket: () => ({ socket: null }),
}));

vi.mock('@/hooks/gameState', () => ({
  useGameMode: () => 'classic',
  useGameActions: () => ({ setGameMode: vi.fn() }),
}));

vi.mock('../../../components/Avatar', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar">Avatar</div>,
}));

vi.mock('../../../components/RoomChat', () => ({
  __esModule: true,
  default: () => <div data-testid="room-chat">Chat</div>,
}));

vi.mock('../../../components/BotControls', () => ({
  __esModule: true,
  default: () => <div data-testid="bot-controls">BotControls</div>,
}));

vi.mock('../../../hooks/useCrazyGamesInvite', () => ({
  useCrazyGamesInvite: () => ({
    showInviteButton: vi.fn(),
    hideInviteButton: vi.fn(),
    isInviteButtonVisible: false,
  }),
}));

vi.mock('../../../hooks/useNativeShare', () => ({
  useNativeShare: () => ({ tryNativeShare: vi.fn() }),
}));

vi.mock('../../../utils/share', () => ({
  getJoinUrl: vi.fn(),
  copyJoinUrl: vi.fn(),
}));

vi.mock('../pre-game/PresetSelector', () => ({
  GAME_PRESETS: {
    fast: { timer: 1, difficulty: 'EASY', nameKey: 'presets.fast' },
    party: { timer: 2, difficulty: 'MEDIUM', nameKey: 'presets.party' },
    challenge: { timer: 3, difficulty: 'HARD', nameKey: 'presets.challenge' },
  },
}));

vi.mock('../pre-game/StartButton', () => ({
  StartButton: () => <button data-testid="start-button">Start</button>,
}));

vi.mock('../pre-game/MobileShareSection', () => ({
  MobileShareSection: () => <div data-testid="mobile-share">Share</div>,
}));

vi.mock('../pre-game/PresetInfoDrawer', () => ({
  PresetInfoDrawer: () => null,
}));

vi.mock('../pre-game/desktop', () => ({
  DesktopLobbyLayout: ({ leftContent, rightContent }: { leftContent: React.ReactNode; rightContent: React.ReactNode }) => (
    <div data-testid="desktop-layout">{leftContent}{rightContent}</div>
  ),
  InviteCard: () => <div data-testid="invite-card">Invite</div>,
}));

vi.mock('../tv-broadcast/TvTutorialOverlay', () => {
  const component = () => null;
  component.isTvTutorialComplete = () => true;
  return {
    __esModule: true,
    default: component,
    isTvTutorialComplete: () => true,
  };
});

vi.mock('@/components/GameModeSelector', () => ({
  GameModeSelector: () => <div data-testid="game-mode-selector">GameMode</div>,
}));

vi.mock('../../../components/ui/checkbox', () => ({
  Checkbox: () => <input type="checkbox" data-testid="checkbox" />,
}));

// Mock DJMascot — this is what we're testing for
vi.mock('@/components/ui/DJMascot', () => ({
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
    playersReady: [{ username: 'Host', isHost: true }],
    playerWordCounts: {},
    shufflingGrid: null,
    highlightedCells: [],
    tableData: [['A', 'B'], ['C', 'D']],
    onStartGame: vi.fn(),
    onExitRoom: vi.fn(),
    onCancelTournament: vi.fn(),
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

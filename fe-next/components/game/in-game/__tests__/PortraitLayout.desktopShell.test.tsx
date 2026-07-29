'use client';

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PortraitLayout } from '../components/PortraitLayout';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

// Mock AdaptiveMotion
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock GridComponent
vi.mock('@/components/GridComponent', () => ({
  default: () => <div data-testid="grid-component" />,
}));

// Mock game components
vi.mock('../components/GameOverlays', () => ({
  GameOverlays: () => <div data-testid="game-overlays" />,
}));

vi.mock('../components/GameHeader', () => ({
  GameHeader: () => <div data-testid="game-header" />,
}));

vi.mock('../components/WordFormingAreaConnected', () => ({
  WordFormingAreaConnected: () => <div data-testid="word-forming-area" />,
}));

vi.mock('../../ComboDisplay', () => ({
  default: () => <div data-testid="combo-display" />,
}));
vi.mock('../../ComboDisplayConnected', () => ({
  ComboDisplayConnected: () => <div data-testid="combo-display-connected" />,
}));

vi.mock('../../CompactLeaderboard', () => ({
  default: () => <div data-testid="compact-leaderboard" />,
}));

vi.mock('../../FloatingScoreAnimation', () => ({
  default: () => <div data-testid="floating-score" />,
}));

// Mock RoomChat with all its dependencies
vi.mock('../../RoomChat', () => ({
  default: () => <div data-testid="room-chat" />,
}));

vi.mock('../components/GameWordList', () => ({
  GameWordList: () => <div data-testid="game-word-list" />,
}));

vi.mock('../components/GameLeaderboard', () => ({
  GameLeaderboard: () => <div data-testid="game-leaderboard" />,
}));

vi.mock('../components/MobileChatFab', () => ({
  MobileChatFab: () => <div data-testid="mobile-chat-fab" />,
}));

vi.mock('../components/ScoreDisplay', () => ({
  ScoreDisplay: () => <div data-testid="score-display" />,
}));

vi.mock('../../DynamicEnergyBackground', () => ({
  DynamicEnergyBackground: () => <div data-testid="dynamic-bg" />,
}));

vi.mock('../../ComboMilestoneAnnouncement', () => ({
  ComboMilestoneAnnouncement: () => <div data-testid="combo-milestone" />,
}));

vi.mock('../../ScreenFlashOverlay', () => ({
  ScreenFlashOverlay: () => <div data-testid="screen-flash" />,
}));

vi.mock('@/components/keyboard', () => ({
  KeyboardInlineHint: () => <div data-testid="keyboard-hint" />,
}));

vi.mock('@/player/components/in-game/WordsRemaining', () => ({
  WordsRemaining: () => <div data-testid="words-remaining" />,
}));

vi.mock('@/components/LeadChangeBanner', () => ({
  LeadChangeBanner: () => <div data-testid="lead-change-banner" />,
}));

vi.mock('../../BlastMultiplayerOverlay', () => ({
  BlastMultiplayerOverlay: () => <div data-testid="blast-overlay" />,
}));

vi.mock('../../WordHuntTargetArea', () => ({
  WordHuntTargetArea: () => <div data-testid="word-hunt-target" />,
}));

vi.mock('../../WordHuntLifeBar', () => ({
  WordHuntLifeBar: () => <div data-testid="word-hunt-life" />,
}));

vi.mock('../../WordHuntPlayerLives', () => ({
  WordHuntPlayerLives: () => <div data-testid="word-hunt-player-lives" />,
}));

vi.mock('@/contexts/AccessibilityContext', () => ({
  useHapticsEnabled: () => true,
  useShouldReduceMotion: () => false,
  useSuppressTimerUrgency: () => false,
}));

// Mock socket and sound contexts
vi.mock('@/utils/SocketContext', () => ({
  useSocket: () => ({ socket: null }),
}));

vi.mock('@/contexts/SoundContext', () => ({
  useSoundEffects: () => ({ playMessageSound: vi.fn() }),
}));

vi.mock('@/contexts/AnnouncerContext', () => ({
  useAnnouncer: () => ({ announce: vi.fn() }),
}));

vi.mock('@/hooks/useCrazyGamesChatDisabled', () => ({
  useCrazyGamesChatDisabled: () => false,
}));

vi.mock('@/contexts/CrazyGamesContext', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));

vi.mock('@/hooks/gameState/store', () => ({
  useBlastComboSync: () => null,
}));

describe('PortraitLayout desktop-shell timer suppression', () => {
  const baseProps = {
    username: 'testuser',
    gameCode: 'ABC123',
    isHost: false,
    isPlaying: true,
    t: (k: string) => k,
    dir: 'ltr' as const,
    letterGrid: [
      ['A', 'B', 'C', 'D'],
      ['E', 'F', 'G', 'H'],
      ['I', 'J', 'K', 'L'],
      ['M', 'N', 'O', 'P'],
    ],
    remainingTime: 60,
    timerValue: 3,
    gameActive: true,
    showStartAnimation: false,
    gameLanguage: 'en' as const,
    comboLevel: 0,
    lastWordTime: null,
    fireRoundActive: false,
    minWordLength: 2,
    hasAnimated: true,
    earthquakeState: 'idle' as const,
    gameplayFocusMode: false,
    playerScore: 0,
    playerRank: 1,
    leaderboard: [],
    deferredLeaderboard: [],
    foundWords: [],
    currentFeedback: null,
    isTypingMode: false,
    typedWord: '',
    highlightedCells: [],
    lastWordFoundTime: 0,
    onExitRoom: vi.fn(),
    onShowTutorial: vi.fn(),
    onWordSubmit: vi.fn(),
    onWordChange: vi.fn(),
    onSingleTapDetected: vi.fn(),
    fireRoundRemaining: 0,
    isDesktop: true,
    isHelpOpen: false,
    onCloseHelp: vi.fn(),
    tournamentData: null,
    totalBoardWords: null,
    gameStatsRef: { current: null },
    onTimerState: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 0 CircularTimers when inDesktopShell=true', () => {
    render(<PortraitLayout {...baseProps} inDesktopShell={true} />);
    const timers = screen.queryAllByRole('timer');
    expect(timers).toHaveLength(0);
  });

  it('renders ≥1 CircularTimer when inDesktopShell=false (mobile path)', () => {
    render(<PortraitLayout {...baseProps} inDesktopShell={false} />);
    const timers = screen.queryAllByRole('timer');
    expect(timers.length).toBeGreaterThan(0);
  });

  it('defaults to mobile-path behavior (≥1 timer) when prop omitted', () => {
    render(<PortraitLayout {...baseProps} />);
    const timers = screen.queryAllByRole('timer');
    expect(timers.length).toBeGreaterThan(0);
  });
});

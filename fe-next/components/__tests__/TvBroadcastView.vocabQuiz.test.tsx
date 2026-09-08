/**
 * The classroom projector must show the QUIZ, not a letter grid.
 *
 * A classroom teacher runs the room with `hostPlaying = false`, so `HostView`
 * renders `TvBroadcastView` — never `HostInGameView`. The live Vocab Quiz
 * projector (`VocabQuizHostView`) was wired only into `HostInGameView`, the
 * host-IS-PLAYING path, which a teacher never reaches. Recurring pitfall
 * class 3: two routes to the same state, one of them updated.
 *
 * Observed: teacher clicks START BATTLE, the server starts the quiz and every
 * student sees question 1, and the projector sits on "LIVE / CLASSIC / 3:05 /
 * Waiting for the action to begin…" for the whole round. Reproduced live on
 * 2026-09-06 in room MHFHM5 with a real teacher account and a real student.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TvBroadcastView from '@/host/components/TvBroadcastView';
import type { Language } from '@/shared/types/game';

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound: vi.fn(), setVolume: vi.fn(), volume: 0.7 }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: vi.fn(), t: (key: string) => key }),
}));

vi.mock('@/host/hooks/useTvPlayerCombos', () => ({
  useTvPlayerCombos: () => ({ playerCombos: {} }),
}));
vi.mock('@/host/hooks/useTvNotifications', () => ({
  useTvNotifications: () => ({ notifications: [], dismissNotification: vi.fn() }),
}));
vi.mock('@/host/hooks/useTvSounds', () => ({ useTvSounds: () => ({ playSound: vi.fn() }) }));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));
vi.mock('@/host/hooks/useTvFullscreen', () => ({
  useTvFullscreen: () => ({ isFullscreen: false, toggleFullscreen: vi.fn(), isSupported: true }),
}));
vi.mock('@/host/components/tv-broadcast/TvLeaderboard', () => ({
  __esModule: true,
  default: () => <div data-testid="tv-leaderboard-mock">Leaderboard</div>,
}));
vi.mock('@/host/components/tv-broadcast/TvTutorialOverlay', () => ({
  __esModule: true,
  default: () => null,
  isTvTutorialComplete: () => true,
  TvHelpButton: () => <button data-testid="tv-help-button">Help</button>,
}));
vi.mock('@/host/components/tv-broadcast/TvNotificationQueue', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('@/host/components/tv-broadcast/TvGameHeader', () => ({
  __esModule: true,
  default: () => <div data-testid="tv-game-header">Header</div>,
}));

// The quiz projector itself is exercised by its own tests; here we only care
// that the TV path reaches it at all.
vi.mock('@/components/education/vocabQuiz/VocabQuizHostView', () => ({
  VocabQuizHostView: () => <div data-testid="vocab-quiz-host-view">Quiz projector</div>,
}));

// The room-type detector. Driven per test so both branches are covered.
const mockIsVocabQuizRoom = vi.fn();
vi.mock('@/components/education/vocabQuiz/useIsVocabQuizRoom', () => ({
  useIsVocabQuizRoom: () => mockIsVocabQuizRoom(),
  default: () => mockIsVocabQuizRoom(),
}));

const defaultProps = {
  gameCode: 'MHFHM5',
  username: 'gauntlet teacher',
  roomLanguage: 'en' as Language,
  roomName: 'gauntlet teacher Room',
  tableData: [],
  remainingTime: 185,
  timerValue: 3,
  playersReady: ['ProbeMaya'],
  playerScores: { ProbeMaya: 0 },
  playerWordCounts: { ProbeMaya: 0 },
  socket: null,
  t: (key: string) => key,
};

describe('TvBroadcastView — live Vocab Quiz on the classroom projector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the quiz projector when the room is running a Vocab Quiz', () => {
    // GIVEN the server is broadcasting quiz traffic for this room
    mockIsVocabQuizRoom.mockReturnValue(true);

    // WHEN the non-playing teacher's TV view renders
    render(<TvBroadcastView {...defaultProps} />);

    // THEN the projector shows the quiz, not the board-game broadcast
    expect(screen.getByTestId('vocab-quiz-host-view')).toBeInTheDocument();
    expect(screen.queryByTestId('tv-leaderboard-mock')).not.toBeInTheDocument();
  });

  it('still renders the normal broadcast for a board-game room', () => {
    // GIVEN an ordinary Classic/Blast/Word Hunt room
    mockIsVocabQuizRoom.mockReturnValue(false);

    render(<TvBroadcastView {...defaultProps} />);

    expect(screen.queryByTestId('vocab-quiz-host-view')).not.toBeInTheDocument();
    expect(screen.getByTestId('tv-leaderboard-mock')).toBeInTheDocument();
  });
});

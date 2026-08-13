import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PracticeResults from '../PracticeResults';
import type { SinglePlayerResultsData } from '../../SinglePlayerView';

// ─── Mocks ───

const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

const mockTrackFirstSessionDailyShown = vi.fn();
const mockTrackFirstSessionDailyClicked = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackFirstSessionDailyShown: (...args: unknown[]) => mockTrackFirstSessionDailyShown(...args),
  trackFirstSessionDailyClicked: (...args: unknown[]) => mockTrackFirstSessionDailyClicked(...args),
}));

let mockPracticeStreak = 1;
vi.mock('@/hooks/usePracticeStreak', () => ({
  usePracticeStreak: () => ({
    current: mockPracticeStreak,
    longest: mockPracticeStreak,
    lastDayKey: '2026-08-13',
    record: vi.fn(),
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'practiceResults.encouragement.legendary': 'Incredible!',
        'practiceResults.encouragement.great': 'Nice Work!',
        'practiceResults.encouragement.nice': 'Good Stuff!',
        'practiceResults.encouragement.warmup': 'Great Start!',
        'practiceResults.subtitle.legendary': 'You are on fire!',
        'practiceResults.subtitle.great': 'Serious word skills',
        'practiceResults.subtitle.nice': 'Every game makes you sharper',
        'practiceResults.subtitle.warmup': 'Practice makes perfect',
        'practiceResults.wordsFound': `${opts?.count ?? 0} words found`,
        'practiceResults.wordHuntCta': 'Play Word Hunt Daily',
        'practiceResults.wordHuntCtaDesc': 'Today\'s daily challenge awaits!',
        'practiceResults.wordHuntAlreadyPlayed': 'Already Played Today',
        'practiceResults.wordHuntAlreadyPlayedDesc': 'Come back tomorrow!',
        'practiceResults.firstSessionDailyTitle': 'Start your daily streak',
        'practiceResults.firstSessionDailyBody': 'Today\'s puzzle is live. Come back tomorrow for Day 2.',
        'practiceResults.firstSessionDailyCta': "Play today's Daily",
        'practiceResults.firstSessionComeBack': 'Day 1 — come back tomorrow',
        'practiceResults.goHome': 'Back to Home',
        'nextStep.backToLobby': 'Back to Lobby',
        'practiceResults.playAgain': 'Play Again',
      };
      return map[key] || key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    profile: null,
    updateProfile: vi.fn(),
    loading: false,
  }),
}));

vi.mock('@/hooks/useReducedMotion', () => ({
  __esModule: true,
  default: () => true, // Disable animations in tests
}));

// Mock framer-motion to render plain elements
vi.mock('framer-motion', () => {
  const MockDiv = React.forwardRef<HTMLDivElement, React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>>(
    function MockDiv({ children, className, style, onClick }, ref) {
      return <div ref={ref} className={className} style={style} onClick={onClick}>{children}</div>;
    }
  );
  const MockButton = React.forwardRef<HTMLButtonElement, React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>>(
    function MockButton({ children, className, onClick }, ref) {
      return <button ref={ref} className={className} onClick={onClick}>{children}</button>;
    }
  );
  return {
  m: {
    div: MockDiv,
    p: ({ children, className }: React.PropsWithChildren<React.HTMLAttributes<HTMLParagraphElement>>) => (
      <p className={className}>{children}</p>
    ),
    span: ({ children, className }: React.PropsWithChildren<React.HTMLAttributes<HTMLSpanElement>>) => (
      <span className={className}>{children}</span>
    ),
    button: MockButton,
  },
  useMotionValue: () => ({ on: () => () => {} }),
  useTransform: () => ({ on: () => () => {} }),
  animate: vi.fn(),
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
};});

const mockFireConfetti = vi.fn();
const mockFireVictoryConfetti = vi.fn();
vi.mock('@/utils/confettiUtils', () => ({
  fireConfetti: (...args: unknown[]) => mockFireConfetti(...args),
  fireVictoryConfetti: (...args: unknown[]) => mockFireVictoryConfetti(...args),
}));

vi.mock('@/utils/session', () => ({
  clearSessionPreservingUsername: vi.fn(),
}));

// Mock all data persistence hooks
vi.mock('../../results', () => ({
  useGuestStatsSync: () => ({ hasUpdatedStats: true }),
  useLeaderboardSync: vi.fn(),
  useGameHistory: vi.fn(),
  useGameSessionLogging: vi.fn(),
  useCoinRewards: vi.fn(),
  useCognitiveScoring: vi.fn(),
  useSignupPrompt: vi.fn().mockReturnValue({ showSignupModal: false, setShowSignupModal: vi.fn() }),
  useAchievementsSave: vi.fn(),
}));

vi.mock('@/components/ui/Mascot', () => ({
  MascotWithEntrance: ({ variant, size }: { variant: string; size: string }) => (
    <div data-testid="mascot" data-variant={variant} data-size={size}>Mascot</div>
  ),
}));

vi.mock('@/components/ui/CelebrationMascot', () => ({
  CelebrationMascotWithEntrance: ({ variant, size }: { variant: string; size: string }) => (
    <div data-testid="celebration-mascot" data-variant={variant} data-size={size}>CelebrationMascot</div>
  ),
}));

vi.mock('@/components/results/MissedWords', () => {
  const MockMissedWords = () => {
    return <div data-testid="missed-words">Missed Words</div>;
  };
  return { default: MockMissedWords };
});

// CatalystTeaser uses m.section/m.li — out of scope for this test, has its own suite
vi.mock('../CatalystTeaser', () => ({
  __esModule: true,
  CatalystTeaser: () => <div data-testid="catalyst-teaser-stub" />,
  default: () => <div data-testid="catalyst-teaser-stub" />,
}));

// Mock daily challenge storage
const mockHasPlayedWordHuntToday = vi.fn();
vi.mock('@/utils/dailyChallenge/storage', () => ({
  hasPlayedWordHuntToday: (...args: unknown[]) => mockHasPlayedWordHuntToday(...args),
}));

// ─── Test data ───

function makeResults(overrides: Partial<SinglePlayerResultsData> = {}): SinglePlayerResultsData {
  return {
    playerScore: 120,
    playerWords: ['hello', 'world', 'test'],
    playerWordData: [
      { word: 'hello', isValid: true, score: 5, comboBonus: 0, fireRoundBonus: 0, timestamp: Date.now(), timeSinceStart: 5 },
      { word: 'world', isValid: true, score: 5, comboBonus: 1, fireRoundBonus: 0, timestamp: Date.now(), timeSinceStart: 12 },
      { word: 'test', isValid: true, score: 4, comboBonus: 0, fireRoundBonus: 0, timestamp: Date.now(), timeSinceStart: 20 },
    ],
    gameDuration: 120,
    botScores: [],
    grid: [['h', 'e', 'l', 'l'], ['o', 'w', 'o', 'r'], ['l', 'd', 't', 'e'], ['s', 't', 'a', 'b']],
    allPossibleWords: ['hello', 'world', 'test', 'star', 'table'],
    isNewHighScore: false,
    ...overrides,
  };
}

// ─── Tests ───

describe('PracticeResults — Celebratory Redesign', () => {
  const defaultProps = {
    results: makeResults(),
    onPlayAgain: vi.fn(),
    onBackToLobby: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPlayedWordHuntToday.mockReturnValue(false);
    mockPracticeStreak = 1;
    for (const key of Array.from(mockSearchParams.keys())) mockSearchParams.delete(key);
    mockSearchParams.set('firstGame', '1');
  });

  // ── Celebration mascot ──

  describe('celebratory mascot', () => {
    it('shows celebration mascot for legendary tier (score >= 200)', () => {
      render(<PracticeResults {...defaultProps} results={makeResults({ playerScore: 250 })} />);
      const mascot = screen.getByTestId('celebration-mascot');
      expect(mascot).toBeInTheDocument();
      expect(mascot).toHaveAttribute('data-variant', 'celebration');
    });

    it('shows celebration mascot for great tier (score >= 100)', () => {
      render(<PracticeResults {...defaultProps} results={makeResults({ playerScore: 120 })} />);
      const mascot = screen.getByTestId('celebration-mascot');
      expect(mascot).toBeInTheDocument();
      expect(mascot).toHaveAttribute('data-variant', 'celebration');
    });

    it('shows encouraging mascot for warmup tier (score < 30)', () => {
      render(<PracticeResults {...defaultProps} results={makeResults({ playerScore: 15 })} />);
      const mascot = screen.getByTestId('mascot');
      expect(mascot).toBeInTheDocument();
      expect(mascot).toHaveAttribute('data-variant', 'encouraging');
    });
  });

  // ── Score and encouragement ──

  describe('score display', () => {
    it('shows encouragement text based on tier', () => {
      render(<PracticeResults {...defaultProps} results={makeResults({ playerScore: 250 })} />);
      expect(screen.getByText('Incredible!')).toBeInTheDocument();
    });

    it('shows words found count', () => {
      render(<PracticeResults {...defaultProps} />);
      expect(screen.getByText('3 words found')).toBeInTheDocument();
    });
  });

  // ── Word Hunt Daily CTA (primary action) ──

  describe('Word Hunt daily CTA', () => {
    it('shouldRenderFirstSessionDailyCopyWhenFirstGame', () => {
      // GIVEN a first-session practice result
      render(<PracticeResults {...defaultProps} />);

      // THEN the CTA names today's real Daily, not another practice mode
      expect(screen.getAllByText("Play today's Daily").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Day 1 — come back tomorrow').length).toBeGreaterThanOrEqual(1);
    });

    it('shouldNavigateToLiveDailyWhenFirstSessionCtaClicked', () => {
      // GIVEN first-session results
      render(<PracticeResults {...defaultProps} />);

      // WHEN the player taps the Daily CTA
      fireEvent.click(screen.getAllByText("Play today's Daily")[0]);

      // THEN they enter the live Word Hunt Daily, not /practice/wordHunt
      expect(mockPush).toHaveBeenCalledWith('/en/daily/word-hunt?from=first_game');
      expect(mockTrackFirstSessionDailyClicked).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'first_session' }),
      );
    });

    it('shouldNavigateToLiveDailyWhenReturningPlayerHasNotPlayedToday', () => {
      // GIVEN a returning practice player (streak > 1, no firstGame flag)
      mockPracticeStreak = 4;
      mockSearchParams.delete('firstGame');
      render(<PracticeResults {...defaultProps} />);

      // WHEN they tap the Daily CTA
      fireEvent.click(screen.getAllByText('Play Word Hunt Daily')[0]);

      // THEN the button that says Daily actually opens Daily
      expect(mockPush).toHaveBeenCalledWith('/en/daily/word-hunt?from=practice_results');
    });

    it('shows already-played state when daily was completed today', () => {
      mockHasPlayedWordHuntToday.mockReturnValue(true);
      render(<PracticeResults {...defaultProps} />);
      expect(screen.getByText('Already Played Today')).toBeInTheDocument();
    });

    it('checks daily status using current language', () => {
      render(<PracticeResults {...defaultProps} />);
      expect(mockHasPlayedWordHuntToday).toHaveBeenCalledWith('en');
    });

    it('shouldFireShownEventOnceOnFirstSessionMount', () => {
      render(<PracticeResults {...defaultProps} />);
      expect(mockTrackFirstSessionDailyShown).toHaveBeenCalledTimes(1);
      expect(mockTrackFirstSessionDailyShown).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'first_session' }),
      );
    });
  });

  // ── Secondary actions ──

  describe('secondary actions', () => {
    it('renders "Back to Home" as the only secondary action', () => {
      render(<PracticeResults {...defaultProps} />);
      const homeButtons = screen.getAllByText('Back to Home');
      expect(homeButtons.length).toBeGreaterThan(0);
    });

    it('calls onBackToLobby when home button is clicked', () => {
      render(<PracticeResults {...defaultProps} />);
      const homeButtons = screen.getAllByText('Back to Home');
      fireEvent.click(homeButtons[0]);
      expect(defaultProps.onBackToLobby).toHaveBeenCalled();
    });

    it('does not render a "Play Again" button (replaced by daily-challenge primary CTA)', () => {
      render(<PracticeResults {...defaultProps} />);
      expect(screen.queryByText('Play Again')).not.toBeInTheDocument();
    });
  });

  // ── Missed words ──

  describe('missed words section', () => {
    it('does not render MissedWords component directly (handled by sub-views)', () => {
      render(<PracticeResults {...defaultProps} />);
      // PracticeResults doesn't render MissedWords directly —
      // missed words are shown in MobileDetailsTab sub-component
      expect(screen.queryByTestId('missed-words')).not.toBeInTheDocument();
    });
  });

  // ── No old suggestion cards ──

  describe('removes old suggestion cards', () => {
    it('does not render "Fight Bots" suggestion', () => {
      render(<PracticeResults {...defaultProps} />);
      expect(screen.queryByText('practiceResults.tryBots')).not.toBeInTheDocument();
    });

    it('does not render "Play with Friends" suggestion', () => {
      render(<PracticeResults {...defaultProps} />);
      expect(screen.queryByText('practiceResults.tryMultiplayer')).not.toBeInTheDocument();
    });
  });
});

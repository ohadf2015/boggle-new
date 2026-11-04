import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TvResultsView from '../TvResultsView';
import { hostLeavesProjectorRecap, modeSceneOwnsHeroSlot, NEXT_ROUND_MODES } from '@/lib/education/roundEndResultsRoute';
import { projectorShowsQuiz, quizOwnsRoundEnd } from '@/components/education/vocabQuiz/useIsVocabQuizRoom';
import { resolveMpPagePhase } from '@/lib/multiplayer/mpPhase';
import { shouldWaitForTvReveal } from '@/components/education/results/classroomResultsDelivery';
import type { ClassroomSummary } from '@/shared/types/classroom';
import type { PlayerResult } from '@/types/components';

vi.mock('framer-motion', () => ({
  m: { div: 'div', p: 'p', h1: 'h1', h2: 'h2', span: 'span', header: 'header', section: 'section', li: 'li' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  MotionConfig: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => true,
}));

vi.mock('lucide-react', () => ({
  Maximize: () => null,
  Minimize: () => null,
  Crown: () => null,
  Check: () => null,
  X: () => null,
  EyeOff: () => null,
  RotateCcw: () => null,
  BarChart3: () => null,
  BookOpen: () => null,
  BookOpenCheck: () => null,
  Users: () => null,
  Gauge: () => null,
  ArrowUp: () => null,
}));

vi.mock('@/components/education/live/EduHostResults', () => {
  const Stub = ({ summary, onRematch }: { summary: ClassroomSummary; onRematch?: () => void }) => (
    <button type="button" data-testid="edu-host-results-stub" onClick={onRematch}>
      {summary.lessonNames.join(',')}
    </button>
  );
  return { default: Stub, EduHostResults: Stub };
});

// Every heavy child is stubbed: this file is about WHICH results surface the
// projector picks, not what each one draws.
vi.mock('../TvResultsWinnersPodium', () => ({
  default: () => <div data-testid="generic-arcade-podium" />,
}));
vi.mock('../TvResultsStatsGrid', () => ({ default: () => null }));
vi.mock('../TvResultsAwards', () => ({ default: () => null }));
vi.mock('../TvResultsPlayerSpotlight', () => ({ default: () => null }));
vi.mock('../TvResultsLeaderboard', () => ({ default: () => null }));
vi.mock('../TvResultsControls', () => ({ default: () => null }));
vi.mock('../TvInstallQr', () => ({ default: () => null }));
vi.mock('../../../../components/TournamentStandings', () => ({ default: () => null }));
vi.mock('../../../../components/results/PlayersReadyIndicator', () => ({ default: () => null }));
vi.mock('../../../../components/multiplayer/HostWordSelector', () => ({
  HostWordSelector: () => null,
}));
vi.mock('../../../../components/blast/legacy/BlastMpResults', () => ({ default: () => null }));
vi.mock('../../../../components/multiplayer/MpModeBreakdown', () => ({ default: () => null }));
vi.mock('../../../../components/ui/DJMascot', () => ({ DJMascotWithEntrance: () => null }));

vi.mock('../useTvResultsAnimation', () => ({
  useTvResultsAnimation: () => ({
    getPhaseVisibility: () => true,
    isAnimating: false,
    skipToEnd: vi.fn(),
  }),
}));
vi.mock('../../../hooks/useTvFullscreen', () => ({
  useTvFullscreen: () => ({ isFullscreen: false, toggleFullscreen: vi.fn(), isSupported: false }),
}));
vi.mock('@/hooks/gameState/store', () => ({ useGameMode: () => 'classic' }));
vi.mock('../../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
vi.mock('../../../../contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ sfxMuted: true, sfxVolume: 0 }),
}));
vi.mock('../../../../contexts/MusicContext', () => ({
  useMusic: () => ({ isMuted: true, audioUnlocked: false }),
}));

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const scores: PlayerResult[] = [
  { username: 'Maya', score: 90, wordsFoundCount: 2 },
  { username: 'Noa', score: 70, wordsFoundCount: 1 },
] as unknown as PlayerResult[];

const summary: ClassroomSummary = {
  teacherName: 'Ms. Cohen',
  lessonNames: ['Physics 101'],
  lessonIds: ['lesson-1'],
  totalWords: 4,
  coverage: [
    { word: 'photon', foundBy: ['Maya'] },
    { word: 'atom', foundBy: ['Maya', 'Noa'] },
    { word: 'neutron', foundBy: [] },
    { word: 'quark', foundBy: [] },
  ],
  missedWords: ['neutron', 'quark'],
  classFoundCount: 2,
  masteryByPlayer: { Maya: { found: 2, total: 4 }, Noa: { found: 1, total: 4 } },
  podium: [
    { username: 'Maya', score: 90, rank: 1, wordsFound: 2, totalWords: 4 },
    { username: 'Noa', score: 70, rank: 2, wordsFound: 1, totalWords: 4 },
  ],
  neverPlacedWords: ['quark'],
};

const baseProps = {
  finalScores: scores,
  tournamentData: null,
  username: 'Ms. Cohen',
  onStartNewGame: vi.fn(),
  onNextRound: vi.fn(),
  onShowQR: vi.fn(),
  t,
};


/**
 * Every classroom mode ends the same way: the projector recap on the host and
 * the classroom results card on phones, never a mode's own finale or arcade hero.
 */
const BOARD_MODES = ['classic', 'word-hunt', 'blast', 'wheel-rush'] as const;

interface RoundEndCase {
  name: string;
  gameMode: string;
  quizRoom: boolean;
  summary: ClassroomSummary;
}

const teams: ClassroomSummary = {
  ...summary,
  teamBattle: { teamCount: 2, teams: [{ id: 0, members: ['Maya'] }, { id: 1, members: ['Noa'] }] } as unknown as ClassroomSummary['teamBattle'],
};

const CASES: RoundEndCase[] = [
  ...BOARD_MODES.map((gameMode) => ({ name: gameMode, gameMode, quizRoom: false, summary })),
  { name: 'wordcraft', gameMode: 'wordcraft', quizRoom: false, summary },
  { name: 'vocab-quiz', gameMode: 'vocab-quiz', quizRoom: true, summary },
  { name: 'vocab-quiz Boss Battle', gameMode: 'vocab-quiz', quizRoom: true, summary },
  { name: 'classic Boss Battle', gameMode: 'classic', quizRoom: false, summary },
  { name: 'classic teams', gameMode: 'classic', quizRoom: false, summary: teams },
  // A rematch set to random resolves on the server to one of the board modes.
  ...BOARD_MODES.map((gameMode) => ({ name: `random -> ${gameMode}`, gameMode, quizRoom: false, summary })),
  // A quiz room stays a quiz room after a board rematch until the next start releases it.
  ...BOARD_MODES.map((gameMode) => ({ name: `after a quiz, random -> ${gameMode}`, gameMode, quizRoom: true, summary })),
];

describe.each(CASES)('classroom round end: $name', ({ gameMode, quizRoom, summary: roundSummary }) => {
  it('keeps the teacher on the projector recap, with no quiz finale behind it', () => {
    expect(hostLeavesProjectorRecap({ hostPlaying: false, gameMode, hasClassroomSummary: true })).toBe(false);
    expect(
      projectorShowsQuiz({ hostPlaying: false, isQuizRoom: quizRoom, hasRecap: true, gameStarted: false, hasBoard: !quizRoom })
    ).toBe(false);

    render(<TvResultsView {...baseProps} gameMode={gameMode as never} classroomSummary={roundSummary} />);
    expect(screen.getByTestId('edu-host-results-stub')).toHaveTextContent('Physics 101');
    expect(screen.queryByTestId('generic-arcade-podium')).not.toBeInTheDocument();
  });

  it('sends every phone straight to the shared results card, not a mode hero or finale', () => {
    const payload = { tvMode: true, classroomSummary: roundSummary, gameMode };
    expect(shouldWaitForTvReveal(payload)).toBe(false);
    const quizEndsThisRound = quizOwnsRoundEnd({
      isQuizRoom: quizRoom, showResults: true, isActive: true, hasClassroomRecap: !!payload.classroomSummary,
    });
    expect(resolveMpPagePhase({ showResults: true, quizEndsThisRound, isActive: true, isHost: false })).toBe('results');
    expect(modeSceneOwnsHeroSlot({ hasClassroomSummary: true })).toBe(false);
  });
});

describe('the rematch picker', () => {
  it('only offers modes the cases above cover', () => {
    const covered = new Set<string>([...CASES.map((c) => c.gameMode), 'random']);
    for (const mode of NEXT_ROUND_MODES) expect(covered.has(mode)).toBe(true);
  });
});

describe('without a lesson recap', () => {
  it('a quiz still owns its own ending, so a recap-less quiz never shows board zeros', () => {
    expect(quizOwnsRoundEnd({ isQuizRoom: true, showResults: true, isActive: true, hasClassroomRecap: false })).toBe(true);
  });
});

describe('what random can deal', () => {
  it('is the four board modes the cases above cover, as the routing comment says', async () => {
    const { ALL_GAME_MODES } = await import('@/backend/modules/gameModeSelector');
    expect([...ALL_GAME_MODES].sort()).toEqual([...BOARD_MODES].sort());
  });
});

/**
 * The classroom teacher's projector, at the end of a round.
 *
 * A classroom host is FORCED into broadcast mode (useHostViewState hard-sets
 * hostPlaying=false whenever the room has lesson data), and useHostGameEvents
 * only calls onShowResults when hostPlaying is true. So the teacher never
 * reaches ResultsPage / ClassroomResultsCard — this view is the whole
 * end-of-game moment for the person standing in front of the class.
 *
 * Before this branch existed the projector showed the generic arcade podium
 * and no lesson coverage at all: the lesson the teacher just taught was
 * invisible on the only screen the room was looking at.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TvResultsView from '../TvResultsView';
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

describe('TvResultsView — the classroom projector', () => {
  it('hands a lesson round to the edu host results, not the arcade podium', () => {
    const onStartNewGame = vi.fn();
    render(<TvResultsView {...baseProps} onStartNewGame={onStartNewGame} classroomSummary={summary} />);
    expect(screen.getByTestId('edu-host-results-stub')).toHaveTextContent('Physics 101');
    expect(screen.queryByTestId('generic-arcade-podium')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('edu-host-results-stub'));
    expect(onStartNewGame).toHaveBeenCalledTimes(1);
  });

  it('leaves an ordinary arcade room exactly as it was', () => {
    render(<TvResultsView {...baseProps} />);
    expect(screen.getByTestId('generic-arcade-podium')).toBeInTheDocument();
    expect(screen.queryByTestId('edu-host-results-stub')).not.toBeInTheDocument();
  });
});

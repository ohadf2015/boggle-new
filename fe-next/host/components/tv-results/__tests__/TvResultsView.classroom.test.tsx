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

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TvResultsView from '../TvResultsView';
import type { ClassroomSummary } from '@/shared/types/classroom';
import type { PlayerResult } from '@/types/components';

vi.mock('framer-motion', () => ({
  m: { div: 'div', p: 'p', h1: 'h1', h2: 'h2', span: 'span', header: 'header', section: 'section' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
}));

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
  it('stages the classroom podium, not the arcade one, when the round was a lesson', () => {
    render(<TvResultsView {...baseProps} classroomSummary={summary} />);
    expect(screen.getByTestId('classroom-tv-results')).toBeInTheDocument();
    expect(screen.queryByTestId('generic-arcade-podium')).not.toBeInTheDocument();
  });

  // The plinths are painted from the first frame; the NAMES land on the
  // reveal's timetable (third, second, a beat, the winner). Both halves of that
  // are asserted here, because a reveal that ever leaves the wall blank is the
  // exact bug that froze this podium static in the first place.
  it('has the plinths on the wall before any name is revealed', () => {
    render(<TvResultsView {...baseProps} classroomSummary={summary} />);
    expect(screen.getByTestId('podium-place-1')).toBeInTheDocument();
    expect(screen.getByTestId('podium-place-2')).toBeInTheDocument();
  });

  it('names the winners on the plinths so the room reads them from the back', async () => {
    render(<TvResultsView {...baseProps} classroomSummary={summary} />);
    await waitFor(
      () => expect(screen.getByTestId('podium-place-1')).toHaveTextContent('Maya'),
      { timeout: 4000 }
    );
    expect(screen.getByTestId('podium-place-1')).toHaveTextContent('90');
  });

  it('shows the class word coverage on the same screen', () => {
    render(<TvResultsView {...baseProps} classroomSummary={summary} />);
    expect(screen.getByTestId('coverage-meter')).toHaveAttribute('aria-valuenow', '2');
    expect(screen.getByTestId('lesson-word-photon')).toHaveAttribute('data-found', 'true');
  });

  it('does not blame the class for a word the board never carried', () => {
    render(<TvResultsView {...baseProps} classroomSummary={summary} />);
    expect(screen.getByTestId('lesson-word-quark')).toHaveAttribute('data-placed', 'false');
    expect(screen.getByTestId('lesson-word-neutron')).toHaveAttribute('data-placed', 'true');
  });

  it('offers the teacher one tap to run it again', () => {
    render(<TvResultsView {...baseProps} classroomSummary={summary} />);
    expect(screen.getByTestId('classroom-tv-rematch')).toBeInTheDocument();
  });

  it('leaves an ordinary arcade room exactly as it was', () => {
    render(<TvResultsView {...baseProps} />);
    expect(screen.getByTestId('generic-arcade-podium')).toBeInTheDocument();
    expect(screen.queryByTestId('classroom-tv-results')).not.toBeInTheDocument();
  });
});

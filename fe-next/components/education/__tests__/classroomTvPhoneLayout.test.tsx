/**
 * Classroom TV mode on a phone (RED first).
 *
 * A classroom room is always TV mode — `useHostViewState` puts the lesson
 * check BEFORE the phone check — so a teacher who runs the lesson from a phone
 * gets the projector screens at 375px. Those screens lock their root with
 * `overflow-hidden` and size for a 16:9 wall, so on a phone the podium, the
 * reteach list and REMATCH were clipped off the bottom with no way to reach
 * them.
 *
 * Contract: the wall keeps its no-scroll lock at the breakpoint where the
 * layout goes wide (md for the quiz, lg for the two-column recap). Below it,
 * the root scrolls and the children stop shrinking to fit a height they
 * cannot fit in.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const ENDED = {
  phase: 'ended' as const,
  paused: false,
  question: null,
  reveal: null,
  standings: [{ username: 'ana', score: 480, streak: 4, bestStreak: 5, correctCount: 4 }],
  myAnswer: null,
  pendingChoice: null,
  myScore: 0,
  myStreak: 0,
  secondsLeft: 0,
  fractionLeft: 0,
  totalQuestions: 10,
  questionNumber: 10,
  finished: true,
  lockIn: null,
  chestPending: false,
  myChest: null,
  chestEvents: [],
  chestHit: null,
  answer: vi.fn(),
  isQuizRoom: true,
};

vi.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: vi.fn(),
  fireVictoryConfetti: vi.fn(),
  cleanupConfetti: vi.fn(),
}));
vi.mock('@/lib/education/roundEndSound', () => ({
  playRoundEndCue: vi.fn(() => null),
  ROUND_WIN_SOUND: '',
  CLASS_SWEEP_SOUND: '',
}));
vi.mock('../vocabQuiz/useVocabQuiz', () => ({ useVocabQuiz: () => ENDED }));

const { VocabQuizHostView } = await import('../vocabQuiz/VocabQuizHostView');
const { ClassroomTvResults } = await import('../results/ClassroomTvResults');
const { ClassroomTvResultsScreen } = await import(
  '@/host/components/tv-results/ClassroomTvResultsScreen'
);

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const tokens = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/);

const summary = () => ({
  teacherName: 'T',
  lessonNames: ['Unit 3'],
  lessonIds: ['l1'],
  totalWords: 2,
  classFoundCount: 1,
  coverage: [
    { word: 'brave', foundBy: ['Noa'] },
    { word: 'calm', foundBy: [] },
  ],
  missedWords: ['calm'],
  masteryByPlayer: { Noa: { found: 1, total: 2 } },
  podium: [{ username: 'Noa', score: 120, rank: 1 }],
});

afterEach(cleanup);

describe('classroom TV mode on a phone', () => {
  it('quiz projector scrolls on a phone and locks on the wall', () => {
    render(<VocabQuizHostView socket={null} joinCode="H9M5YJ" playerCount={1} t={t} />);
    const root = tokens(screen.getByTestId('vocab-quiz-host'));
    expect(root).toContain('overflow-y-auto');
    expect(root).toContain('md:overflow-hidden');
    expect(root).not.toContain('overflow-hidden');
    expect(root).toContain('p-3');
    expect(root).toContain('md:p-6');
  });

  it('quiz finale scrolls on a phone and scales its headline down', () => {
    render(<VocabQuizHostView socket={null} joinCode="H9M5YJ" playerCount={1} t={t} />);
    const finale = tokens(screen.getByTestId('vocab-quiz-finale'));
    expect(finale).toContain('md:overflow-hidden');
    expect(finale).not.toContain('overflow-hidden');
    expect(finale).not.toContain('min-h-0');
    const title = tokens(screen.getByRole('heading', { level: 2 }));
    expect(title).toContain('text-3xl');
    expect(title).toContain('md:text-5xl');
  });

  it('round recap scrolls below lg, where it is one column', () => {
    render(<ClassroomTvResults summary={summary() as never} onRematch={() => {}} t={t} />);
    const root = tokens(screen.getByTestId('classroom-tv-results'));
    expect(root).toContain('overflow-y-auto');
    expect(root).toContain('lg:overflow-hidden');
    expect(root).not.toContain('overflow-hidden');
    const columns = tokens(screen.getByTestId('tv-recap-columns'));
    expect(columns).not.toContain('min-h-0');
    expect(columns).toContain('lg:min-h-0');
    expect(columns).toContain('lg:flex-1');
  });

  it('recap screen leaves room under its corner buttons on a phone', () => {
    render(
      <ClassroomTvResultsScreen summary={summary() as never} onClose={() => {}} t={t} />
    );
    const pane = screen.getByTestId('classroom-tv-results').parentElement!;
    expect(tokens(pane)).toContain('pt-20');
    expect(tokens(pane)).toContain('md:pt-6');
  });
});

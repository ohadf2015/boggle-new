import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherLiveControls } from '../TeacherLiveControls';
import EduHostResults from '@/components/education/live/EduHostResults';
import { IDLE_ROUND_STATE, isRoundLive, reduceRoundSignal, shouldShowTeacherStrip, type RoundSignal } from '../controls/teacherStripVisibility';
import { CLASSROOM_GAME_MODES, VOCAB_QUIZ_MODE } from '@/shared/types/vocabQuiz';
import { useClassroomBossStore } from '@/stores/classroomBossStore';
import { FREE_CLASSROOM_BOSS_ID, type ClassroomBossView } from '@/shared/types/classroomBoss';
import type { ClassroomSummary } from '@/shared/types/classroom';
import type { PlayerResult } from '@/types/components';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', dir: 'ltr', t: (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k) }),
}));
vi.mock('next/image', () => ({ default: () => <span /> }));
vi.mock('@/components/Avatar', () => ({ default: () => <span /> }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('@/utils/confettiUtils', () => ({ fireRankConfetti: vi.fn(), fireVictoryConfetti: vi.fn(), cleanupConfetti: vi.fn() }));
vi.mock('@/lib/education/roundEndSound', () => ({ playRoundEndCue: vi.fn(() => null), ROUND_WIN_SOUND: '', CLASS_SWEEP_SOUND: '' }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: false, loading: false }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/lib/education/reportProCtaClick', () => ({ reportProOfferImpression: vi.fn(), reportProOfferClick: vi.fn(), reportProCtaClick: vi.fn() }));

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

interface ModeCase {
  name: string;
  gameMode: string;
  quiz: boolean;
  boss?: ClassroomBossView['status'];
  teams?: boolean;
}

/** Every live class mode, plus Boss Battle (a quiz setting) and team play (a board setting). */
const CASES: ModeCase[] = [
  ...CLASSROOM_GAME_MODES.map((mode) => ({ name: mode, gameMode: mode, quiz: mode === VOCAB_QUIZ_MODE })),
  { name: 'Boss Battle (defeated)', gameMode: VOCAB_QUIZ_MODE, quiz: true, boss: 'defeated' },
  { name: 'Boss Battle (escaped)', gameMode: VOCAB_QUIZ_MODE, quiz: true, boss: 'escaped' },
  { name: 'classic in teams', gameMode: 'classic', quiz: false, teams: true },
];

const START: Record<'board' | 'quiz', RoundSignal[]> = {
  board: [{ type: 'boardStart' }],
  quiz: [{ type: 'boardStart' }, { type: 'quizQuestion' }],
};
const END: Record<'board' | 'quiz', RoundSignal> = { board: { type: 'boardEnd' }, quiz: { type: 'quizEnded' } };

const summary = (c: ModeCase): ClassroomSummary =>
  ({
    teacherName: 'Ms. Cohen',
    lessonNames: ['Unit 3'],
    lessonIds: ['l1'],
    totalWords: 4,
    classFoundCount: 2,
    coverage: [
      { word: 'photon', foundBy: ['Maya'] },
      { word: 'atom', foundBy: ['Maya', 'Noa'] },
      { word: 'neutron', foundBy: [] },
      { word: 'quark', foundBy: [] },
    ],
    missedWords: ['neutron', 'quark'],
    masteryByPlayer: { Maya: { found: 2, total: 4 }, Noa: { found: 1, total: 4 } },
    podium: [
      { username: 'Maya', score: 90, rank: 1, wordsFound: 2, totalWords: 4 },
      { username: 'Noa', score: 70, rank: 2, wordsFound: 1, totalWords: 4 },
    ],
    ...(c.teams ? { teamBattle: { teamCount: 2, teams: [{ id: 0, members: ['Maya'] }, { id: 1, members: ['Noa'] }] } } : {}),
  }) as unknown as ClassroomSummary;
const players = [
  { username: 'Maya', score: 90, wordsFoundCount: 2 },
  { username: 'Noa', score: 70, wordsFoundCount: 1 },
] as unknown as PlayerResult[];

function setBoss(status?: ClassroomBossView['status']) {
  useClassroomBossStore.getState().reset();
  if (!status) return;
  useClassroomBossStore.setState({ view: { bossId: FREE_CLASSROOM_BOSS_ID, status, hp: status === 'defeated' ? 0 : 20, maxHp: 100 } as unknown as ClassroomBossView });
}

describe.each(CASES)('$name: one teacher path for the live round and its end', (c) => {
  beforeEach(() => setBoss(c.boss));
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    useClassroomBossStore.getState().reset();
  });

  it('shows the same control strip while the round runs and drops it on the results', () => {
    const kind = c.quiz ? 'quiz' : 'board';
    const live = START[kind].reduce(reduceRoundSignal, IDLE_ROUND_STATE);
    const base = { isActive: true, isHost: true, isClassroomMode: true };
    expect(shouldShowTeacherStrip({ ...base, showResults: false, roundLive: isRoundLive(live) })).toBe(true);
    const ended = reduceRoundSignal(live, END[kind]);
    expect(shouldShowTeacherStrip({ ...base, showResults: false, roundLive: isRoundLive(ended) })).toBe(false);
    expect(shouldShowTeacherStrip({ ...base, showResults: true, roundLive: true })).toBe(false);
  });

  it('pauses, adds time and ends the round through the same three buttons', () => {
    vi.useFakeTimers();
    const props = { onPause: vi.fn(), onResume: vi.fn(), onExtendTime: vi.fn(), onEndRound: vi.fn(), onSkipWord: vi.fn() };
    const { rerender } = render(<TeacherLiveControls isPaused={false} gameMode={c.gameMode} isQuizRound={c.quiz} {...props} />);
    fireEvent.click(screen.getByTestId('teacher-pause-toggle'));
    expect(props.onPause).toHaveBeenCalledTimes(1);
    rerender(<TeacherLiveControls isPaused gameMode={c.gameMode} isQuizRound={c.quiz} {...props} />);
    fireEvent.click(screen.getByTestId('teacher-pause-toggle'));
    expect(props.onResume).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('teacher-extend-time'));
    expect(props.onExtendTime).toHaveBeenCalledWith(expect.any(Number));
    fireEvent.click(screen.getByTestId('teacher-end-round'));
    expect(props.onEndRound).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('teacher-end-round'));
    expect(props.onEndRound).toHaveBeenCalledTimes(1);
  });

  it('ends on the projector recap with the same play again, next mode and end game actions', () => {
    vi.useFakeTimers();
    const onRematch = vi.fn();
    const onClose = vi.fn();
    const onExitRoom = vi.fn();
    render(<EduHostResults summary={summary(c)} players={players} t={t} onRematch={onRematch} onClose={onClose} onExitRoom={onExitRoom} />);
    act(() => {
      vi.advanceTimersByTime(9000);
    });
    expect(screen.getByTestId('edu-host-results')).toBeInTheDocument();
    if (c.boss) expect(screen.getByTestId('edu-host-results')).toContainElement(screen.getByTestId('boss-outcome'));
    expect(screen.getByTestId('edu-replay-missed')).toHaveAttribute('data-results-primary');
    fireEvent.click(screen.getByTestId('edu-results-play-again'));
    fireEvent.click(screen.getByTestId('edu-results-next-mode'));
    fireEvent.click(screen.getByTestId('edu-results-end'));
    expect(onRematch).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onExitRoom).toHaveBeenCalledTimes(1);
  });
});

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const controller = vi.hoisted(() => ({ current: null as unknown }));
vi.mock('@/components/multiplayer/results/useMpResultsController', () => ({ useMpResultsController: () => controller.current }));
vi.mock('@/components/results/ResultsFriendStatus', () => ({ ResultsFriendStatusProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/education/economy/useRoundReward', () => ({
  useRoundReward: (gameCode: string | null, roundId: string | null) => (gameCode && roundId ? { gameCode, roundId, rarity: 'rare', xp: 35, itemId: 'hat', roundCash: 0, rank: 1, size: 2 } : null),
}));
vi.mock('@/components/education/results/StudentChestBeat', () => ({ StudentChestBeat: () => <div data-testid="chest-cta" /> }));
vi.mock('@/components/education/economy/RoundShop', () => ({ default: () => <div data-testid="round-shop" /> }));
vi.mock('@/components/student/live/StudentMissedWords', () => ({ StudentMissedWords: ({ words }: { words: string[] }) => <div data-testid="missed" data-words={words.join(',')} /> }));
vi.mock('@/components/multiplayer/results/useOpenLessonPractice', () => ({ useOpenLessonPractice: () => vi.fn() }));
vi.mock('next/image', () => ({ default: () => <span data-testid="img" /> }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (key: string) => key }) }));
vi.mock('@/components/education/LevelUpCelebration', () => ({
  default: ({ levelUpData, onClose }: { levelUpData: { newLevel: number } | null; onClose: () => void }) =>
    levelUpData ? <button type="button" data-testid="level-up" data-level={levelUpData.newLevel} onClick={onClose} /> : null,
}));
vi.mock('@/components/education/lobby/WaitingWarmUp', () => ({ WaitingWarmUp: () => <div data-testid="waiting-warmup" /> }));
vi.mock('@/components/ui/ConfirmationDialog', () => ({
  ConfirmationDialog: ({ open, onConfirm }: { open: boolean; onConfirm: () => void }) => (open ? <button type="button" data-testid="confirm-exit" onClick={onConfirm} /> : null),
}));

import EduStudentResults from '@/components/education/live/EduStudentResults';
import { useClassroomBossStore } from '@/stores/classroomBossStore';
import { FREE_CLASSROOM_BOSS_ID, type ClassroomBossView } from '@/shared/types/classroomBoss';
import { sessionKeyFor } from '@/lib/education/roundEndHistory';
import { openMore } from './openStudentMore';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

function makeController(over: Record<string, unknown> = {}) {
  return {
    t,
    language: 'en',
    isExiting: false,
    showExitConfirm: false,
    setShowExitConfirm: vi.fn(),
    requestExit: vi.fn(),
    confirmExitRoom: vi.fn(),
    data: {
      sortedScores: [{ username: 'Noa', score: 30 }, { username: 'Maya', score: 20 }],
      currentPlayerValidWords: [{ word: 'cat', score: 2 }, { word: 'tame', score: 4 }],
    },
    ...over,
  };
}

const missedSummary = { teacherName: 'Ms Cohen', lessonIds: ['l1'], coverage: [{ word: 'apple', foundBy: ['Noa'] }] };

const props = {
  finalScores: [{ username: 'Noa', score: 30 }, { username: 'Maya', score: 20 }],
  username: 'Maya',
  gameCode: 'AB12CD',
  gameSessionId: 77,
  classroomSummary: { teacherName: 'Ms Cohen', missedWords: ['apple'], masteryByPlayer: { Maya: { missed: ['apple'] } }, lessonIds: ['l1'] },
} as never;

describe('EduStudentResults on a 390x844 phone', () => {
  beforeEach(() => {
    controller.current = makeController();
    useClassroomBossStore.getState().reset();
    window.sessionStorage.clear();
  });

  it('given my round, when results show, then the word lists fold into one closed row that mounts nothing until opened', () => {
    render(<EduStudentResults {...(props as object)} />);
    const more = screen.getByTestId('edu-student-more');
    expect(more.tagName).toBe('DETAILS');
    expect(more).not.toHaveAttribute('open');
    expect(screen.queryAllByTestId('edu-student-word')).toHaveLength(0);
    expect(screen.queryByTestId('missed')).toBeNull();
    openMore();
    expect(more).toContainElement(screen.getAllByTestId('edu-student-word')[0]);
    expect(more).toContainElement(screen.getByTestId('missed'));
    for (const id of ['edu-student-hero', 'wait-for-teacher-message', 'chest-cta', 'round-shop']) {
      expect(more).not.toContainElement(screen.getByTestId(id));
    }
    expect(screen.getByTestId('edu-student-more-summary')).toHaveTextContent('eduLiveRoom.studentResults.moreFromRound');
  });

  it('given a round reward, when results show, then the order is the reveal (with its chest), the best-word pair, the shop, then the wait bar, and the chest is not in the header', () => {
    render(<EduStudentResults {...(props as object)} />);
    expect(screen.getByTestId('edu-student-hero')).toContainElement(screen.getByTestId('chest-cta'));
    const order = ['edu-student-hero', 'edu-student-best-word', 'round-shop', 'wait-for-teacher-message'].map((id) => screen.getByTestId(id));
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(screen.getByTestId('edu-student-results-leave').closest('header')).not.toContainElement(screen.getByTestId('chest-cta'));
  });

  it('given a signed-in student, when results show, then the XP bar folds away and no XP chip crowds the card (the chest pays the XP)', () => {
    controller.current = makeController({ socketEvents: { xpGainedData: { xpEarned: 30, newTotalXp: 400 } } });
    render(<EduStudentResults {...(props as object)} />);
    expect(screen.queryByTestId('edu-student-xp-bar')).toBeNull();
    openMore();
    expect(screen.getByTestId('edu-student-more')).toContainElement(screen.getByTestId('edu-student-xp-bar'));
    expect(screen.queryByTestId('edu-student-xp')).toBeNull();
  });

  it('given my round, when the class goal exists, then it folds under More instead of crowding the reveal', () => {
    render(<EduStudentResults {...(props as object)} classroomSummary={{ teacherName: 'Ms Cohen', classFoundCount: 3, totalWords: 5, lessonIds: ['l1'] }} />);
    expect(screen.queryByTestId('edu-student-class-goal')).toBeNull();
    openMore();
    expect(screen.getByTestId('edu-student-more')).toContainElement(screen.getByTestId('edu-student-class-goal'));
  });

  it('given my round, when results show, then Share is an icon beside Leave, not a row of its own', () => {
    render(<EduStudentResults {...(props as object)} />);
    expect(screen.getByTestId('edu-student-results-leave').closest('header')).toContainElement(screen.getByTestId('edu-student-share'));
    expect(screen.getByTestId('edu-student-share')).toHaveAccessibleName('eduLiveRoom.studentResults.share');
  });

  it('given a later round this session, when results show, then momentum chips fold under More and no tomorrow line shows', () => {
    const summary = { teacherName: 'Ms Cohen', missedWords: [], lessonIds: ['l1'], lessonNames: ['Animals'], totalWords: 4, classFoundCount: 1, coverage: [], masteryByPlayer: { Maya: { found: 1, total: 4 } } };
    window.sessionStorage.setItem(sessionKeyFor(summary as never), JSON.stringify([{ score: 12, rank: 2, players: 2, sweep: false, at: 1 }]));
    render(<EduStudentResults {...({ ...(props as object), classroomSummary: summary } as never)} />);
    openMore();
    expect(screen.getByTestId('edu-student-more')).toContainElement(screen.getByTestId('student-outcome-delta'));
    expect(screen.queryByTestId('edu-student-tomorrow')).toBeNull();
  });

  it('given the slim wait bar on this screen, then it says it once, without the second "stay here" line', () => {
    render(<EduStudentResults {...(props as object)} />);
    expect(screen.getByTestId('wait-for-teacher-message')).not.toHaveTextContent('education.results.stayInClass');
  });

  it('given missed words, when results show, then the pinned practice bar sits below the scroll area, which reserves room at its end behind a hard edge so no row hides under the bar', () => {
    render(<EduStudentResults {...(props as object)} classroomSummary={missedSummary as never} />);
    const scroll = screen.getByTestId('edu-student-results-scroll');
    const bar = screen.getByTestId('edu-student-results-bar');
    expect(bar).toContainElement(screen.getByTestId('practice-missed-button'));
    expect(scroll).not.toContainElement(bar);
    expect(scroll.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(bar.className).not.toMatch(/\b(fixed|absolute|sticky)\b/);
    expect(scroll.className).toMatch(/\boverflow-y-auto\b/);
    expect(scroll.className).toMatch(/\bpb-6\b/);
    expect(bar.className).toMatch(/\bborder-t-2\b/);
  });

  it('given a practice button in the bar, then the wait line under it is slim text, not a second card stealing the first frame', () => {
    render(<EduStudentResults {...(props as object)} classroomSummary={missedSummary as never} />);
    const wait = screen.getByTestId('wait-for-teacher-message');
    expect(wait.className).not.toMatch(/\bborder-2\b/);
    expect(wait.className).not.toMatch(/\bmin-h-11\b/);
  });

  it('given a Boss round, when results show, then the boss verdict is the slim strip', () => {
    useClassroomBossStore.setState({ view: { bossId: FREE_CLASSROOM_BOSS_ID, status: 'defeated', hp: 0, maxHp: 100, topHitters: [] } as unknown as ClassroomBossView });
    render(<EduStudentResults {...(props as object)} />);
    expect(screen.getByTestId('boss-outcome')).toHaveAttribute('data-density', 'compact');
  });
});

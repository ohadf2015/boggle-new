import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const controller = vi.hoisted(() => ({ current: null as unknown }));
const openPractice = vi.hoisted(() => vi.fn());
const chestProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }));
const shopProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }));
const missedProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }));
const capture = vi.hoisted(() => vi.fn());
vi.mock('@/components/multiplayer/results/useMpResultsController', () => ({ useMpResultsController: () => controller.current }));
vi.mock('@/components/results/ResultsFriendStatus', () => ({ ResultsFriendStatusProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/education/economy/ChestRewardCta', () => ({
  default: (p: Record<string, unknown>) => {
    chestProps.current = p;
    return <div data-testid="chest-cta" />;
  },
}));
vi.mock('@/components/education/economy/RoundShop', () => ({
  default: (p: Record<string, unknown>) => {
    shopProps.current = p;
    return <div data-testid="round-shop" />;
  },
}));
vi.mock('@/components/student/live/StudentMissedWords', () => ({
  StudentMissedWords: (p: Record<string, unknown>) => {
    missedProps.current = p;
    return <div data-testid="missed" />;
  },
}));
vi.mock('@/components/multiplayer/results/useOpenLessonPractice', () => ({ useOpenLessonPractice: () => openPractice }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (key: string) => key }) }));
vi.mock('@/components/ui/ConfirmationDialog', () => ({ ConfirmationDialog: () => null }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: (...a: unknown[]) => capture(...a), register: vi.fn() } }));

import EduStudentResults from '@/components/education/live/EduStudentResults';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

function makeController() {
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
  };
}

const base = {
  finalScores: [{ username: 'Noa', score: 30 }, { username: 'Maya', score: 20 }],
  username: 'Maya',
  gameCode: 'AB12CD',
  gameSessionId: 77,
};
const withMissed = { ...base, classroomSummary: { teacherName: 'Ms Cohen', lessonIds: ['l1'], coverage: [{ word: 'apple', foundBy: ['Noa'] }] } };
const allFound = { ...base, classroomSummary: { teacherName: 'Ms Cohen', lessonIds: ['l1'], coverage: [{ word: 'apple', foundBy: ['Maya'] }] } };

describe('EduStudentResults — one next step', () => {
  beforeEach(() => {
    controller.current = makeController();
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });
  afterEach(() => {
    delete (navigator as unknown as { share?: unknown }).share;
  });

  it.each([
    ['missed words to practise', withMissed],
    ['every word found', allFound],
  ])('Given %s, When results show, Then exactly one primary action is on the screen', (_label, props) => {
    const { container } = render(<EduStudentResults {...(props as never)} />);
    expect(container.querySelectorAll('[data-results-primary]')).toHaveLength(1);
    expect(screen.getByTestId('wait-for-teacher-message')).toHaveAttribute('data-results-primary');
  });

  it('Given missed lesson words, When results show, Then practice is one quieter action below the primary, not a second chip on the word list', () => {
    render(<EduStudentResults {...(withMissed as never)} />);
    expect(missedProps.current?.onPractice).toBeUndefined();
    fireEvent.click(screen.getByTestId('practice-missed-button'));
    expect(openPractice).toHaveBeenCalledWith('l1');
  });

  it('Given my score, When results show, Then a tomorrow hook names the score to beat', () => {
    render(<EduStudentResults {...(allFound as never)} />);
    expect(screen.getByTestId('edu-student-tomorrow')).toHaveTextContent('eduLiveRoom.studentResults.tomorrowHook:{"score":20}');
  });

  it('Given the chest and the shop, When results show, Then both render in their quiet form', () => {
    render(<EduStudentResults {...(withMissed as never)} />);
    expect(chestProps.current?.quiet).toBe(true);
    expect(shopProps.current?.compact).toBe(true);
    expect(screen.queryByText('eduLiveRoom.studentResults.nextRound')).toBeNull();
  });

  it('Given a phone share sheet, When I share my round, Then friends get my rank and score with a public link, never my name, class or code', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    render(<EduStudentResults {...(withMissed as never)} />);
    fireEvent.click(screen.getByTestId('edu-student-share'));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const sent = JSON.stringify(share.mock.calls[0][0]);
    expect(share.mock.calls[0][0].text).toBe('eduLiveRoom.studentResults.shareText:{"rank":2,"total":2,"score":20}');
    expect(share.mock.calls[0][0].url).toBe(`${window.location.origin}/en/daily?utm_source=edu_student_share&utm_medium=referral`);
    for (const secret of ['Maya', 'Noa', 'Ms Cohen', 'AB12CD', 'room=']) expect(sent).not.toContain(secret);
    expect(capture).toHaveBeenCalledWith('edu_student_result_shared', expect.objectContaining({ method: 'native' }));
  });
});

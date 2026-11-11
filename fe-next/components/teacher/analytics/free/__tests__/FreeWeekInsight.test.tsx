import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { FreeClassInsightState } from '../useFreeClassInsight';

const pro = vi.hoisted(() => ({ value: { hasPro: false, loading: false, accessTrialExpires: null as string | null } }));
const insight = vi.hoisted(() => ({ state: { kind: 'idle' } as FreeClassInsightState, retry: vi.fn(), enabledSeen: [] as boolean[] }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }),
}));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro.value }));
vi.mock('../useFreeClassInsight', () => ({
  useFreeClassInsight: (_id: string, enabled: boolean) => {
    insight.enabledSeen.push(enabled);
    return { ...insight.state, retry: insight.retry };
  },
}));
vi.mock('@/lib/supabase/education/classrooms', () => ({
  getClassroomStudents: vi.fn(async () => ({ data: [{ student_id: 's1', roster_name: 'Noa', profiles: null }], error: null })),
}));
vi.mock('@/components/teacher/rounds/FreeGameHeadlineCard', () => ({ FreeGameHeadlineCard: () => <div data-testid="free-game-headline" /> }));
vi.mock('@/components/teacher/pro/ProInsightLink', () => ({
  ProInsightLink: ({ placement }: { placement: string }) => <a data-testid={`pro-insight-link-${placement}`} href="#">pro</a>,
}));

import { FreeWeekInsight } from '../FreeWeekInsight';

const counts = { needsHelp: 1, inactive: 1, notStarted: 0, steady: 2, thriving: 0 };
const hard = (word: string, missRate: number) => ({ word, display: word, attempts: 4, missed: 3, missRate, studentsMissing: 2, studentsAsked: 3 });

beforeEach(() => {
  pro.value = { hasPro: false, loading: false, accessTrialExpires: null };
  insight.state = { kind: 'idle' };
  insight.enabledSeen = [];
  vi.clearAllMocks();
});

describe('FreeWeekInsight', () => {
  it('given a Pro teacher, when the page renders, then nothing free is fetched or shown', () => {
    pro.value = { hasPro: true, loading: false, accessTrialExpires: null };
    const { container } = render(<FreeWeekInsight classroomId="c1" locale="en" />);
    expect(container).toBeEmptyDOMElement();
    expect(insight.enabledSeen.every((e) => e === false)).toBe(true);
  });

  it('given a teacher inside a live access trial, when rendered, then the free card stays away (the full page is open)', () => {
    pro.value = { hasPro: false, loading: false, accessTrialExpires: new Date(Date.now() + 86_400_000).toISOString() };
    const { container } = render(<FreeWeekInsight classroomId="c1" locale="en" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('given the entitlement is still loading, when rendered, then nothing shows and nothing is fetched', () => {
    pro.value = { hasPro: false, loading: true, accessTrialExpires: null };
    const { container } = render(<FreeWeekInsight classroomId="c1" locale="en" />);
    expect(container).toBeEmptyDOMElement();
    expect(insight.enabledSeen.every((e) => e === false)).toBe(true);
  });

  it('given a free teacher with this week of data, when rendered, then who needs help and the 3 hardest words show, with one Pro line', async () => {
    insight.state = {
      kind: 'free',
      insight: { pulse: { needsHelp: [{ id: 's1', status: 'needsHelp' }, { id: 's2', status: 'inactive' }], counts, totalStudents: 4 }, hardestWords: [hard('desk', 75), hard('lamp', 50), hard('door', 40)], sessionsThisWeek: 3 },
    };
    render(<FreeWeekInsight classroomId="c1" locale="en" />);
    expect(screen.getByTestId('free-week-insight')).toBeInTheDocument();
    expect(await screen.findByText('Noa')).toBeInTheDocument();
    expect(screen.getAllByTestId('free-week-needs-help-row')).toHaveLength(2);
    expect(screen.getAllByTestId('free-week-hard-word').map((n) => n.textContent)).toEqual([
      expect.stringContaining('desk'), expect.stringContaining('lamp'), expect.stringContaining('door'),
    ]);
    expect(screen.getAllByTestId(/pro-insight-link-/)).toHaveLength(1);
    expect(screen.getByTestId('pro-insight-link-analytics_week_insight')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open/i })).toBeNull();
  });

  it('given a free teacher with no games this week, when rendered, then one clear action starts a game for this class', () => {
    insight.state = { kind: 'free', insight: { pulse: { needsHelp: [], counts: { ...counts, needsHelp: 0, inactive: 0 }, totalStudents: 0 }, hardestWords: [], sessionsThisWeek: 0 } };
    render(<FreeWeekInsight classroomId="c1" locale="en" />);
    const start = screen.getByTestId('free-week-start-game');
    expect(start.getAttribute('href')).toBe('/en/education/classroom-game?classroomId=c1');
    expect(screen.queryByTestId('free-week-hard-word')).toBeNull();
    expect(screen.queryByTestId(/pro-insight-link-/)).toBeNull();
  });

  it('given the free teacher\'s second class (402), when rendered, then it falls back to the last-game headline, no weekly data', () => {
    insight.state = { kind: 'locked' };
    render(<FreeWeekInsight classroomId="c2" locale="en" />);
    expect(screen.getByTestId('free-game-headline')).toBeInTheDocument();
    expect(screen.queryByTestId('free-week-insight')).toBeNull();
  });

  it('given the read failed, when rendered, then an error with retry shows instead of an empty week', () => {
    insight.state = { kind: 'error' };
    render(<FreeWeekInsight classroomId="c1" locale="en" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'education.analytics.retry' }));
    expect(insight.retry).toHaveBeenCalled();
  });

  it.each([
    ['empty', { kind: 'free', insight: { pulse: { needsHelp: [], counts: { ...counts, needsHelp: 0, inactive: 0 }, totalStudents: 0 }, hardestWords: [], sessionsThisWeek: 0 } }],
    ['data', { kind: 'free', insight: { pulse: { needsHelp: [], counts, totalStudents: 3 }, hardestWords: [hard('storm', 75)], sessionsThisWeek: 2 } }],
    ['pending', { kind: 'loading' }],
    ['none', { kind: 'locked' }],
  ] as const)('given the week is %s, when rendered, then the page hears that status so the Pro lock can match it', (status, state) => {
    insight.state = state as FreeClassInsightState;
    const onStatus = vi.fn();
    render(<FreeWeekInsight classroomId="c1" locale="en" onStatus={onStatus} />);
    expect(onStatus).toHaveBeenLastCalledWith(status);
  });

  it('given a Pro teacher, when rendered, then the status is none and the entitlement load reads as pending', () => {
    const onStatus = vi.fn();
    pro.value = { hasPro: false, loading: true, accessTrialExpires: null };
    const { rerender } = render(<FreeWeekInsight classroomId="c1" locale="en" onStatus={onStatus} />);
    expect(onStatus).toHaveBeenLastCalledWith('pending');
    pro.value = { hasPro: true, loading: false, accessTrialExpires: null };
    rerender(<FreeWeekInsight classroomId="c1" locale="en" onStatus={onStatus} />);
    expect(onStatus).toHaveBeenLastCalledWith('none');
  });
});

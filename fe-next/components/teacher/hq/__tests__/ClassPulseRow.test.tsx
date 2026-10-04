import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { MasteryState } from '@/components/teacher/reports/useWordMasteryReport';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    language: 'en',
  }),
}));
const masteryState = vi.fn<() => MasteryState>();
vi.mock('@/components/teacher/reports/useWordMasteryReport', () => ({
  useWordMasteryReport: () => masteryState(),
  useRosterNames: () => ({ s1: 'Priya D', s2: 'Leo K', s3: 'Sam T' }),
}));

import { ClassPulseRow, summarizeHqPulse } from '../ClassPulseRow';

const totals = (sessions: number) => ({ students: 5, words: 10, sessions, attempts: 50, correct: 21, classAccuracy: 42 });
const hard = (display: string) => ({ word: display, display, attempts: 5, missed: 5, missRate: 100, studentsMissing: 5, studentsAsked: 5 });

const READY: MasteryState = {
  status: 'ready',
  report: { totals: totals(10), hardestWords: [hard('earth'), hard('house')], students: [], heatmap: { words: [], cells: {} } },
  insights: {
    goal: 80,
    students: [
      { studentId: 's1', attempts: 6, accuracy: 17, belowGoal: true, trend: 'steady', missedWords: [], masteredCount: 0, stuckCount: 2 },
      { studentId: 's2', attempts: 6, accuracy: 23, belowGoal: true, trend: 'down', missedWords: [], masteredCount: 0, stuckCount: 2 },
      { studentId: 's3', attempts: 6, accuracy: 90, belowGoal: false, trend: 'up', missedWords: [], masteredCount: 3, stuckCount: 0 },
    ],
    words: {},
    belowGoalCount: 2,
    masteredWords: 3,
    stuckWords: 1,
  },
};

describe('summarizeHqPulse', () => {
  it('Given a Pro report, Then it gives accuracy, students below goal and the hardest word', () => {
    expect(summarizeHqPulse(READY)).toEqual({ accuracy: 42, needHelp: 2, needHelpIds: ['s1', 's2'], hardest: 'earth', locked: false });
  });

  it('Given the free preview, Then it keeps accuracy and the hardest word but no student count', () => {
    const locked: MasteryState = { status: 'locked', preview: { totals: totals(4), hardestWords: [hard('travel')], hiddenWords: 3 } };
    expect(summarizeHqPulse(locked)).toEqual({ accuracy: 42, needHelp: null, needHelpIds: [], hardest: 'travel', locked: true });
  });

  it('Given no games yet, loading or an error, Then there is nothing to show', () => {
    expect(summarizeHqPulse({ status: 'loading' })).toBeNull();
    expect(summarizeHqPulse({ status: 'error' })).toBeNull();
    expect(
      summarizeHqPulse({ ...READY, report: { ...(READY as { report: never }).report, totals: totals(0) } } as MasteryState),
    ).toBeNull();
  });
});

describe('<ClassPulseRow>', () => {
  beforeEach(() => masteryState.mockReset());

  it('Given evidence, Then the pulse leads with accuracy, who needs help and the hardest word, and offers ONE action into the report', () => {
    masteryState.mockReturnValue(READY);
    render(<ClassPulseRow classroomId="c1" studentCount={5} />);
    const hero = screen.getByTestId('hq-class-pulse');
    expect(hero.tagName).not.toBe('A');
    expect(screen.getByTestId('hq-class-pulse-accuracy').textContent).toContain('42%');
    expect(screen.getByTestId('hq-class-pulse-need-help').textContent).toContain('eg2Rep.hq.needHelp:2');
    expect(screen.getByTestId('hq-class-pulse-names').textContent).toBe('Priya D, Leo K');
    expect(screen.getByTestId('hq-class-pulse-hardest').textContent).toContain('earth');
    const actions = within(hero).getAllByRole('link');
    expect(actions).toHaveLength(1);
    expect(actions[0]).toHaveAttribute('data-testid', 'hq-class-pulse-action');
    expect(actions[0].getAttribute('href')).toBe('/en/teacher/reports?classroomId=c1');
  });

  it('Given the free preview, Then it keeps accuracy and the hardest word and shows no student names', () => {
    masteryState.mockReturnValue({ status: 'locked', preview: { totals: totals(4), hardestWords: [hard('earth')], hiddenWords: 3 } });
    render(<ClassPulseRow classroomId="c1" studentCount={5} />);
    expect(screen.getByTestId('hq-class-pulse-accuracy').textContent).toContain('42%');
    expect(screen.getByTestId('hq-class-pulse-hardest').textContent).toContain('earth');
    expect(screen.queryByTestId('hq-class-pulse-names')).toBeNull();
    expect(screen.queryByTestId('hq-class-pulse-need-help')).toBeNull();
  });

  it('Given everyone at goal, Then it says so instead of a zero', () => {
    masteryState.mockReturnValue({
      ...READY,
      insights: { ...(READY as { insights: never }).insights, students: [], belowGoalCount: 0 },
    } as MasteryState);
    render(<ClassPulseRow classroomId="c1" studentCount={5} />);
    expect(screen.getByTestId('hq-class-pulse-need-help').textContent).toContain('eg2Rep.hq.allOnTrack');
  });

  it('Given no students, Then it renders nothing and never asks for the report', () => {
    render(<ClassPulseRow classroomId="c1" studentCount={0} />);
    expect(screen.queryByTestId('hq-class-pulse')).toBeNull();
    expect(masteryState).not.toHaveBeenCalled();
  });
});

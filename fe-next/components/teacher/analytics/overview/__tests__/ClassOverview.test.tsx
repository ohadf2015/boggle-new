import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClassOverview } from '../ClassOverview';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: 'ltr',
    t: (key: string, a?: unknown, b?: unknown) => {
      const params = (typeof a === 'object' ? a : b) as Record<string, unknown> | undefined;
      return params ? `${key}|${JSON.stringify(params)}` : key;
    },
  }),
}));

const analytics = {
  studentsNeedingHelp: 1, classAverageXp: 40, activeStudentsToday: 1, weeklyEngagement: 0, totalStudents: 4,
  commonMistakes: [{ word: 'desk', errorRate: 0.8, studentCount: 3 }],
  dailyActive: [0, 0, 0, 0, 0, 1, 2].map((count, i) => ({ day: `2026-11-0${i + 1}`, count })),
  students: [
    { id: 'h', status: 'needsHelp', accuracy: 0.3, attempts: 10, xp: 5, lastPractice: '2026-11-03', activeDays: 1 },
    { id: 'i', status: 'inactive', accuracy: null, attempts: 0, xp: 9, lastPractice: '2026-10-01', activeDays: 0 },
    { id: 'n', status: 'notStarted', accuracy: null, attempts: 0, xp: 0, lastPractice: null, activeDays: 0 },
    { id: 't', status: 'thriving', accuracy: 0.95, attempts: 30, xp: 90, lastPractice: '2026-11-03', activeDays: 4 },
  ],
};

vi.mock('../../useProClassAnalytics', () => ({
  useProClassAnalytics: () => ({ metrics: analytics, isLoading: false, error: null, refresh: vi.fn() }),
}));

vi.mock('@/lib/supabase/education/classrooms', () => ({
  getClassroomStudents: vi.fn().mockResolvedValue({
    data: [
      { student_id: 'h', profiles: { display_name: 'Hanna', username: 'Player_h' } },
      { student_id: 'i', profiles: { display_name: 'Ido', username: 'Player_i' } },
      { student_id: 'n', profiles: { display_name: 'Noa', username: 'Player_n' } },
      { student_id: 't', profiles: { display_name: 'Tal', username: 'Player_t' } },
    ],
    error: null,
  }),
}));

vi.mock('@/components/teacher/reports/StudentProgressReport', () => ({
  StudentProgressReport: ({ studentId }: { studentId: string }) => <div data-testid="drill-report">{studentId}</div>,
}));

const mastery = vi.hoisted(() => ({ state: { status: 'error' } as Record<string, unknown> }));
vi.mock('@/components/teacher/reports/useWordMasteryReport', () => ({
  useWordMasteryReport: () => mastery.state,
}));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: true }) }));
vi.mock('@/components/teacher/reports/MissedPracticeAction', () => ({
  MissedPracticeAction: ({ words, hero }: { words?: string[]; hero?: boolean }) => (
    <button type="button" data-testid="practice" data-hero={String(!!hero)} data-words={(words ?? []).join(',')} />
  ),
}));

const pulse = (id: string, status: string) => ({ id, status, accuracy: 0.5, attempts: 2, xp: 1, lastPractice: '2026-11-03', activeDays: 1 });
const baseline = { students: analytics.students, dailyActive: analytics.dailyActive, commonMistakes: analytics.commonMistakes };

afterEach(() => {
  Object.assign(analytics, baseline);
  mastery.state = { status: 'error' };
});

describe('ClassOverview, focused on who needs the teacher and which words', () => {
  const missed = { word: 'storm', display: 'storm', attempts: 4, missed: 3, missRate: 75, studentsMissing: 3, studentsAsked: 4 };

  it('given most statuses at zero, then one line lists only the others and still filters', async () => {
    analytics.students = [pulse('h', 'needsHelp'), pulse('t', 'thriving')] as never;
    render(<ClassOverview classroomId="c1" classroomName="5B" />);
    await screen.findAllByText('Hanna');
    expect(screen.getByTestId('overview-status-line')).toBeInTheDocument();
    expect(screen.getByTestId('status-needsHelp')).toBeInTheDocument();
    expect(screen.queryByTestId('status-steady')).toBeNull();
    fireEvent.click(screen.getByTestId('status-thriving'));
    expect(within(screen.getByTestId('overview-roster')).getByText('Tal')).toBeInTheDocument();
    expect(within(screen.getByTestId('overview-roster')).queryByText('Hanna')).toBeNull();
  });

  it('given no thriving student and an idle week, then rising stars and the activity chart are hidden', async () => {
    analytics.students = [pulse('h', 'needsHelp')] as never;
    analytics.dailyActive = analytics.dailyActive.map((d) => ({ ...d, count: 0 }));
    render(<ClassOverview classroomId="c1" classroomName="5B" />);
    await screen.findAllByText('Hanna');
    expect(screen.queryByTestId('overview-stars')).toBeNull();
    expect(screen.queryByTestId('overview-activity')).toBeNull();
  });

  it('given nobody needs attention, then that section is hidden and the words remain', async () => {
    analytics.students = [pulse('t', 'thriving')] as never;
    render(<ClassOverview classroomId="c1" classroomName="5B" />);
    await screen.findAllByText('Tal');
    expect(screen.queryByTestId('overview-attention')).toBeNull();
    expect(screen.getByText('desk')).toBeInTheDocument();
  });

  it('folds the full roster until a teacher asks for it', async () => {
    render(<ClassOverview classroomId="c1" classroomName="5B" />);
    await screen.findAllByText('Hanna');
    expect(screen.queryByTestId('overview-roster')).toBeNull();
    const fold = screen.getByTestId('overview-roster-fold') as HTMLDetailsElement;
    fold.open = true;
    fireEvent(fold, new Event('toggle'));
    expect(within(fold).getByText('Tal')).toBeInTheDocument();
  });

  it('given missed words on record, then practice is the one main action and assigns those words', async () => {
    mastery.state = { status: 'ready', report: { hardestWords: [missed] }, insights: null };
    render(<ClassOverview classroomId="c1" classroomName="5B" />);
    const practice = await screen.findByTestId('practice');
    expect(practice).toHaveAttribute('data-words', 'storm');
    expect(practice).toHaveAttribute('data-hero', 'true');
    expect(screen.getByText('storm')).toBeInTheDocument();
    expect(screen.queryByText('desk')).toBeNull();
    expect(screen.queryByTestId('class-focus-start')).toBeNull();
  });

  it('given no missed words on record, then starting a game is the main action, never practice on words the server would refuse', async () => {
    render(<ClassOverview classroomId="c1" classroomName="5B" />);
    expect(await screen.findByTestId('class-focus-start')).toHaveAttribute('href', '/en/education/classroom-game?classroomId=c1');
    expect(screen.queryByTestId('practice')).toBeNull();
  });
});

describe('ClassOverview', () => {
  it('shows a count per status', async () => {
    render(<ClassOverview classroomId="c1" classroomName="5B" />);
    await screen.findAllByText('Hanna');
    for (const s of ['needsHelp', 'inactive', 'notStarted', 'steady', 'thriving']) {
      expect(screen.getByTestId(`status-${s}`)).toBeInTheDocument();
    }
    expect(within(screen.getByTestId('status-needsHelp')).getByText('1')).toBeInTheDocument();
    expect(within(screen.getByTestId('status-steady')).getByText('0')).toBeInTheDocument();
  });

  it('lists attention students first with names, and rising stars apart', async () => {
    render(<ClassOverview classroomId="c1" classroomName="5B" />);
    const attention = await screen.findByTestId('overview-attention');
    expect(within(attention).getByText('Hanna')).toBeInTheDocument();
    expect(within(attention).getByText('Ido')).toBeInTheDocument();
    expect(within(attention).getByText('Noa')).toBeInTheDocument();
    expect(within(attention).queryByText('Tal')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('overview-stars')).getByText('Tal')).toBeInTheDocument();
  });

  it('filters the roster by clicking a status, and clicking again clears it', async () => {
    render(<ClassOverview classroomId="c1" classroomName="5B" />);
    await screen.findAllByText('Hanna');
    fireEvent.click(screen.getByTestId('status-thriving'));
    const roster = screen.getByTestId('overview-roster');
    expect(within(roster).getByText('Tal')).toBeInTheDocument();
    expect(within(roster).queryByText('Hanna')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('status-thriving'));
    expect(screen.queryByTestId('overview-roster')).toBeNull();
    expect(screen.getByTestId('overview-roster-fold')).toBeInTheDocument();
  });

  it('opens the student report in a drill-down on click', async () => {
    render(<ClassOverview classroomId="c1" classroomName="5B" />);
    fireEvent.click((await screen.findAllByRole('button', { name: /Hanna/ }))[0]);
    await waitFor(() => expect(screen.getByTestId('drill-report')).toHaveTextContent('h'));
  });

  it('shows the hardest words', async () => {
    render(<ClassOverview classroomId="c1" classroomName="5B" />);
    expect(await screen.findByText('desk')).toBeInTheDocument();
  });
});

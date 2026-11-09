import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HomeWeekChallenge } from '../HomeWeekChallenge';

const auth = { user: { id: 't1' } as { id: string } | null };
const hook = {
  assignments: [] as Array<Record<string, unknown>>,
  isLoading: false,
  error: null as string | null,
  createAssignment: vi.fn(async () => ({ success: true })),
};
const capture = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/hooks/useAssignments', () => ({ useAssignments: () => hook }));
vi.mock('@/lib/education/telemetryCore', () => ({ safeCapture: (...a: unknown[]) => capture(...a) }));
vi.mock('@/components/teacher/assignments/AssignmentCreatorDueDate', () => ({
  localDayPlus: (n: number) => (n === 0 ? '2026-11-09' : '2026-11-16'),
}));

const t = (key: string, p?: Record<string, string | number>) => (p ? `${key}:${JSON.stringify(p)}` : key);
const lessons = [
  { id: 'l1', name: 'Planets', language: 'en', classroom_id: 'c1', updated_at: '2026-11-01', words: ['orbit'] },
  { id: 'l2', name: 'Weather words', language: 'en', classroom_id: 'c1', updated_at: '2026-11-05', words: ['cloud'] },
];
const onPickList = vi.fn();
const view = (over: Partial<React.ComponentProps<typeof HomeWeekChallenge>> = {}) =>
  render(
    <HomeWeekChallenge classroomId="c1" classLanguage="en" lessons={lessons} preferredLessonId="l1" resultsHref="/en/teacher/reports?c=c1" onPickList={onPickList} language="en" t={t} {...over} />,
  );

const open = { id: 'a1', lesson_id: 'l1', due_date: '2026-11-16T00:00:00+00:00', created_at: '2026-11-09T10:00:00Z', completion_count: 2, student_count: 3, vocabulary_lessons: { name: 'Planets' } };

describe('HomeWeekChallenge', () => {
  beforeEach(() => {
    auth.user = { id: 't1' };
    hook.assignments = [];
    hook.isLoading = false;
    hook.error = null;
    hook.createAssignment = vi.fn(async () => ({ success: true }));
    capture.mockClear();
    onPickList.mockClear();
  });

  it('given an open challenge, then it shows the list, due date and how many finished, with results waiting', () => {
    hook.assignments = [open];
    view();
    expect(screen.getByTestId('home-challenge')).toHaveAttribute('data-state', 'open');
    expect(screen.getByTestId('home-challenge-list')).toHaveTextContent('Planets');
    expect(screen.getByTestId('home-challenge-finished')).toHaveTextContent('"done":2,"total":3');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
    expect(screen.getByTestId('home-challenge-results')).toHaveAttribute('href', '/en/teacher/reports?c=c1');
  });

  it('given a class with no students yet, then no 0-of-0 progress line', () => {
    hook.assignments = [{ ...open, completion_count: 0, student_count: 0 }];
    view();
    expect(screen.queryByTestId('home-challenge-finished')).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('given nobody finished yet, then there is no results link', () => {
    hook.assignments = [{ ...open, completion_count: 0 }];
    view();
    expect(screen.queryByTestId('home-challenge-results')).not.toBeInTheDocument();
  });

  it('given run again, then it assigns a different word list for 7 days in one tap', async () => {
    hook.assignments = [open];
    view();
    const btn = screen.getByTestId('home-challenge-run-again');
    expect(btn).toHaveTextContent('Weather words');
    fireEvent.click(btn);
    await waitFor(() => expect(hook.createAssignment).toHaveBeenCalledWith({
      classroom_id: 'c1', lesson_id: 'l2', teacher_id: 't1', assignment_type: 'practice', due_date: '2026-11-16',
    }));
    expect(capture).toHaveBeenCalledWith('edu_week_challenge_set', { surface: 'teacher_home', action: 'run_again', outcome: 'created', days: 7 });
  });

  it('given no other word list, then run again opens the list picker instead', () => {
    hook.assignments = [open];
    view({ lessons: [lessons[0]] });
    fireEvent.click(screen.getByTestId('home-challenge-run-again'));
    expect(onPickList).toHaveBeenCalled();
    expect(hook.createAssignment).not.toHaveBeenCalled();
  });

  it('given no challenge, then one tap opens the class list for the week', async () => {
    view();
    expect(screen.getByTestId('home-challenge')).toHaveAttribute('data-state', 'none');
    fireEvent.click(screen.getByTestId('home-challenge-start'));
    await waitFor(() => expect(hook.createAssignment).toHaveBeenCalledWith(expect.objectContaining({ lesson_id: 'l1', due_date: '2026-11-16' })));
  });

  it('given the free-plan limit, then the teacher is told why in an alert', async () => {
    hook.createAssignment = vi.fn(async () => ({ success: false, error: 'ASSIGNMENT_LIMIT_REACHED' }));
    view();
    fireEvent.click(screen.getByTestId('home-challenge-start'));
    expect(await screen.findByRole('alert')).toHaveTextContent('eduShell.home.challenge.limit');
  });

  it('given a closed challenge with finishers, then its results wait on Home', () => {
    hook.assignments = [{ ...open, due_date: '2026-11-03', completion_count: 1 }];
    view();
    expect(screen.getByTestId('home-challenge')).toHaveAttribute('data-state', 'ended');
    expect(screen.getByText('eduShell.home.challenge.lastTitle')).toBeInTheDocument();
  });

  it('renders nothing while loading, on error, or signed out', () => {
    hook.isLoading = true;
    const { container, rerender } = view();
    expect(container).toBeEmptyDOMElement();
    hook.isLoading = false;
    hook.error = 'boom';
    rerender(<HomeWeekChallenge classroomId="c1" classLanguage="en" lessons={lessons} preferredLessonId="l1" resultsHref="/r" onPickList={onPickList} language="en" t={t} />);
    expect(container).toBeEmptyDOMElement();
  });
});

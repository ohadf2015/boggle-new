import React from 'react';
import { pickLesson } from './__tests__/pickLesson';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AssignmentCreator from './AssignmentCreator';
import { useAssignments } from '@/hooks/useAssignments';
import type { Mock } from 'vitest';

// Mock hooks
vi.mock('@/hooks/useAssignments');
vi.mock('@/hooks/useVocabularyLesson', () => ({
  useLessons: vi.fn(() => ({
    lessons: [
      { id: 'lesson-1', name: 'Basic Vocabulary', words: [{word: 'test'}] },
      { id: 'lesson-2', name: 'Advanced Words', words: [{word: 'a'}, {word: 'b'}] },
    ],
    isLoading: false,
  })),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'teacher-1' },
    isLoading: false,
  })),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key: string) => key,
    language: 'en',
  })),
}));
// Free by default in every test; the cap-gate describe block overrides.
let proState = { hasPro: false, loading: false };
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: vi.fn(() => ({
    classrooms: [{ id: 'classroom-1', name: 'Period 1', language: 'en' }],
  })),
}));
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => proState,
}));
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

const renderCreator = () =>
  render(<AssignmentCreator classroomId="classroom-1" onComplete={vi.fn()} isOpen onClose={vi.fn()} />);

describe('AssignmentCreator — the disabled submit explains itself', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAssignments as Mock).mockReturnValue({ createAssignment: vi.fn() });
  });
  afterEach(() => vi.useRealTimers());

  it('marks the due date as required, for eyes and screen readers', () => {
    renderCreator();
    const marker = screen.getByTestId('due-date-required');
    expect(marker).toHaveTextContent('*');
    expect(screen.getByText('eduPro.assign.required')).toHaveClass('sr-only');
  });

  it('Given the dialog opens with a default due date, When no lesson is picked, Then the hint names only the lesson', () => {
    renderCreator();
    const hint = screen.getByTestId('assignment-submit-hint');
    expect(hint).toHaveTextContent('eduPro.assign.needLesson');
    expect(hint).not.toHaveTextContent('eduPro.assign.needLessonAndDate');
    const submit = screen.getByText('teacher.assignment.assignTo');
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-describedby', hint.id);

    pickLesson('lesson-1');
    expect(screen.queryByTestId('assignment-submit-hint')).not.toBeInTheDocument();
    expect(screen.getByText('teacher.assignment.assignTo')).not.toBeDisabled();
  });

  it('Given a lesson, When the teacher clears the due date, Then the hint names only the date', () => {
    renderCreator();
    pickLesson('lesson-1');
    const custom = screen.getByLabelText('teacher.assignment.customDate');
    fireEvent.change(custom, { target: { value: '2099-12-25' } });
    fireEvent.change(custom, { target: { value: '' } });
    expect(screen.getByTestId('assignment-submit-hint')).toHaveTextContent('eduPro.assign.needDate');
    expect(screen.getByText('teacher.assignment.assignTo')).toBeDisabled();
  });

  it('Given no lesson, When the teacher picks a date chip, Then the hint still asks only for the lesson', () => {
    renderCreator();
    fireEvent.click(screen.getByText('teacher.assignment.today'));
    expect(screen.getByTestId('assignment-submit-hint')).toHaveTextContent('eduPro.assign.needLesson');
  });

  it('Given it is 00:30 local time, When the teacher picks tomorrow, Then the due date is tomorrow on the local calendar, not UTC', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 2, 0, 30));
    const createAssignment = vi.fn().mockResolvedValue({ success: true });
    (useAssignments as Mock).mockReturnValue({ createAssignment });
    renderCreator();
    pickLesson('lesson-1');
    fireEvent.click(screen.getByText('teacher.assignment.tomorrow'));
    expect(document.querySelector('time')?.getAttribute('datetime')).toBe('2026-10-03');
    fireEvent.click(screen.getByText('teacher.assignment.assignTo'));
    await waitFor(() => expect(createAssignment).toHaveBeenCalled());
    expect(createAssignment.mock.calls[0][0].due_date).toBe('2026-10-03');
  });

  it('Given it is late on the 28th locally, When the dialog opens, Then the due date defaults to a week out on the local calendar', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 28, 23, 45));
    renderCreator();
    expect(document.querySelector('time')?.getAttribute('datetime')).toBe('2026-11-04');
    expect(screen.getByRole('button', { name: 'teacher.assignment.nextWeek' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('teacher.assignment.selectDate')).not.toBeInTheDocument();
  });
});

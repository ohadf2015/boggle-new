import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AssignmentCreator from './AssignmentCreator';
import { useAssignments } from '@/hooks/useAssignments';

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

const mockCreateAssignment = vi.fn();

const renderCreator = () =>
  render(<AssignmentCreator classroomId="classroom-1" onComplete={vi.fn()} isOpen onClose={vi.fn()} />);

describe('AssignmentCreator — the disabled submit explains itself', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAssignments as jest.Mock).mockReturnValue({ createAssignment: vi.fn() });
  });

  it('marks the due date as required, for eyes and screen readers', () => {
    renderCreator();
    const marker = screen.getByTestId('due-date-required');
    expect(marker).toHaveTextContent('*');
    expect(screen.getByText('eduPro.assign.required')).toHaveClass('sr-only');
  });

  it('names both missing fields, then only the one still missing', () => {
    renderCreator();
    const hint = screen.getByTestId('assignment-submit-hint');
    expect(hint).toHaveTextContent('eduPro.assign.needLessonAndDate');
    const submit = screen.getByText('teacher.assignment.create');
    expect(submit).toHaveAttribute('aria-describedby', hint.id);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'lesson-1' } });
    expect(screen.getByTestId('assignment-submit-hint')).toHaveTextContent('eduPro.assign.needDate');

    fireEvent.click(screen.getByText('teacher.assignment.selectDate'));
    fireEvent.click(screen.getByText('teacher.assignment.tomorrow'));
    expect(screen.queryByTestId('assignment-submit-hint')).not.toBeInTheDocument();
    expect(screen.getByText('teacher.assignment.create')).not.toBeDisabled();
  });

  it('asks only for the lesson once a date is picked first', () => {
    renderCreator();
    fireEvent.click(screen.getByText('teacher.assignment.selectDate'));
    fireEvent.click(screen.getByText('teacher.assignment.today'));
    expect(screen.getByTestId('assignment-submit-hint')).toHaveTextContent('eduPro.assign.needLesson');
  });

  it('picks "tomorrow" on the teacher\'s own calendar, not UTC', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 2, 0, 30));
    renderCreator();
    fireEvent.click(screen.getByText('teacher.assignment.selectDate'));
    fireEvent.click(screen.getByText('teacher.assignment.tomorrow'));
    expect(screen.getByText('2026-10-03')).toBeInTheDocument();
    vi.useRealTimers();
  });
});

import React from 'react';
import { pickLesson } from './__tests__/pickLesson';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import AssignmentCreator from './AssignmentCreator';
import { localDayPlus } from './AssignmentCreatorDueDate';
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
    t: (key: string, p?: Record<string, unknown>) => (p ? `${key}:${Object.values(p).join(',')}` : key),
    language: 'en',
  })),
}));
// Free by default in every test; the cap-gate describe block overrides.
let proState = { hasPro: false, loading: false };
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: vi.fn(() => ({
    classrooms: [{ id: 'classroom-1', name: 'Period 1', language: 'en', member_count: 5 }],
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

describe('AssignmentCreator — Wayground-order flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAssignments as Mock).mockReturnValue({ createAssignment: mockCreateAssignment });
    mockCreateAssignment.mockResolvedValue({ success: true });
  });

  it('asks for the word list first, then the mode, then the due date; who it goes to sits in the header', () => {
    renderCreator();
    const steps = screen.getAllByTestId('assignment-step').map((s) => s.getAttribute('data-step'));
    expect(steps).toEqual(['list', 'mode', 'due']);
    expect(screen.getByTestId('assignment-who').closest('[data-nb-dialog-header]')).not.toBeNull();
  });

  it('Given the dialog opens, Then Practice and Duel sit beside Word Craft in step 2 and the closed fold holds only word goals and the note', () => {
    renderCreator();
    const toggle = screen.getByTestId('assignment-advanced-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const modeStep = screen.getAllByTestId('assignment-step').find((st) => st.getAttribute('data-step') === 'mode')!;
    expect(within(modeStep).getByTestId('assignment-mode-wordcraft')).toBeVisible();
    expect(within(modeStep).getByTestId('assignment-mode-practice')).toBeVisible();
    expect(within(modeStep).getByTestId('assignment-mode-duel')).toBeVisible();
    expect(screen.getByTestId('assignment-mode-word-list')).not.toBeVisible();
    expect(screen.getByLabelText('teacher.assignment.instructionsLabel')).not.toBeVisible();

    fireEvent.click(toggle);
    expect(screen.getByTestId('assignment-mode-word-list')).toBeVisible();
    expect(screen.getByLabelText('teacher.assignment.instructionsLabel')).toBeVisible();
  });

  it('Given Practice is picked from step 2, Then the fold stays closed and the focus picker shows under step 2', () => {
    renderCreator();
    pickLesson('lesson-1');
    fireEvent.click(screen.getByTestId('assignment-mode-practice'));
    expect(screen.getByTestId('assignment-advanced-toggle')).toHaveAttribute('aria-expanded', 'false');
    const modeStep = screen.getAllByTestId('assignment-step').find((st) => st.getAttribute('data-step') === 'mode')!;
    expect(within(modeStep).getByRole('radiogroup', { name: 'teacher.assignment.focus.label' })).toBeVisible();
  });

  it('Given Duel is picked from step 2, Then the fold stays closed', () => {
    renderCreator();
    fireEvent.click(screen.getByTestId('assignment-mode-duel'));
    expect(screen.getByTestId('assignment-mode-duel')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('assignment-advanced-toggle')).toHaveAttribute('aria-expanded', 'false');
  });

  it('names the class and its size so the teacher knows who gets it', () => {
    renderCreator();
    expect(screen.getByTestId('assignment-who')).toHaveTextContent('Period 1');
    expect(screen.getByTestId('assignment-who')).toHaveTextContent('eg2Rep.assign.students:5');
  });

  it('Given the default due date, When the teacher picks a list and assigns, Then it is two taps and the due date is a week out', async () => {
    renderCreator();
    expect(screen.getByRole('button', { name: 'teacher.assignment.nextWeek' })).toHaveAttribute('aria-pressed', 'true');
    pickLesson('lesson-1');
    fireEvent.click(screen.getByText('teacher.assignment.assignTo:Period 1'));
    await waitFor(() => expect(mockCreateAssignment).toHaveBeenCalled());
    expect(mockCreateAssignment.mock.calls[0][0]).toMatchObject({
      lesson_id: 'lesson-1',
      classroom_id: 'classroom-1',
      due_date: localDayPlus(7),
    });
  });

  it('Given the due-date chips up front, When the teacher picks another chip, Then that date is saved', async () => {
    renderCreator();
    pickLesson('lesson-1');
    const chip = screen.getByRole('button', { name: 'teacher.assignment.tomorrow' });
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'teacher.assignment.nextWeek' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByText('teacher.assignment.assignTo:Period 1'));
    await waitFor(() => expect(mockCreateAssignment).toHaveBeenCalled());
    expect(mockCreateAssignment.mock.calls[0][0].due_date).toBe(localDayPlus(1));
  });

  it('Given the class is known, Then the submit button names it', () => {
    renderCreator();
    expect(screen.getByRole('button', { name: 'teacher.assignment.assignTo:Period 1' })).toBeInTheDocument();
    expect(screen.queryByText('teacher.assignment.create')).not.toBeInTheDocument();
  });

  it('Given the class already has a lesson, When the teacher picks that lesson, Then the already-assigned note shows, and not for a new lesson', () => {
    (useAssignments as Mock).mockReturnValue({
      createAssignment: mockCreateAssignment,
      assignments: [{ id: 'a1', classroom_id: 'classroom-1', lesson_id: 'lesson-1' }],
    });
    renderCreator();
    expect(screen.queryByTestId('assignment-already-note')).not.toBeInTheDocument();
    pickLesson('lesson-2');
    expect(screen.queryByTestId('assignment-already-note')).not.toBeInTheDocument();
    pickLesson('lesson-1');
    expect(screen.getByTestId('assignment-already-note')).toHaveTextContent('teacher.assignment.alreadyAssignedNote');
    expect(screen.getByTestId('assignment-already-note')).toHaveAttribute('role', 'status');
  });
});

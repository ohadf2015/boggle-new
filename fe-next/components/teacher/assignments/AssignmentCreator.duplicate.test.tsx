import React from 'react';
import { pickLesson } from './__tests__/pickLesson';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import AssignmentCreator from './AssignmentCreator';
import { useAssignments } from '@/hooks/useAssignments';
import type { Mock } from 'vitest';

vi.mock('@/hooks/useAssignments');
vi.mock('@/hooks/useVocabularyLesson', () => ({
  useLessons: vi.fn(() => ({
    lessons: [{ id: 'lesson-1', name: 'Basic Vocabulary', words: [{ word: 'test' }] }],
    isLoading: false,
    createLesson: vi.fn(),
  })),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'teacher-1' }, isLoading: false })),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key: string, p?: Record<string, unknown>) => (p ? `${key}:${Object.values(p).join(',')}` : key),
    language: 'en',
  })),
}));
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: vi.fn(() => ({
    classrooms: [{ id: 'classroom-1', name: 'Period 1', language: 'en', member_count: 5 }],
  })),
}));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: true, loading: false }) }));
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('react-hot-toast', () => ({ __esModule: true, default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: { children: React.ReactNode }) => <button {...props}>{children}</button>,
}));

const mockCreateAssignment = vi.fn();
const renderCreator = (onClose = vi.fn()) =>
  render(<AssignmentCreator classroomId="classroom-1" onComplete={vi.fn()} isOpen onClose={onClose} />);

function fillForm() {
  pickLesson('lesson-1');
  fireEvent.click(screen.getByRole('button', { name: 'teacher.assignment.nextWeek' }));
}

describe('AssignmentCreator — same lesson twice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAssignments as Mock).mockReturnValue({ createAssignment: mockCreateAssignment, assignments: [] });
  });

  it('a double-click creates the assignment once', async () => {
    let resolve: (v: unknown) => void = () => {};
    mockCreateAssignment.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderCreator();
    fillForm();
    const button = screen.getByText('teacher.assignment.create');
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    await act(async () => resolve({ success: true }));
    expect(mockCreateAssignment).toHaveBeenCalledTimes(1);
  });

  it('a re-assign tells the teacher the existing assignment was updated', async () => {
    mockCreateAssignment.mockResolvedValue({ success: true, alreadyAssigned: true });
    const onClose = vi.fn();
    renderCreator(onClose);
    fillForm();
    fireEvent.click(screen.getByText('teacher.assignment.create'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('teacher.assignment.alreadyAssignedUpdated'));
    expect(toast.error).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('a re-assign that could not update shows a friendly message, not the DB error', async () => {
    mockCreateAssignment.mockResolvedValue({ success: false, alreadyAssigned: true, error: 'already_assigned' });
    renderCreator();
    fillForm();
    fireEvent.click(screen.getByText('teacher.assignment.create'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('teacher.assignment.alreadyAssigned'));
  });

  it('a word-list homework with multi-word terms is refused with the localized message', async () => {
    renderCreator();
    fireEvent.click(screen.getByTestId('assignment-mode-word-list'));
    fireEvent.change(screen.getByTestId('word-list-goal'), { target: { value: 'cat, Rely on, dog, Hospice care' } });
    fireEvent.click(screen.getByRole('button', { name: 'teacher.assignment.nextWeek' }));
    fireEvent.click(screen.getByText('teacher.assignment.create'));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('teacher.lesson.singleWordsOnly:"Rely on", "Hospice care"'),
    );
    expect(mockCreateAssignment).not.toHaveBeenCalled();
  });
});

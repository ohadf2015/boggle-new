import React from 'react';
import { pickLesson } from './__tests__/pickLesson';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import AssignmentCreator from './AssignmentCreator';
import { useAssignments } from '@/hooks/useAssignments';
import { createWordGoalAssignment } from '@/lib/education/createWordGoalAssignment';
import type { Mock } from 'vitest';

vi.mock('@/hooks/useAssignments');
vi.mock('@/lib/education/createWordGoalAssignment', () => ({ createWordGoalAssignment: vi.fn() }));
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
// The browser thinks this teacher is under the cap (a second tab added rows, or Pro
// lapsed after the page loaded); the database is the one that says no.
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
const renderCreator = () =>
  render(<AssignmentCreator classroomId="classroom-1" onComplete={vi.fn()} isOpen onClose={vi.fn()} />);

describe('AssignmentCreator — the database refuses a fourth free assignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAssignments as Mock).mockReturnValue({ createAssignment: mockCreateAssignment, assignments: [] });
  });

  it('a lesson assignment shows the upsell instead of a raw error toast', async () => {
    mockCreateAssignment.mockResolvedValue({ success: false, error: 'ASSIGNMENT_LIMIT_REACHED' });
    renderCreator();
    pickLesson('lesson-1');
    fireEvent.click(screen.getByRole('button', { name: 'teacher.assignment.nextWeek' }));
    fireEvent.click(screen.getByText('teacher.assignment.create'));
    await waitFor(() => expect(screen.getByTestId('assignment-limit-upsell')).toBeInTheDocument());
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('a word-goal assignment shows the same upsell', async () => {
    (createWordGoalAssignment as Mock).mockResolvedValue({
      success: true,
      assigned: false,
      error: 'ASSIGNMENT_LIMIT_REACHED',
    });
    renderCreator();
    fireEvent.click(screen.getByTestId('assignment-mode-word-list'));
    fireEvent.change(screen.getByTestId('word-list-goal'), { target: { value: 'cat, dog, bird' } });
    fireEvent.click(screen.getByRole('button', { name: 'teacher.assignment.nextWeek' }));
    fireEvent.click(screen.getByText('teacher.assignment.create'));
    await waitFor(() => expect(screen.getByTestId('assignment-limit-upsell')).toBeInTheDocument());
    expect(toast.error).not.toHaveBeenCalled();
  });
});

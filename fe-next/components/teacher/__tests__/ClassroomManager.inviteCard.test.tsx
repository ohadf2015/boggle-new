/**
 * ClassroomManager — invite-hero card, empty-state wizard, create celebration.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/utils/confettiUtils', () => ({
  fireConfetti: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/components/teacher/ClassroomStudentList', () => ({
  default: () => <div data-testid="classroom-student-list" />,
}));

const classroomsState: {
  classrooms: Array<{
    id: string;
    name: string;
    language: string;
    teacher_id: string;
    join_code: string;
    created_at: string;
    member_count: number;
  }>;
} = { classrooms: [] };

const createClassroom = vi.fn();

vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({
    classrooms: classroomsState.classrooms,
    isLoading: false,
    createClassroom,
    updateClassroom: vi.fn(),
    deleteClassroom: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import toast from 'react-hot-toast';
import { fireConfetti } from '@/utils/confettiUtils';
import ClassroomManager from '../ClassroomManager';

describe('ClassroomManager invite + celebration UX', () => {
  beforeEach(() => {
    vi.mocked(fireConfetti).mockClear();
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    createClassroom.mockReset();
    classroomsState.classrooms = [];
  });

  it('shouldRenderSharedWizardWhenNoClassrooms', () => {
    // GIVEN — zero classrooms
    classroomsState.classrooms = [];

    // WHEN
    render(<ClassroomManager />);

    // THEN
    expect(screen.getByTestId('create-classroom-wizard')).toBeInTheDocument();
    expect(screen.getByText('teacher.classroom.wizard.step1.title')).toBeInTheDocument();
    expect(screen.getByText('teacher.classroom.wizard.step2.title')).toBeInTheDocument();
    expect(screen.getByText('teacher.classroom.wizard.step3.title')).toBeInTheDocument();
  });

  it('shouldMakeJoinCodeTheHeroOnClassroomCard', () => {
    // GIVEN
    classroomsState.classrooms = [
      {
        id: 'cls-1',
        name: 'Period 3',
        language: 'en',
        teacher_id: 'user1',
        join_code: 'ABC123',
        created_at: '2026-08-26',
        member_count: 0,
      },
    ];

    // WHEN
    render(<ClassroomManager />);

    // THEN
    expect(screen.getByTestId('invite-students-label')).toHaveTextContent(
      'teacher.classroom.inviteStudents'
    );
    const code = screen.getByTestId('classroom-join-code');
    expect(code).toHaveTextContent('ABC123');
    expect(code.className).toMatch(/text-3xl|text-4xl|text-5xl/);
    expect(screen.getByTestId('copy-join-code')).toBeInTheDocument();
    expect(screen.getByTestId('share-join-code')).toBeInTheDocument();
  });

  it('shouldCelebrateAndSurfaceCodeAfterClassroomCreation', async () => {
    // GIVEN
    const user = userEvent.setup();
    createClassroom.mockResolvedValue({
      success: true,
      data: {
        id: 'cls-new',
        name: 'Period 3',
        language: 'en',
        join_code: 'XYZ789',
      },
    });
    render(<ClassroomManager />);

    // WHEN — open create dialog (header button is first matching create CTA)
    await user.click(screen.getAllByRole('button', { name: /teacher\.classroom\.create/i })[0]);
    await user.type(screen.getByPlaceholderText('teacher.classroom.namePlaceholder'), 'Period 3');
    const dialogCreate = screen.getAllByRole('button', { name: /teacher\.classroom\.create/i }).at(-1);
    await user.click(dialogCreate!);

    // THEN
    await waitFor(() => {
      expect(fireConfetti).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalled();
    });
    expect(screen.getByTestId('classroom-created-banner')).toBeInTheDocument();
    expect(screen.getByTestId('classroom-created-banner')).toHaveTextContent('XYZ789');
  });
});

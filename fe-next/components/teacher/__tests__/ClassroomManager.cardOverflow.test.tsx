import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/components/teacher/ClassroomStudentList', () => ({
  default: () => <div data-testid="classroom-student-list" />,
}));

const classroomsState = {
  classrooms: [
    {
      id: 'cls-1',
      name: 'Year 7 English',
      language: 'en',
      teacher_id: 'user1',
      join_code: 'DECK01',
      created_at: '2026-09-15',
      member_count: 3,
    },
  ],
};

vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({
    classrooms: classroomsState.classrooms,
    isLoading: false,
    createClassroom: vi.fn(),
    updateClassroom: vi.fn(),
    deleteClassroom: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/components/teacher/hq/ClassroomCardActivity', () => ({
  ClassroomCardActivity: () => <div data-testid="card-activity" />,
}));

vi.mock('@/components/teacher/classroom/ClassAvatarStack', () => ({
  ClassAvatarStack: () => null,
}));

import ClassroomManager from '../ClassroomManager';

describe('ClassroomManager: invite actions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps invite actions off the card face and names them in its menu', async () => {
    render(<ClassroomManager />);
    expect(screen.queryByTestId('copy-join-code')).toBeNull();
    expect(screen.queryByTestId('share-join-code')).toBeNull();
    await userEvent.click(screen.getByTestId('classroom-card-menu'));
    expect(screen.getByTestId('classroom-join-code')).toHaveTextContent('DECK01');
    expect(screen.getByTestId('copy-join-code')).toHaveTextContent('teacher.classroom.copyCode');
    expect(screen.getByTestId('share-join-code')).toHaveTextContent('teacher.classroom.share');
  });
});

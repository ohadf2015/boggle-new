import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/teacher/home/RehearseWithBotsButton', () => ({
  RehearseWithBotsButton: ({ classroomId, source }: { classroomId?: string; source: string }) => (
    <button type="button" data-testid="rehearse-with-bots" data-classroom={classroomId} data-source={source} />
  ),
}));
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

describe('ClassroomManager — rehearse from the class card', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Given a class, Then its card offers a rehearsal for that class', () => {
    render(<ClassroomManager />);
    const rehearse = screen.getByTestId('rehearse-with-bots');
    expect(rehearse).toHaveAttribute('data-classroom', 'cls-1');
    expect(rehearse).toHaveAttribute('data-source', 'class');
  });
});

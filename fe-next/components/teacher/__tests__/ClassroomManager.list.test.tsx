/**
 * ClassroomManager — the Classes tab is a list of classes. Creating one is a
 * single path (the /teacher/classroom/new setup flow), never a dialog here.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/components/teacher/ClassroomStudentList', () => ({
  default: () => <div data-testid="classroom-student-list" />,
}));
vi.mock('@/components/teacher/hq/ClassroomCardActivity', () => ({
  ClassroomCardActivity: ({ classroomId }: { classroomId: string }) => (
    <div data-testid="card-activity">{classroomId}</div>
  ),
}));
vi.mock('@/components/teacher/hq/HqProjectorSheet', () => ({
  HqProjectorSheet: ({ classroom, onClose }: { classroom: { join_code: string }; onClose: () => void }) => (
    <div data-testid="projector-sheet">
      {classroom.join_code}
      <button type="button" onClick={onClose}>close-projector</button>
    </div>
  ),
}));
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({ hasPro: true, loading: false }),
}));
vi.mock('@/lib/education/useTeacherAccess', () => ({
  useTeacherAccess: () => ({ trial: null, isLoading: false }),
}));

type Row = { id: string; name: string; language: string; teacher_id: string; join_code: string; created_at: string; member_count: number };
const mk = (n: number, extra: Partial<Row> = {}): Row => ({
  id: `cls-${n}`,
  name: `Class ${n}`,
  language: 'en',
  teacher_id: 'user1',
  join_code: `CODE0${n}`,
  created_at: '2026-09-15',
  member_count: n,
  ...extra,
});
const state: { classrooms: Row[] } = { classrooms: [] };
const createClassroom = vi.fn();

vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({
    classrooms: state.classrooms,
    isLoading: false,
    createClassroom,
    updateClassroom: vi.fn(async () => ({ success: true })),
    deleteClassroom: vi.fn(async () => ({ success: true })),
    refresh: vi.fn(),
  }),
}));

import ClassroomManager from '../ClassroomManager';

const NEW_CLASS_HREF = '/en/teacher/classroom/new';

describe('ClassroomManager — class list', () => {
  beforeEach(() => {
    state.classrooms = [];
    createClassroom.mockReset();
  });

  describe('Given a teacher with no classes', () => {
    it('Then the empty state walks through the first class and links into the setup flow', () => {
      render(<ClassroomManager />);
      const empty = screen.getByTestId('classroom-empty-state');
      expect(within(empty).getByText('teacher.classroom.wizard.title')).toBeInTheDocument();
      expect(within(empty).getByText('teacher.classroom.wizard.step1.title')).toBeInTheDocument();
      expect(within(empty).getByText('teacher.classroom.wizard.step2.title')).toBeInTheDocument();
      expect(within(empty).getByText('teacher.classroom.wizard.step3.title')).toBeInTheDocument();
      expect(screen.getByTestId('classroom-empty-create')).toHaveAttribute('href', NEW_CLASS_HREF);
    });

    it('Then there is no create dialog on this page', async () => {
      const user = userEvent.setup();
      render(<ClassroomManager />);
      await user.click(screen.getByTestId('classroom-empty-create'));
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(createClassroom).not.toHaveBeenCalled();
    });
  });

  describe('Given classes exist', () => {
    beforeEach(() => {
      state.classrooms = [mk(1, { name: 'Period 3', join_code: 'ABC123', member_count: 0 })];
    });

    it('Then the top-row create control links to the setup flow', () => {
      render(<ClassroomManager heading={<h1>title</h1>} />);
      const row = screen.getByTestId('classroom-manager-toprow');
      expect(within(row).getByRole('link', { name: /teacher\.classroom\.create/ })).toHaveAttribute('href', NEW_CLASS_HREF);
    });

    it('Then each card carries name, roster count, big join code, and activity', () => {
      render(<ClassroomManager />);
      const card = screen.getByTestId('classroom-card');
      expect(within(card).getByText('Period 3')).toBeInTheDocument();
      expect(within(card).getByText('teacher.classrooms.students.noneYet')).toBeInTheDocument();
      const code = within(card).getByTestId('classroom-join-code');
      expect(code).toHaveTextContent('ABC123');
      expect(code.className).toMatch(/text-3xl|text-4xl/);
      expect(within(card).getByTestId('copy-join-code')).toBeInTheDocument();
      expect(within(card).getByTestId('card-activity')).toHaveTextContent('cls-1');
    });

    it('Then the card offers Start a game, Assign, and Report for that class', () => {
      render(<ClassroomManager />);
      expect(screen.getByTestId('classroom-card-start-game')).toHaveAttribute(
        'href',
        '/en/education/classroom-game?classroomId=cls-1',
      );
      expect(screen.getByTestId('classroom-card-assign')).toHaveAttribute(
        'href',
        '/en/teacher?classroomId=cls-1&assign=1',
      );
      expect(screen.getByTestId('classroom-card-report')).toHaveAttribute(
        'href',
        '/en/teacher/classroom/cls-1/analytics',
      );
    });

    it('When "show on projector" is tapped, Then the projector opens for that class and closes again', async () => {
      const user = userEvent.setup();
      render(<ClassroomManager />);
      expect(screen.queryByTestId('projector-sheet')).toBeNull();
      await user.click(screen.getByTestId('classroom-card-projector'));
      expect(screen.getByTestId('projector-sheet')).toHaveTextContent('ABC123');
      await user.click(screen.getByText('close-projector'));
      expect(screen.queryByTestId('projector-sheet')).toBeNull();
    });

    it('When rename is picked from the menu, Then an edit dialog opens seeded with the class', async () => {
      const user = userEvent.setup();
      render(<ClassroomManager />);
      await user.click(screen.getByTestId('classroom-card-menu'));
      await user.click(screen.getByRole('menuitem', { name: 'teacher.classroom.edit' }));
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByPlaceholderText('teacher.classroom.namePlaceholder')).toHaveValue('Period 3');
    });
  });
});

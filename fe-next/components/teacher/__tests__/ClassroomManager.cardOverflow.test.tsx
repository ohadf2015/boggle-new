/**
 * ClassroomManager — the invite actions must survive a narrow card.
 *
 * Measured live at 1280x800 with three classes and the shell's sidebar: the
 * grid gives each card ~300px, COPY CODE and SHARE sit in one non-wrapping
 * flex row, and the card carries `overflow-hidden` — so SHARE rendered as
 * "SHAR" with its right edge sliced off. jsdom cannot measure that, so what
 * this pins is the layout contract that prevents it. Copy and share are now
 * icon-only buttons beside the code, so the code plate is the part that gives
 * way (min-w-0) and the buttons keep their size.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

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

describe('ClassroomManager — invite actions in a narrow card', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps the code and its three icon actions on one row: the code plate gives way, the buttons never do', () => {
    render(<ClassroomManager />);

    const plate = screen.getByTestId('join-code-plate');
    expect(plate.className).toContain('min-w-0');
    expect(plate.className).toContain('flex-1');
    const row = plate.parentElement!;
    for (const id of ['copy-join-code', 'share-join-code']) {
      const button = screen.getByTestId(id);
      expect(row.contains(button)).toBe(true);
      expect(button.className).toContain('shrink-0');
    }
  });

  it('names each icon-only invite action for screen readers and on hover', () => {
    render(<ClassroomManager />);

    for (const [id, key] of [
      ['copy-join-code', 'teacher.classroom.copyCode'],
      ['share-join-code', 'teacher.classroom.share'],
    ]) {
      const button = screen.getByTestId(id);
      expect(button).toHaveAttribute('aria-label', expect.stringContaining(key));
      expect(button).toHaveAttribute('title', expect.stringContaining(key));
    }
  });
});

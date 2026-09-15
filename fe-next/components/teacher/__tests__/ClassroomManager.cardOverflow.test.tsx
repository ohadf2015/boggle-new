/**
 * ClassroomManager — the invite actions must survive a narrow card.
 *
 * Measured live at 1280x800 with three classes and the shell's sidebar: the
 * grid gives each card ~300px, COPY CODE and SHARE sit in one non-wrapping
 * flex row, and the card carries `overflow-hidden` — so SHARE rendered as
 * "SHAR" with its right edge sliced off. jsdom cannot measure that, so what
 * this pins is the layout contract that prevents it: the row is allowed to
 * wrap, and neither button may refuse to shrink below its content.
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

import ClassroomManager from '../ClassroomManager';

describe('ClassroomManager — invite actions in a narrow card', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stacks the copy/share row at every width', () => {
    // Measured, not assumed. Side by side, these two clipped or truncated at
    // BOTH real widths: ~300px per card in the desktop 3-column grid (SHARE
    // rendered as "SHAR", then "SH…"), and ~290px on a 390px phone where the
    // card is full-bleed ("COPY …"). There is no width in this layout where
    // both labels fit on one line, so a breakpoint — viewport or container —
    // would only decide which of the two ways to be unreadable. Stacking is
    // legible everywhere and the cards have the vertical room.
    render(<ClassroomManager />);

    const row = screen.getByTestId('copy-join-code').parentElement;
    expect(row).not.toBeNull();
    expect(row!.className).toContain('flex-col');
    expect(row!.className).not.toMatch(/flex-row/);
  });

  it('lets each invite button shrink below its own label width', () => {
    // `flex-1` alone does not permit shrinking past the content's min-content
    // size; without `min-w-0` the pair stays wider than the card and the
    // second button is the one that gets clipped.
    render(<ClassroomManager />);

    for (const id of ['copy-join-code', 'share-join-code']) {
      expect(screen.getByTestId(id).className).toContain('min-w-0');
    }
  });
});

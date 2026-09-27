/**
 * "Share to Google Classroom" on the classroom card.
 *
 * A teacher's real blocker is not creating the class — that measures 3 clicks — it is getting 28
 * children to type a six-character code. Their class already exists in Google Classroom and every
 * student is already signed in to it, so the shortest handoff is to post the join link straight to
 * that Stream.
 *
 * This must be a real anchor, not a button with an onClick: it navigates to Google's own dialog,
 * and a teacher should be able to middle-click or long-press it like any other link.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
// Faithful to the real t(key, fallback?, params?): it returns the copy and interpolates
// {{var}}/{var} at every return point. A key-only mock would make the title assertion below
// vacuous — it would pass on a component that never inserted the classroom name at all.
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    // Both call shapes are used in this codebase: t(key, fallback, params) and t(key, params).
    // Returning the params object as the string would render "[object Object]" and break the
    // whole component, so branch on the second argument's type.
    t: (
      k: string,
      second?: string | Record<string, string>,
      third?: Record<string, string>,
    ) => {
      const fallback = typeof second === 'string' ? second : undefined;
      const params = typeof second === 'object' && second !== null ? second : third;
      let out = fallback ?? k;
      for (const [key, value] of Object.entries(params ?? {})) {
        out = out.split(`{{${key}}}`).join(String(value)).split(`{${key}}`).join(String(value));
      }
      return out;
    },
    language: 'en',
  }),
}));
vi.mock('@/components/teacher/ClassroomStudentList', () => ({
  default: () => <div data-testid="classroom-student-list" />,
}));

const classroomsState: { classrooms: Array<Record<string, unknown>> } = { classrooms: [] };

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

const CLASSROOM = {
  id: 'c1',
  name: "Mrs O'Brien's 4B",
  language: 'en',
  teacher_id: 't1',
  join_code: 'ABC123',
  created_at: '2026-08-27T00:00:00Z',
  member_count: 0,
};

const shareLink = () =>
  screen.getByRole('link', { name: /Google Classroom/i }) as HTMLAnchorElement;

describe('ClassroomManager — share to Google Classroom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    classroomsState.classrooms = [CLASSROOM];
  });

  it('offers the share as a real link, not a button', () => {
    render(<ClassroomManager />);
    expect(shareLink().tagName).toBe('A');
  });

  it('sends the teacher to Google\'s own share dialog', () => {
    render(<ClassroomManager />);
    const url = new URL(shareLink().href);
    expect(url.origin + url.pathname).toBe('https://classroom.google.com/share');
  });

  it('shares the student join link for this classroom, code and all', () => {
    render(<ClassroomManager />);
    const shared = new URL(new URL(shareLink().href).searchParams.get('url')!);
    expect(shared.pathname).toContain('/join/ABC123');
  });

  it('opens in a new tab without handing Google our referrer window', () => {
    render(<ClassroomManager />);
    const a = shareLink();
    expect(a.target).toBe('_blank');
    expect(a.rel).toContain('noopener');
  });

  it('titles the post with the classroom name, apostrophe intact', () => {
    render(<ClassroomManager />);
    expect(new URL(shareLink().href).searchParams.get('title')).toContain("Mrs O'Brien's 4B");
  });

  it('does not render when there is no classroom to share', () => {
    classroomsState.classrooms = [];
    render(<ClassroomManager />);
    expect(screen.queryByRole('link', { name: /Google Classroom/i })).toBeNull();
  });
});

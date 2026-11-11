import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const push = vi.fn();
const classes = vi.hoisted(() => ({ list: [{ id: 'c1', name: 'Room 4', join_code: 'KITE43', language: 'en', member_count: 2 }] as unknown[], error: null as string | null, refresh: vi.fn() }));
const confirm = vi.hoisted(() => ({ open: false, onConfirm: null as null | (() => void) }));
const fetchMock = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/components/education/TeacherGate', () => ({ TeacherGate: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/education/shell/EducationShell', () => ({ EducationShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/ui/ConfirmationDialog', () => ({
  ConfirmationDialog: (p: { open: boolean; onConfirm: () => void }) => {
    confirm.open = p.open;
    confirm.onConfirm = p.onConfirm;
    return null;
  },
}));
vi.mock('@/hooks/useClassroom', () => ({ useClassrooms: () => ({ classrooms: classes.list, isLoading: false, error: classes.error, refresh: classes.refresh }) }));
vi.mock('@/hooks/useAssignments', () => ({ useAssignments: () => ({ assignments: [], isLoading: false }) }));
vi.mock('@/hooks/useVocabularyLesson', () => ({ useLessons: () => ({ lessons: [], isLoading: false }) }));
vi.mock('@/components/teacher/home/HomeRosterLive', () => ({ useHomeRoster: () => ({ rows: [], failed: false }) }));
vi.mock('@/components/teacher/home/HomeClassRoster', () => ({ HomeClassRoster: () => <div data-testid="roster" /> }));
vi.mock('@/components/teacher/home/useLastClassGame', () => ({ useLastClassGame: () => ({ status: 'ready', game: null }) }));
vi.mock('@/components/teacher/home/HomeShareSheet', () => ({ HomeShareSheet: (p: { open: boolean }) => (p.open ? <div data-testid="share-sheet" /> : null) }));
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: fetchMock }));

import ClassPageClient from '../PageClient';

afterEach(() => {
  cleanup();
  classes.list = [{ id: 'c1', name: 'Room 4', join_code: 'KITE43', language: 'en', member_count: 2 }];
  classes.error = null;
});

describe('Class page', () => {
  it('Given a teacher opens a class, Then it names the class with its code, a way back, the roster, and Start a game', () => {
    render(<ClassPageClient classroomId="c1" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Room 4');
    expect(screen.getByTestId('class-page-code')).toHaveTextContent('KITE43');
    expect(screen.getByRole('link', { name: /education.analytics.backToClassroom/ })).toHaveAttribute('href', '/en/teacher/classroom');
    expect(screen.getByTestId('roster')).toBeInTheDocument();
    expect(screen.getByTestId('class-page-start')).toHaveAttribute('href', '/en/education/classroom-game?classroomId=c1');
  });

  it('When Share is tapped, Then the share sheet opens', () => {
    render(<ClassPageClient classroomId="c1" />);
    fireEvent.click(screen.getByTestId('class-page-share'));
    expect(screen.getByTestId('share-sheet')).toBeInTheDocument();
  });

  it('Given the danger zone, Then delete stays the one red action and runs only after the confirm', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    render(<ClassPageClient classroomId="c1" />);
    const del = screen.getByTestId('delete-class-affordance');
    expect(del.className).toMatch(/(^|\s)bg-neo-red(\s|$)/);
    expect(del.className).toMatch(/border-neo-black/);
    expect(confirm.open).toBe(false);
    fireEvent.click(del);
    expect(confirm.open).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    await confirm.onConfirm?.();
    expect(fetchMock).toHaveBeenCalledWith('/api/education/classroom/c1', expect.objectContaining({ method: 'DELETE' }));
  });

  it('Given a class id the teacher does not have, Then it says the class was not found and links back to the classes', () => {
    classes.list = [];
    render(<ClassPageClient classroomId="nope" />);
    expect(screen.getByRole('alert')).toHaveTextContent('education.classroomGame.classroomNotFound');
    expect(screen.queryByTestId('delete-class-affordance')).toBeNull();
  });

  it('Given the class list fails to load, Then it says so with a retry instead of claiming the class is gone', () => {
    classes.list = [];
    classes.error = 'Failed to load classrooms';
    render(<ClassPageClient classroomId="c1" />);
    expect(screen.getByRole('alert')).toHaveTextContent('education.errors.serverUnavailable');
    expect(screen.queryByText('education.classroomGame.classroomNotFound')).toBeNull();
    fireEvent.click(screen.getByTestId('class-page-retry'));
    expect(classes.refresh).toHaveBeenCalledTimes(1);
  });
});

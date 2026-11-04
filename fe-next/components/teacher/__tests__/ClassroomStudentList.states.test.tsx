import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    language: 'en',
  }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/Avatar', () => ({ default: () => <div data-testid="avatar" /> }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div>loading</div> }));
vi.mock('@/components/ui/ConfirmationDialog', () => ({
  ConfirmationDialog: ({ open, title, confirmText, onConfirm }: { open: boolean; title?: string; confirmText?: string; onConfirm: () => void }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <button type="button" onClick={onConfirm}>{confirmText}</button>
      </div>
    ) : null,
}));

const { mockGetClassroomStudents, mockFetch } = vi.hoisted(() => ({ mockGetClassroomStudents: vi.fn(), mockFetch: vi.fn() }));
vi.mock('@/lib/supabase/education', () => ({
  getClassroomStudents: (...a: unknown[]) => mockGetClassroomStudents(...a),
  setStudentLevel: vi.fn(),
}));
vi.mock('@/components/teacher/classroom/InviteStudentsCta', () => ({
  InviteStudentsCta: ({ joinCode }: { joinCode: string }) => <div data-testid="invite-cta">{joinCode}</div>,
}));
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: (...a: unknown[]) => mockFetch(...a) }));

import toast from 'react-hot-toast';
import ClassroomStudentList from '../ClassroomStudentList';

const roster = [
  { id: 'm1', student_id: 's1', classroom_id: 'c1', joined_at: new Date().toISOString(), level: 'core', profiles: { display_name: 'Ada' } },
  { id: 'm2', student_id: 's2', classroom_id: 'c1', joined_at: new Date().toISOString(), level: 'core', profiles: { display_name: 'Ben' } },
];

describe('ClassroomStudentList: roster states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Given an empty class, Then adding students starts from the join code', async () => {
    mockGetClassroomStudents.mockResolvedValue({ data: [], error: null });
    render(<ClassroomStudentList classroomId="c1" joinCode="ABC123" />);
    expect(await screen.findByTestId('invite-cta')).toHaveTextContent('ABC123');
  });

  it('Given the roster fails to load, Then the teacher can retry and see the students', async () => {
    mockGetClassroomStudents
      .mockResolvedValueOnce({ data: [], error: { message: 'down' } })
      .mockResolvedValueOnce({ data: roster, error: null });
    render(<ClassroomStudentList classroomId="c1" joinCode="ABC123" />);
    expect(await screen.findByText('teacher.classrooms.students.error')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(mockGetClassroomStudents).toHaveBeenCalledTimes(2);
  });

  it('Given the last student is removed, Then the class shows how to add students again', async () => {
    mockGetClassroomStudents.mockResolvedValue({ data: [roster[0]], error: null });
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    render(<ClassroomStudentList classroomId="c1" joinCode="ABC123" />);
    await screen.findByText('Ada');
    fireEvent.click(screen.getByRole('button', { name: 'eduLiveRoom.lobby.removeStudent:Ada' }));
    const dialog = await screen.findByRole('dialog', { name: 'eduLiveRoom.lobby.removeConfirmTitle:Ada' });
    fireEvent.click(dialog.querySelector('button') as HTMLButtonElement);
    await waitFor(() => expect(screen.getByTestId('invite-cta')).toBeInTheDocument());
    expect(toast.error).not.toHaveBeenCalled();
  });
});

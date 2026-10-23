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
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: (...a: unknown[]) => mockFetch(...a) }));

import toast from 'react-hot-toast';
import ClassroomStudentList from '../ClassroomStudentList';

const roster = [
  { id: 'm1', student_id: 's1', classroom_id: 'c1', joined_at: new Date().toISOString(), level: 'core', profiles: { display_name: 'Ada' } },
  { id: 'm2', student_id: 's2', classroom_id: 'c1', joined_at: new Date().toISOString(), level: 'core', profiles: { display_name: 'Ben' } },
];

async function removeAda() {
  render(<ClassroomStudentList classroomId="c1" joinCode="ABC123" />);
  await screen.findByText('Ada');
  fireEvent.click(screen.getByRole('button', { name: 'eduLiveRoom.lobby.removeStudent:Ada' }));
  const dialog = await screen.findByRole('dialog', { name: 'eduLiveRoom.lobby.removeConfirmTitle:Ada' });
  fireEvent.click(dialog.querySelector('button') as HTMLButtonElement);
}

describe('ClassroomStudentList: roster remove', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClassroomStudents.mockResolvedValue({ data: roster, error: null });
  });

  it('Given a confirmed remove, Then the server drops that membership and the row leaves the roster', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await removeAda();
    await waitFor(() => expect(screen.queryByText('Ada')).toBeNull());
    expect(mockFetch).toHaveBeenCalledWith('/api/education/classroom/c1/members/s1', { method: 'DELETE' });
    expect(screen.getByText('Ben')).toBeInTheDocument();
  });

  it('Given the server refuses, Then the student stays and the teacher is told', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ ok: false }), { status: 500 }));
    await removeAda();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('eduLiveRoom.lobby.removeFailed'));
    expect(screen.getByText('Ada')).toBeInTheDocument();
  });

  it('Given no confirmation, Then nothing is removed', async () => {
    render(<ClassroomStudentList classroomId="c1" joinCode="ABC123" />);
    await screen.findByText('Ada');
    fireEvent.click(screen.getByRole('button', { name: 'eduLiveRoom.lobby.removeStudent:Ada' }));
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

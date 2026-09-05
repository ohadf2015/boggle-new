import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, string>) => (p ? `${k}:${Object.values(p).join(',')}` : k), language: 'en' }),
}));
const fetchWithAuth = vi.fn();
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: (...a: unknown[]) => fetchWithAuth(...a) }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { TeacherProGrantPanel } from '../TeacherProGrantPanel';

const listResponse = (rows: unknown[]) => ({ ok: true, json: async () => ({ ok: true, rows }) });

describe('TeacherProGrantPanel', () => {
  beforeEach(() => { fetchWithAuth.mockReset(); });

  it('lists existing grants with their status', async () => {
    fetchWithAuth.mockResolvedValue(listResponse([
      { id: 'g1', email: 'tori@school.org', full_name: 'Tori', status: 'active', expires_at: '2027-09-05T00:00:00Z', days: 365, applied_at: 'x', revoked_at: null, user_id: 'u1', email_sent_at: 'x' },
      { id: 'g2', email: 'new@school.org', full_name: 'Sam', status: 'pending_signup', expires_at: '2027-09-05T00:00:00Z', days: 365, applied_at: null, revoked_at: null, user_id: null, email_sent_at: null },
    ]));
    render(<TeacherProGrantPanel />);
    expect(await screen.findByText('tori@school.org')).toBeInTheDocument();
    expect(screen.getByText('admin.teacherPro.status.active')).toBeInTheDocument();
    expect(screen.getByText('admin.teacherPro.status.pending_signup')).toBeInTheDocument();
  });

  it('grants a year of Pro by email with a personal note and shows the outcome', async () => {
    fetchWithAuth
      .mockResolvedValueOnce(listResponse([]))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, status: 'active', emailSent: true, expiresAt: '2027-09-05T00:00:00Z', fullName: 'Tori', email: 'tori@school.org' }) })
      .mockResolvedValueOnce(listResponse([]));
    render(<TeacherProGrantPanel />);
    await screen.findByTestId('teacher-pro-grant-form');

    fireEvent.change(screen.getByLabelText('admin.teacherPro.form.email'), { target: { value: 'Tori@school.org' } });
    fireEvent.change(screen.getByLabelText('admin.teacherPro.form.note'), { target: { value: 'Sorry about Thursday.' } });
    fireEvent.click(screen.getByRole('button', { name: 'admin.teacherPro.form.submit' }));

    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith('/api/admin/teacher-pro', expect.objectContaining({ method: 'POST' })));
    const call = fetchWithAuth.mock.calls.find((c) => (c[1] as any)?.method === 'POST')!;
    const body = JSON.parse((call[1] as any).body);
    expect(body).toMatchObject({ email: 'Tori@school.org', days: 365, note: 'Sorry about Thursday.' });
    expect(await screen.findByTestId('teacher-pro-grant-result')).toHaveTextContent('admin.teacherPro.result.active');
  });

  it('explains a 409 (already paying) instead of a generic failure', async () => {
    fetchWithAuth
      .mockResolvedValueOnce(listResponse([]))
      .mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ ok: false, error: 'already_paid' }) });
    render(<TeacherProGrantPanel />);
    await screen.findByTestId('teacher-pro-grant-form');
    fireEvent.change(screen.getByLabelText('admin.teacherPro.form.email'), { target: { value: 'paid@school.org' } });
    fireEvent.click(screen.getByRole('button', { name: 'admin.teacherPro.form.submit' }));
    expect(await screen.findByText('admin.teacherPro.error.already_paid')).toBeInTheDocument();
  });

  it('shows a live preview of the email the teacher will receive', async () => {
    fetchWithAuth.mockResolvedValue(listResponse([]));
    render(<TeacherProGrantPanel />);
    await screen.findByTestId('teacher-pro-grant-form');
    fireEvent.change(screen.getByLabelText('admin.teacherPro.form.fullName'), { target: { value: 'Tori Plant' } });
    fireEvent.click(screen.getByRole('button', { name: 'admin.teacherPro.form.preview' }));
    const frame = await screen.findByTitle('admin.teacherPro.form.previewTitle');
    expect(frame.getAttribute('srcdoc')).toContain('Tori Plant');
  });
});

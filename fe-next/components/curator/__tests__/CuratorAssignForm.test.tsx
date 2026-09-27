import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } },
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...rest }: { children: React.ReactNode }) => <button {...rest}>{children}</button>,
}));

import { CuratorAssignForm } from '../CuratorAssignForm';

const uid = '537a9da1-baee-4a94-b302-dbc97c9a16c2';

beforeEach(() => {
  toast.success.mockClear();
  toast.error.mockClear();
});

describe('CuratorAssignForm', () => {
  it('posts the assignment and reports success', async () => {
    const onAssigned = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ ok: true }) } as Response);
    render(<CuratorAssignForm onAssigned={onAssigned} />);

    fireEvent.change(screen.getByTestId('assign-user-id'), { target: { value: uid } });
    fireEvent.change(screen.getByTestId('assign-language'), { target: { value: 'he' } });
    fireEvent.click(screen.getByText('curator.admin.assign.submit'));

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    const call = fetchSpy.mock.calls.find((c) => String(c[0]).includes('/api/admin/curators'));
    const body = JSON.parse((call![1] as RequestInit).body as string);
    expect(body).toMatchObject({ userId: uid, language: 'he' });
    expect(onAssigned).toHaveBeenCalled();
  });

  it('reports an error when the assignment fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, json: async () => ({ error: 'invalid_user' }) } as Response);
    render(<CuratorAssignForm />);
    fireEvent.change(screen.getByTestId('assign-user-id'), { target: { value: 'bad' } });
    fireEvent.click(screen.getByText('curator.admin.assign.submit'));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});

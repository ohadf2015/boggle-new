import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k),
    language: 'en',
    dir: 'ltr',
  }),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } },
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

import { CuratorProposalsInbox } from '../CuratorProposalsInbox';

const payload = {
  proposals: [
    { id: 'p1', curator_id: 'c1', language: 'he', kind: 'word_approve', target_ref: 'שלום', payload: {} },
    { id: 'p2', curator_id: 'c1', language: 'he', kind: 'puzzle_verdict', target_ref: 'he-o-1', payload: { verdict: 'bad' } },
  ],
};

beforeEach(() => {
  toast.success.mockClear();
  toast.error.mockClear();
});

function mockFetch(actionOk = true) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url);
    if (u.includes('/api/admin/curator-proposals') && (!init || init.method !== 'POST')) {
      return { ok: true, json: async () => payload } as Response;
    }
    return { ok: actionOk, json: async () => ({ ok: actionOk }) } as Response;
  });
}

describe('CuratorProposalsInbox', () => {
  it('lists pending proposals with their kind + target', async () => {
    mockFetch();
    render(<CuratorProposalsInbox />);
    await waitFor(() => expect(screen.getByText('שלום')).toBeTruthy());
    expect(screen.getByText('curator.admin.inbox.kind.word_approve')).toBeTruthy();
    expect(screen.getAllByTestId('proposal-row')).toHaveLength(2);
  });

  it('shows the empty state when nothing is pending', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ proposals: [] }) } as Response);
    render(<CuratorProposalsInbox />);
    await waitFor(() => expect(screen.getByText('curator.admin.inbox.empty')).toBeTruthy());
  });

  it('approves a proposal (POST ratify) and removes the row', async () => {
    const fetchSpy = mockFetch(true);
    render(<CuratorProposalsInbox />);
    await waitFor(() => expect(screen.getByText('שלום')).toBeTruthy());
    fireEvent.click(screen.getAllByText('curator.admin.inbox.ratify')[0]);
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    const post = fetchSpy.mock.calls.find(
      (c) => String(c[0]).includes('/p1/ratify') && (c[1] as RequestInit)?.method === 'POST'
    );
    expect(post).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('שלום')).toBeNull());
  });

  it('rejects a proposal with decision=reject', async () => {
    const fetchSpy = mockFetch(true);
    render(<CuratorProposalsInbox />);
    await waitFor(() => expect(screen.getByText('שלום')).toBeTruthy());
    fireEvent.click(screen.getAllByText('curator.admin.inbox.reject')[0]);
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    const post = fetchSpy.mock.calls.find((c) => String(c[0]).includes('/p1/ratify') && (c[1] as RequestInit)?.method === 'POST');
    const body = JSON.parse((post![1] as RequestInit).body as string);
    expect(body.decision).toBe('reject');
  });

  it('toasts an error when the action fails', async () => {
    mockFetch(false);
    render(<CuratorProposalsInbox />);
    await waitFor(() => expect(screen.getByText('שלום')).toBeTruthy());
    fireEvent.click(screen.getAllByText('curator.admin.inbox.ratify')[0]);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});

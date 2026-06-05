import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k),
    language: 'he',
    dir: 'rtl',
  }),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } },
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

import { CuratorInvalidWords } from '../CuratorInvalidWords';

const wordsPayload = {
  words: [
    { id: '1', word: 'זוז', submission_count: 4, reason: 'not_in_dictionary' },
    { id: '2', word: 'חיעך', submission_count: 2, reason: 'not_in_dictionary' },
  ],
};

beforeEach(() => {
  toast.success.mockClear();
  toast.error.mockClear();
});

function mockFetch(proposeOk = true) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
    const u = String(url);
    if (u.includes('/api/curator/invalid-words')) {
      return { ok: true, json: async () => wordsPayload } as Response;
    }
    return { ok: proposeOk, json: async () => ({ ok: proposeOk, id: 'p1' }) } as Response;
  });
}

describe('CuratorInvalidWords', () => {
  it('loads and lists rejected words for the language', async () => {
    mockFetch();
    render(<CuratorInvalidWords language="he" />);
    await waitFor(() => expect(screen.getByText('זוז')).toBeTruthy());
    expect(screen.getByText('חיעך')).toBeTruthy();
    expect(screen.getAllByTestId('curator-word-row')).toHaveLength(2);
  });

  it('shows the empty state when there is nothing to review', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ words: [] }) } as Response);
    render(<CuratorInvalidWords language="he" />);
    await waitFor(() => expect(screen.getByText('curator.invalidWords.empty')).toBeTruthy());
  });

  it('proposes approval, posts the right payload, and removes the row on success', async () => {
    const fetchSpy = mockFetch(true);
    render(<CuratorInvalidWords language="he" />);
    await waitFor(() => expect(screen.getByText('זוז')).toBeTruthy());

    fireEvent.click(screen.getAllByText('curator.invalidWords.approve')[0]);

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    // the POST carried the proposal
    const postCall = fetchSpy.mock.calls.find((c) => String(c[0]).includes('/api/curator/propose'));
    expect(postCall).toBeTruthy();
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body).toMatchObject({ kind: 'word_approve', language: 'he', targetRef: 'זוז' });
    // row removed
    await waitFor(() => expect(screen.queryByText('זוז')).toBeNull());
  });

  it('toasts an error when the proposal fails', async () => {
    mockFetch(false);
    render(<CuratorInvalidWords language="he" />);
    await waitFor(() => expect(screen.getByText('זוז')).toBeTruthy());
    fireEvent.click(screen.getAllByText('curator.invalidWords.approve')[0]);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

const fetchWithAuth = vi.fn();
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: (...a: unknown[]) => fetchWithAuth(...a) }));
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, fb?: string | Record<string, string | number>, params?: Record<string, string | number>) =>
      typeof fb === 'string' ? fb.replace(/\{(\w+)\}/g, (_, n: string) => String(params?.[n] ?? `{${n}}`)) : k,
    language: 'en',
  }),
}));

import { AdminNotificationBell } from '../AdminNotificationBell';

const item = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  kind: 'pro_paid',
  severity: 'high',
  title: 'New paying Pro customer',
  body: 'a@b.com',
  link: '/admin/teacher-pro',
  read_at: null,
  created_at: new Date(Date.now() - 5 * 60_000).toISOString(),
  ...over,
});

const feed = (body: unknown) => fetchWithAuth.mockResolvedValue({ ok: true, json: async () => body });

beforeEach(() => {
  fetchWithAuth.mockReset();
  push.mockReset();
});
afterEach(() => vi.useRealTimers());

describe('AdminNotificationBell', () => {
  it('shows the unread count on the bell', async () => {
    feed({ items: [item('1')], unread: 4, available: true });
    render(<AdminNotificationBell />);
    expect(await screen.findByText('4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
  });

  it('renders nothing while the feed is unavailable (migration pending) or the request fails', async () => {
    feed({ items: [], unread: 0, available: false });
    const { container } = render(<AdminNotificationBell />);
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it('lists notifications when opened, newest first as served, with a quiet empty state', async () => {
    feed({ items: [item('1'), item('2', { title: 'School lead: Oak', severity: 'normal', read_at: 'x' })], unread: 1, available: true });
    render(<AdminNotificationBell />);
    fireEvent.click(await screen.findByRole('button', { name: /notifications/i }));
    expect(screen.getByText('New paying Pro customer')).toBeInTheDocument();
    expect(screen.getByText('School lead: Oak')).toBeInTheDocument();
    expect(screen.getAllByText(/5 min/)).toHaveLength(2);
  });

  it('says so when there is nothing yet', async () => {
    feed({ items: [], unread: 0, available: true });
    render(<AdminNotificationBell />);
    fireEvent.click(await screen.findByRole('button', { name: /notifications/i }));
    expect(screen.getByText('Nothing yet. Interesting events show up here.')).toBeInTheDocument();
  });

  it('opening an item marks it read and goes to its admin page in the current locale', async () => {
    feed({ items: [item('11111111-1111-4111-8111-111111111111')], unread: 1, available: true });
    render(<AdminNotificationBell />);
    fireEvent.click(await screen.findByRole('button', { name: /notifications/i }));
    fireEvent.click(screen.getByText('New paying Pro customer'));
    expect(push).toHaveBeenCalledWith('/en/admin/teacher-pro');
    const post = fetchWithAuth.mock.calls.find(([, init]) => (init as { method?: string } | undefined)?.method === 'POST');
    expect(JSON.parse((post![1] as { body: string }).body)).toEqual({ ids: ['11111111-1111-4111-8111-111111111111'] });
  });

  it('mark all read posts {all:true} and clears the badge', async () => {
    feed({ items: [item('1')], unread: 2, available: true });
    render(<AdminNotificationBell />);
    fireEvent.click(await screen.findByRole('button', { name: /notifications/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Mark all read' }));
    const post = fetchWithAuth.mock.calls.find(([, init]) => (init as { method?: string } | undefined)?.method === 'POST');
    expect(JSON.parse((post![1] as { body: string }).body)).toEqual({ all: true });
    await waitFor(() => expect(screen.queryByText('2')).toBeNull());
  });

  it('polls once a minute and stops on unmount', async () => {
    vi.useFakeTimers();
    feed({ items: [], unread: 0, available: true });
    const { unmount } = render(<AdminNotificationBell />);
    await act(async () => {});
    const initial = fetchWithAuth.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(fetchWithAuth.mock.calls.length).toBe(initial + 1);
    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });
    expect(fetchWithAuth.mock.calls.length).toBe(initial + 1);
  });
});

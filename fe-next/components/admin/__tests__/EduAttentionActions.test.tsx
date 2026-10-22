/**
 * One prioritized list. Teacher rows are one-click nudges (copy, email, mark done); the
 * server cooldown is what stops a teacher being chased twice.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { teacher } from './eduDashboardFixture';

const fetchWithAuth = vi.fn();
vi.mock('@/utils/authFetch', () => ({
  fetchWithAuth: (...args: unknown[]) => fetchWithAuth(...args),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, fb?: string | Record<string, string | number>, params?: Record<string, string | number>) =>
      typeof fb === 'string' ? fb.replace(/\{(\w+)\}/g, (_, n: string) => String(params?.[n] ?? `{${n}}`)) : k,
    language: 'en',
  }),
}));

import { EduAttentionList } from '../edu-dashboard/EduAttentionList';

const ann = (over: Record<string, unknown> = {}) => teacher('t1', 'Ann', 'at_risk', { email: 'ann@school.example', ...over });
const item = (kind: string, over: Record<string, unknown> = {}) => ({ kind, teacherId: 't1', classId: null, className: null, dueAt: null, ...over });
const renderList = (teachers: unknown[], items: unknown[], total = items.length) =>
  render(<EduAttentionList attention={{ items, total } as never} teachers={teachers as never} />);

let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  writeText = vi.fn(async () => undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  fetchWithAuth.mockReset();
  fetchWithAuth.mockResolvedValue(new Response(JSON.stringify({ ok: true, createdAt: '2026-10-08T12:00:00Z' }), { status: 200 }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('EduAttentionList', () => {
  it('says why each teacher is on the list', () => {
    renderList([ann()], [item('no_students')]);
    expect(screen.getByTestId('rescue-row-t1').textContent).toContain('Made a class, but no student has joined');
  });

  it('sends a locked-out teacher to Teacher access instead of offering a nudge', () => {
    renderList([ann({ canSignIn: false, stage: 'locked_out' })], [item('locked_out')]);
    const row = screen.getByTestId('rescue-row-t1');
    expect(within(row).getByRole('link', { name: 'Fix in Teacher access' }).getAttribute('href')).toBe('/en/admin/teacher-access');
    expect(within(row).queryByRole('button', { name: 'Copy nudge' })).toBeNull();
  });

  it('links a stalled class to its class page', () => {
    renderList([ann({ students: 5 })], [item('class_stalled', { classId: 'c9', className: 'Period 3' })]);
    expect(screen.getByRole('link', { name: 'Period 3' }).getAttribute('href')).toBe('/en/admin/education/class/c9');
  });

  it('points at the rest when the list is capped', () => {
    renderList([ann()], [item('no_class')], 5);
    expect(screen.getByTestId('rescue-more').textContent).toContain('4');
  });

  it('copies a nudge that carries the teacher name and the class join code, and logs it', async () => {
    renderList([ann()], [item('no_students')]);
    fireEvent.click(screen.getByRole('button', { name: 'Copy nudge' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toContain('Ann');
    expect(copied).toContain('ABC123');
    expect(copied).toContain('/en/teacher');
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledTimes(1));
    const [url, init] = fetchWithAuth.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/admin/edu-dashboard/outreach');
    expect(JSON.parse(init.body as string)).toEqual({ teacherId: 't1', channel: 'copy' });
  });

  it('opens a mailto with the teacher address and the same nudge text', () => {
    renderList([ann()], [item('no_students')]);
    const href = screen.getByRole('link', { name: 'Email' }).getAttribute('href') ?? '';
    expect(href.startsWith('mailto:ann@school.example?')).toBe(true);
    expect(decodeURIComponent(href)).toContain('ABC123');
  });

  it('shows no email action when the request had no address', () => {
    renderList([ann({ email: null })], [item('no_students')]);
    expect(screen.queryByRole('link', { name: 'Email' })).toBeNull();
  });

  it('greys out copy once a nudge happened within the cooldown', () => {
    const recent = new Date(Date.now() - 2 * 86_400_000).toISOString();
    renderList([ann({ lastOutreachAt: recent })], [item('no_students')]);
    expect(screen.getByRole('button', { name: 'Copy nudge' })).toBeDisabled();
    expect(within(screen.getByTestId('rescue-row-t1')).getByText(/Nudged/)).toBeInTheDocument();
  });

  it('surfaces the server cooldown when another admin nudged first', async () => {
    fetchWithAuth.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'cooldown' }), { status: 409 }));
    renderList([ann()], [item('no_students')]);
    fireEvent.click(screen.getByRole('button', { name: 'Mark done' }));
    await waitFor(() => expect(screen.getByTestId('rescue-row-t1').textContent).toContain('Already nudged in the last 7 days'));
  });

  it('still copies the nudge when the outreach log is not set up yet', async () => {
    fetchWithAuth.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'outreach_unavailable' }), { status: 503 }));
    renderList([ann()], [item('no_students')]);
    fireEvent.click(screen.getByRole('button', { name: 'Copy nudge' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('rescue-row-t1').textContent).toContain('Copied. Logging is not set up yet.'));
  });

  it('says so when nobody needs attention', () => {
    renderList([], []);
    expect(screen.getByText('Nobody needs a nudge right now.')).toBeInTheDocument();
  });
});

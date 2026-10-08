/**
 * Rescue rows are one-click actions: copy a nudge with the class code, open a prefilled
 * email, or mark done. The server cooldown is what stops a teacher being chased twice.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const fetchWithAuth = vi.fn();
vi.mock('@/utils/authFetch', () => ({
  fetchWithAuth: (...args: unknown[]) => fetchWithAuth(...args),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, fb?: string | Record<string, string | number>, params?: Record<string, string | number>) => {
      if (typeof fb !== 'string') return k;
      const p = typeof fb === 'string' ? params ?? {} : {};
      return fb.replace(/\{(\w+)\}/g, (_, name: string) => String(p[name] ?? `{${name}}`));
    },
    language: 'en',
  }),
}));

import { EduRescueList } from '../edu-dashboard/EduRescueList';

const row = (over: Record<string, unknown> = {}) => ({
  id: 't1',
  name: 'Ann',
  lastActiveAt: '2026-10-01T00:00:00Z',
  classes: 1,
  students: 0,
  roundsLast7d: null,
  health: 'at_risk',
  stage: 'classroom',
  email: 'ann@school.example',
  joinCode: 'ABC123',
  lastOutreachAt: null,
  ...over,
});

const verdict = (rows: unknown[]) => ({
  stepKey: 'student',
  fromKey: 'classroom',
  fromCount: 19,
  toCount: 6,
  lost: 13,
  pct: 32,
  cohortAvailable: true,
  rescue: rows,
  rescueTotal: rows.length,
});

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

describe('EduRescueList actions', () => {
  it('copies a nudge that carries the teacher name and the class join code, and logs it', async () => {
    render(<EduRescueList verdict={verdict([row()]) as never} />);
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
    render(<EduRescueList verdict={verdict([row()]) as never} />);
    const mail = screen.getByRole('link', { name: 'Email' });
    const href = mail.getAttribute('href') ?? '';
    expect(href.startsWith('mailto:ann@school.example?')).toBe(true);
    expect(decodeURIComponent(href)).toContain('ABC123');
  });

  it('shows no email action when the request had no address', () => {
    render(<EduRescueList verdict={verdict([row({ email: null })]) as never} />);
    expect(screen.queryByRole('link', { name: 'Email' })).toBeNull();
  });

  it('greys out copy and email once a nudge happened within the cooldown', () => {
    const recent = new Date(Date.now() - 2 * 86_400_000).toISOString();
    render(<EduRescueList verdict={verdict([row({ lastOutreachAt: recent })]) as never} />);
    expect(screen.getByRole('button', { name: 'Copy nudge' })).toBeDisabled();
    expect(within(screen.getByTestId('rescue-row-t1')).getByText(/Nudged/)).toBeInTheDocument();
  });

  it('surfaces the server cooldown when another admin nudged first', async () => {
    fetchWithAuth.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'cooldown' }), { status: 409 }));
    render(<EduRescueList verdict={verdict([row()]) as never} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mark done' }));
    await waitFor(() =>
      expect(screen.getByTestId('rescue-row-t1').textContent).toContain('Already nudged in the last 7 days'),
    );
  });

  it('still copies the nudge when the outreach log is not set up yet', async () => {
    fetchWithAuth.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'outreach_unavailable' }), { status: 503 }));
    render(<EduRescueList verdict={verdict([row()]) as never} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy nudge' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByTestId('rescue-row-t1').textContent).toContain('Copied. Logging is not set up yet.'),
    );
  });
});

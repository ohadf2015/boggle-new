/**
 * One class, read-only: who is in it, what they were assigned, and what they played.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';

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

import { AdminClassDetail } from '../AdminClassDetail';

const detail = (over: Record<string, unknown> = {}) => ({
  classroom: { id: 'c1', name: 'Period 3', joinCode: 'ABC123', language: 'en', createdAt: '2026-09-01T00:00:00Z' },
  teacher: { id: 't1', name: 'Ada', lastSeenAt: '2026-10-07T00:00:00Z', isTestAccount: false },
  students: [
    { id: 's1', name: 'Sam', joinedAt: '2026-09-02T00:00:00Z', lastSeenAt: '2026-10-06T00:00:00Z' },
    { id: 's2', name: null, joinedAt: null, lastSeenAt: null },
  ],
  studentCount: 2,
  excludedTestStudents: 1,
  assignments: [{ id: 'a1', lessonName: 'Animals', dueDate: null, createdAt: '2026-10-01T00:00:00Z', completed: 1, assigned: 2 }],
  rounds: { available: true, last30Days: 3, lastPlayedAt: '2026-10-07T00:00:00Z', modes: [{ mode: 'classic', rounds: 3 }] },
  games: [
    {
      gameCode: 'G1',
      gameMode: 'classic',
      playedAt: '2026-10-07T00:00:00Z',
      playerCount: 2,
      rosterCount: 2,
      coveragePct: 50,
      averageAccuracyPct: 80,
      topPlayers: [{ name: 'Sam', score: 40 }],
      missedWords: ['lion'],
    },
  ],
  ...over,
});

describe('AdminClassDetail', () => {
  beforeEach(() => fetchWithAuth.mockReset());

  it('loads the class and links back to its teacher', async () => {
    fetchWithAuth.mockResolvedValue({ ok: true, json: async () => detail() });
    render(<AdminClassDetail classId="c1" />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Period 3' })).toBeInTheDocument());
    expect(fetchWithAuth).toHaveBeenCalledWith('/api/admin/edu-dashboard/class/c1');
    expect(screen.getByRole('link', { name: 'Ada' }).getAttribute('href')).toBe('/en/admin/education/teacher/t1');
  });

  it('lists students, says test students were left out, and shows assignment completion', async () => {
    fetchWithAuth.mockResolvedValue({ ok: true, json: async () => detail() });
    render(<AdminClassDetail classId="c1" />);
    const roster = await screen.findByTestId('class-students');
    expect(within(roster).getByText('Sam')).toBeInTheDocument();
    expect(screen.getByText('Test accounts left out: 1.')).toBeInTheDocument();
    expect(screen.getByTestId('class-assignments').textContent).toContain('1 of 2 finished');
  });

  it('summarises class games and lists recent ones', async () => {
    fetchWithAuth.mockResolvedValue({ ok: true, json: async () => detail() });
    render(<AdminClassDetail classId="c1" />);
    const games = await screen.findByTestId('class-games');
    expect(games.textContent).toContain('3 class games in the last 30 days');
    expect(games.textContent).toContain('lion');
  });

  it('Given 3 rounds in 30 days but 1 game with results, Then the games heading carries no count that contradicts the summary', async () => {
    fetchWithAuth.mockResolvedValue({ ok: true, json: async () => detail() });
    render(<AdminClassDetail classId="c1" />);
    const heading = within(await screen.findByTestId('class-games')).getByRole('heading', { level: 2 });
    expect(heading.textContent).toBe('Class games');
  });

  it('says class games are not measured when the table is missing', async () => {
    fetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => detail({ rounds: { available: false, last30Days: null, lastPlayedAt: null, modes: [] } }),
    });
    render(<AdminClassDetail classId="c1" />);
    expect((await screen.findByTestId('class-games')).textContent).toContain('Not measured yet');
  });

  it('shows an error when the class cannot be loaded', async () => {
    fetchWithAuth.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    render(<AdminClassDetail classId="nope" />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});

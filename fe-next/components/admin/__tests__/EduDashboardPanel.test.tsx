/**
 * Mounts the education dashboard against a fixed /api/admin/edu-dashboard payload.
 * Covers the window toggle refetch, the missing-migration empty state and the
 * biggest-drop highlight in the funnel, which are the parts an owner reads first.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';

const fetchWithAuth = vi.fn();
vi.mock('@/utils/authFetch', () => ({
  fetchWithAuth: (...args: unknown[]) => fetchWithAuth(...args),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, fb?: string | Record<string, string | number>) =>
      typeof fb === 'string' ? fb : k,
    language: 'en',
  }),
}));

import { EduDashboardPanel } from '../EduDashboardPanel';

const delta = (current: number, prior: number) => ({
  current,
  prior,
  pct: prior === 0 ? null : Math.round(((current - prior) / prior) * 1000) / 10,
});

const payload = (over: Record<string, unknown> = {}) => ({
  windowDays: 7,
  roundsAvailable: true,
  kpis: {
    activeTeachers: delta(6, 3),
    newTeachers: delta(2, 2),
    classesWithLiveGame: delta(4, 1),
    liveRounds: delta(18, 9),
    trialsStarted: delta(3, 1),
    trialsPaid: delta(0, 0),
  },
  sparklines: { activeTeachers: [1, 2, 3], liveRounds: [0, 4, 6] },
  teachers: [
    {
      id: 't1',
      name: 'Ada Teacher',
      lastActiveAt: '2026-10-07T10:00:00Z',
      classes: 2,
      students: 14,
      roundsLast7d: 9,
      health: 'thriving',
    },
  ],
  classes: [],
  dyingClasses: [
    { id: 'c9', name: 'Quiet Period 3', teacherId: 't1', students: 5, lastRoundAt: null, roundsInWindow: 0 },
  ],
  modeMix: [{ mode: 'classic', rounds: 12, players: 40 }],
  funnel: [
    { key: 'signup', count: 40, pctOfPrev: null, isBiggestDrop: false },
    { key: 'class', count: 20, pctOfPrev: 50, isBiggestDrop: false },
    { key: 'firstGame', count: 4, pctOfPrev: 20, isBiggestDrop: true },
  ],
  ...over,
});

describe('EduDashboardPanel', () => {
  beforeEach(() => {
    fetchWithAuth.mockReset();
  });

  it('loads the 7-day window on mount and renders KPI values', async () => {
    fetchWithAuth.mockResolvedValue({ ok: true, json: async () => payload() });
    render(<EduDashboardPanel />);

    await waitFor(() => expect(screen.getByText('6')).toBeInTheDocument());
    expect(fetchWithAuth).toHaveBeenCalledWith('/api/admin/edu-dashboard?window=7');
    expect(within(screen.getByTestId('kpi-activeTeachers')).getByText('+100%')).toBeInTheDocument();
  });

  it('refetches with the chosen window when the toggle changes', async () => {
    fetchWithAuth.mockResolvedValue({ ok: true, json: async () => payload() });
    render(<EduDashboardPanel />);
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: '30d' }));
    await waitFor(() =>
      expect(fetchWithAuth).toHaveBeenLastCalledWith('/api/admin/edu-dashboard?window=30'),
    );
  });

  it('shows the no-data state for round tiles when classroom_rounds is unmigrated', async () => {
    fetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () =>
        payload({
          roundsAvailable: false,
          kpis: { ...payload().kpis, classesWithLiveGame: null, liveRounds: null },
        }),
    });
    render(<EduDashboardPanel />);

    await waitFor(() => expect(screen.getAllByText('No data yet').length).toBeGreaterThan(0));
    expect(screen.queryByText('Error')).not.toBeInTheDocument();
  });

  it('marks the biggest funnel drop', async () => {
    fetchWithAuth.mockResolvedValue({ ok: true, json: async () => payload() });
    render(<EduDashboardPanel />);

    await waitFor(() => expect(screen.getByTestId('funnel-step-firstGame')).toBeInTheDocument());
    expect(screen.getByTestId('funnel-step-firstGame').getAttribute('data-drop')).toBe('true');
    expect(screen.getByTestId('funnel-step-class').getAttribute('data-drop')).toBe('false');
  });

  it('shows the teacher health chip and the dying classes list', async () => {
    fetchWithAuth.mockResolvedValue({ ok: true, json: async () => payload() });
    render(<EduDashboardPanel />);

    await waitFor(() => expect(screen.getByText('Ada Teacher')).toBeInTheDocument());
    expect(screen.getAllByText('Thriving').length).toBeGreaterThan(0);
    expect(screen.getByText('Quiet Period 3')).toBeInTheDocument();
  });
});

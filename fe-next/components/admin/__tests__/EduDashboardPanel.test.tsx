/**
 * Mounts the education dashboard against a fixed /api/admin/edu-dashboard payload.
 * Covers the window toggle refetch, the missing-migration state and the biggest-drop
 * highlight in the funnel, which are the parts an owner reads first.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { dashboardPayload as payload } from './eduDashboardFixture';

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

import { EduDashboardPanel } from '../EduDashboardPanel';

describe('EduDashboardPanel', () => {
  beforeEach(() => {
    fetchWithAuth.mockReset();
  });

  it('loads the 7-day window on mount and renders KPI values', async () => {
    fetchWithAuth.mockResolvedValue({ ok: true, json: async () => payload() });
    render(<EduDashboardPanel />);

    await waitFor(() => expect(within(screen.getByTestId('kpi-activeTeachers')).getByText('12')).toBeInTheDocument());
    expect(fetchWithAuth).toHaveBeenCalledWith('/api/admin/edu-dashboard?window=7');
  });

  it('refetches with the chosen window when the toggle changes', async () => {
    fetchWithAuth.mockResolvedValue({ ok: true, json: async () => payload() });
    render(<EduDashboardPanel />);
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Last 30 days' }));
    await waitFor(() => expect(fetchWithAuth).toHaveBeenLastCalledWith('/api/admin/edu-dashboard?window=30'));
  });

  it('says round tiles are not measured when classroom_rounds is unmigrated', async () => {
    const base = payload();
    fetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () =>
        payload({
          roundsAvailable: false,
          kpis: { ...base.kpis, classesWithLiveGame: null, liveRounds: null },
          drill: { ...base.drill, kpi: { ...base.drill.kpi, classesWithLiveGame: null, liveRounds: null } },
        }),
    });
    render(<EduDashboardPanel />);

    await waitFor(() => expect(screen.getByTestId('kpi-liveRounds').textContent).toContain('Not measured yet'));
  });

  it('marks the biggest funnel drop and shows each step as a share of the previous one', async () => {
    fetchWithAuth.mockResolvedValue({ ok: true, json: async () => payload() });
    render(<EduDashboardPanel />);

    await waitFor(() => expect(screen.getByTestId('funnel-step-student')).toBeInTheDocument());
    expect(screen.getByTestId('funnel-step-student').getAttribute('data-drop')).toBe('true');
    expect(screen.getByTestId('funnel-step-classroom').getAttribute('data-drop')).toBe('false');
    expect(screen.getByTestId('funnel-step-student').textContent).toContain('9.1%');
  });

  it('shows the needs-attention list and the teacher health counts', async () => {
    fetchWithAuth.mockResolvedValue({ ok: true, json: async () => payload() });
    render(<EduDashboardPanel />);

    await waitFor(() => expect(screen.getByTestId('rescue-row-s0')).toBeInTheDocument());
    expect(screen.getByTestId('health-thriving').textContent).toContain('1');
    expect(screen.getByTestId('health-at_risk').textContent).toContain('10');
  });

  it('shows an error when the payload is not a dashboard', async () => {
    fetchWithAuth.mockResolvedValue({ ok: true, json: async () => ({ nope: true }) });
    render(<EduDashboardPanel />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});

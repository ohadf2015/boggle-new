/**
 * The owner reads a headline, then clicks any number to see exactly who it counted.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { dashboardPayload } from './eduDashboardFixture';

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

const load = async (body: unknown = dashboardPayload()) => {
  fetchWithAuth.mockResolvedValue({ ok: true, json: async () => body });
  render(<EduDashboardPanel />);
  await waitFor(() => expect(screen.getByTestId('kpi-activeTeachers')).toBeInTheDocument());
};

const teacherNames = () =>
  within(screen.getByTestId('teacher-table'))
    .queryAllByRole('link')
    .map((a) => a.textContent);

describe('EduDashboardPanel drill-down', () => {
  beforeEach(() => fetchWithAuth.mockReset());

  it('states the biggest drop-off in plain words, with the step and the loss', async () => {
    await load();
    await waitFor(() => expect(screen.getByTestId('verdict-lost').textContent).toBe('10'));
    expect(screen.getByTestId('verdict-eyebrow').textContent).toContain('Has students');
    expect(screen.getByTestId('funnel-loss-student').textContent).toBe('−10');
  });

  it('lists the teachers behind the drop-off from the headline button', async () => {
    await load();
    fireEvent.click(screen.getByRole('button', { name: 'See these 10 teachers' }));
    expect(screen.getByTestId('drill-banner').textContent).toContain('Made a class');
    expect(teacherNames()).toHaveLength(10);
    expect(teacherNames()).not.toContain('Thriving Tim');
  });

  it('narrows the teacher list to a KPI, and clears back to everyone', async () => {
    await load();
    fireEvent.click(within(screen.getByTestId('kpi-newTeachers')).getByRole('button', { name: 'Show the list (2)' }));
    expect(teacherNames()).toEqual(['Thriving Tim', 'Stuck 1']);
    fireEvent.click(screen.getByRole('button', { name: 'Show everyone' }));
    expect(teacherNames()).toContain('Stuck 5');
  });

  it('opens the teachers stuck at a funnel step', async () => {
    await load();
    fireEvent.click(screen.getByTestId('funnel-step-signin'));
    expect(teacherNames()).toEqual(['Dormant Dee']);
  });

  it('narrows the class table for a class KPI and links each class to its detail page', async () => {
    await load();
    fireEvent.click(within(screen.getByTestId('kpi-classesWithLiveGame')).getByRole('button', { name: 'Show the list (1)' }));
    const table = screen.getByTestId('class-table');
    expect(within(table).getByRole('link', { name: 'Period 3' }).getAttribute('href')).toBe('/en/admin/education/class/c1');
    expect(within(table).queryByText('Empty room')).toBeNull();
  });

  it('labels every KPI with a definition and the change in words', async () => {
    await load();
    const tile = screen.getByTestId('kpi-newTeachers');
    expect(tile.textContent).toContain('Access requests approved in this period');
    expect(screen.getByTestId('kpi-newTeachers-delta').textContent).toBe('+100% vs the previous 7 days (was 1)');
    expect(screen.getByTestId('kpi-trialsStarted-delta').textContent).toBe('Up from 0 in the previous 7 days');
    expect(screen.queryByTestId('kpi-activeTeachers-delta')).toBeNull();
  });

  it('shows zero tiles instead of hiding them, so revenue is always on screen', async () => {
    await load();
    expect(screen.getByTestId('kpi-trialsPaid').textContent).toContain('Trials that paid');
  });

  it('keeps dormant teachers out of the default table until asked', async () => {
    await load();
    expect(teacherNames()).not.toContain('Dormant Dee');
    fireEvent.click(screen.getByRole('button', { name: /show dormant/i }));
    expect(teacherNames()).toContain('Dormant Dee');
  });

  it('says so instead of inventing a verdict when there is none', async () => {
    await load(dashboardPayload({ verdict: null }));
    expect(screen.getByText('Not enough data in this window yet.')).toBeInTheDocument();
  });
});

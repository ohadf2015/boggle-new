/**
 * The owner's first ten seconds: a headline verdict, a rescue list that links into the
 * teacher drill-down, and no wall of dormant rows above the fold.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';

const fetchWithAuth = vi.fn();
vi.mock('@/utils/authFetch', () => ({
  fetchWithAuth: (...args: unknown[]) => fetchWithAuth(...args),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, fb?: string | Record<string, string | number>) => (typeof fb === 'string' ? fb : k),
    language: 'en',
  }),
}));

import { EduDashboardPanel } from '../EduDashboardPanel';

const delta = (current: number, prior: number) => ({
  current,
  prior,
  pct: prior === 0 ? null : Math.round(((current - prior) / prior) * 1000) / 10,
});

const teacher = (id: string, name: string, health: string, over: Record<string, unknown> = {}) => ({
  id,
  name,
  lastActiveAt: '2026-10-07T10:00:00Z',
  classes: 1,
  students: 0,
  roundsLast7d: null,
  health,
  stage: 'classroom',
  ...over,
});

const stuckRows = Array.from({ length: 10 }, (_, i) => teacher(`s${i}`, `Stuck ${i}`, 'at_risk'));

const payload = (over: Record<string, unknown> = {}) => ({
  windowDays: 7,
  roundsAvailable: false,
  kpis: {
    activeTeachers: delta(6, 3),
    newTeachers: delta(2, 2),
    classesWithLiveGame: null,
    liveRounds: null,
    trialsStarted: delta(3, 1),
    trialsPaid: delta(0, 0),
  },
  sparklines: { activeTeachers: [1, 2, 3], liveRounds: null },
  teachers: [
    teacher('d1', 'Dormant Dee', 'dormant', { lastActiveAt: '2026-08-01T00:00:00Z' }),
    teacher('t1', 'Thriving Tim', 'thriving', { students: 4, stage: 'student' }),
    ...stuckRows,
  ],
  classes: [],
  dyingClasses: [
    { id: 'c9', name: 'Quiet Period 3', teacherId: 's0', students: 5, lastRoundAt: null, roundsInWindow: null },
  ],
  modeMix: [],
  funnel: [
    { key: 'requested', count: 20, pctOfPrev: null, isBiggestDrop: false },
    { key: 'approved', count: 14, pctOfPrev: 70, isBiggestDrop: false },
    { key: 'classroom', count: 12, pctOfPrev: 85.7, isBiggestDrop: false },
    { key: 'student', count: 2, pctOfPrev: 16.7, isBiggestDrop: true },
  ],
  verdict: {
    stepKey: 'student',
    fromKey: 'classroom',
    fromCount: 12,
    toCount: 2,
    lost: 10,
    pct: 16.7,
    cohortAvailable: true,
    rescue: stuckRows.slice(0, 8),
    rescueTotal: 10,
  },
  ...over,
});

const load = async (body: unknown) => {
  fetchWithAuth.mockResolvedValue({ ok: true, json: async () => body });
  render(<EduDashboardPanel />);
  await waitFor(() => expect(screen.getByTestId('kpi-activeTeachers')).toBeInTheDocument());
};

describe('EduDashboardPanel verdict and rescue list', () => {
  beforeEach(() => {
    fetchWithAuth.mockReset();
  });

  it('states the biggest leak with its loss and the step it lands on', async () => {
    await load(payload());
    await waitFor(() => expect(screen.getByTestId('verdict-lost').textContent).toBe('10'));
    expect(screen.getByTestId('verdict-eyebrow').textContent).toContain('First student joined');
    expect(screen.getByTestId('funnel-loss-student').textContent).toBe('−10');
  });

  it('shows the verdict above the KPI grid', async () => {
    await load(payload());
    const hero = screen.getByTestId('verdict-lost');
    const kpi = screen.getByTestId('kpi-activeTeachers');
    expect(hero.compareDocumentPosition(kpi) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('caps the rescue list at eight rows and points at the rest', async () => {
    await load(payload());
    const list = screen.getByTestId('rescue-list');
    expect(within(list).getAllByRole('link')).toHaveLength(8);
    expect(screen.getByTestId('rescue-more').textContent).toContain('2');
  });

  it('links each rescue row into the teacher drill-down', async () => {
    await load(payload());
    const link = within(screen.getByTestId('rescue-list')).getByRole('link', { name: 'Stuck 0' });
    expect(link.getAttribute('href')).toBe('/en/admin/education/teacher/s0');
  });

  it('keeps dormant teachers out of the table until asked', async () => {
    await load(payload());
    expect(screen.queryByText('Dormant Dee')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /show dormant/i }));
    expect(screen.getByText('Dormant Dee')).toBeInTheDocument();
  });

  it('links the dying-class row to its teacher', async () => {
    await load(payload());
    const link = screen.getByRole('link', { name: 'Quiet Period 3' });
    expect(link.getAttribute('href')).toBe('/en/admin/education/teacher/s0');
  });

  it('summarises teacher health as counts beside the funnel', async () => {
    await load(payload());
    expect(screen.getByTestId('health-thriving').textContent).toContain('1');
    expect(screen.getByTestId('health-at_risk').textContent).toContain('10');
    expect(screen.getByTestId('health-dormant').textContent).toContain('1');
  });

  it('says so instead of inventing a verdict when there is none', async () => {
    await load(payload({ verdict: null }));
    expect(screen.getByText('Not enough data in this window yet.')).toBeInTheDocument();
  });
});

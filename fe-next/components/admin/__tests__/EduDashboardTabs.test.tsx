/**
 * Tabbed layout + insights: findings on Overview, Usage and Pro tabs, drills jump tabs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { dashboardPayload } from './eduDashboardFixture';

const fetchWithAuth = vi.fn();
// rAF is a no-op under vitest, so skip the count-up animation.
vi.mock('@/hooks/useCountUp', () => ({ useCountUp: ({ target }: { target: number }) => target }));
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: (...a: unknown[]) => fetchWithAuth(...a) }));
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
  await waitFor(() => expect(screen.getByTestId('edu-findings')).toBeInTheDocument());
};
const openTab = (name: RegExp) => fireEvent.mouseDown(screen.getByRole('tab', { name }), { button: 0 });

describe('Education dashboard tabs', () => {
  beforeEach(() => fetchWithAuth.mockReset());

  it('opens on Overview and offers five tabs with counts and an expiring-trial alert', async () => {
    await load();
    const names = screen.getAllByRole('tab').map((x) => x.textContent);
    expect(names).toEqual(['Overview', 'Usage', 'Teachers12', 'Classes2', 'Pro & trials1']);
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  });

  it('puts what is working and what is not on the Overview, in plain sentences', async () => {
    await load();
    expect(within(screen.getByTestId('findings-working')).getByText(/100% more/)).toBeInTheDocument();
    expect(within(screen.getByTestId('findings-broken')).getByText(/Biggest leak: 10 teachers got as far as “Made a class”/)).toBeInTheDocument();
    expect(within(screen.getByTestId('findings-facts')).getByText(/Teaching peaks on Monday/)).toBeInTheDocument();
  });

  it('shows early warnings first, with the teachers to reach', async () => {
    await load();
    const early = screen.getByTestId('findings-early');
    expect(within(early).getByText(/1 trials end within 7 days and the teacher has not run a game this week/)).toBeInTheDocument();
    fireEvent.click(within(early).getByRole('button', { name: 'Show them (1)' }));
    expect(screen.getByRole('tab', { name: /^Teachers/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('names weak modes and where teachers are stuck', async () => {
    await load();
    const broken = screen.getByTestId('findings-broken');
    expect(within(broken).getByText('Most teachers try duel once and never run it again.')).toBeInTheDocument();
    expect(within(broken).getByText(/10 teachers made a class and no student joined/)).toBeInTheDocument();
  });

  it('says so when no early warning exists', async () => {
    await load(dashboardPayload({ findings: [] }));
    expect(screen.getByText('No early warning signs. Nothing is slipping yet.')).toBeInTheDocument();
  });

  it('says so when nothing is working or broken instead of leaving a blank box', async () => {
    await load(dashboardPayload({ findings: [] }));
    expect(screen.getByText(/No clear win yet/)).toBeInTheDocument();
    expect(screen.getByText('Nothing is breaking right now.')).toBeInTheDocument();
  });

  it('a finding drill jumps to the Teachers tab narrowed to those teachers', async () => {
    await load();
    fireEvent.click(within(screen.getByTestId('finding-funnel_drop')).getByRole('button', { name: 'Show them (2)' }));
    expect(screen.getByRole('tab', { name: /^Teachers/ })).toHaveAttribute('aria-selected', 'true');
    const names = within(screen.getByTestId('teacher-table')).queryAllByRole('link').map((a) => a.textContent);
    expect(names).toEqual(['Stuck 0', 'Stuck 1']);
  });

  it('Usage tab shows games, seats, return rate, weekday chart and top teachers', async () => {
    await load();
    openTab(/^Usage/);
    expect(screen.getByTestId('usage-rounds').textContent).toContain('4');
    expect(screen.getByTestId('usage-players').textContent).toContain('36');
    expect(screen.getByTestId('usage-retention').textContent).toContain('50%');
    expect(within(screen.getByTestId('usage-weekday')).getAllByRole('listitem')).toHaveLength(7);
    expect(within(screen.getByTestId('usage-top')).getByText('Thriving Tim')).toBeInTheDocument();
  });

  it('Usage tab lists the teachers who stopped teaching', async () => {
    await load();
    openTab(/^Usage/);
    fireEvent.click(screen.getByRole('button', { name: 'Show the 1 teachers who stopped' }));
    expect(screen.getByRole('tab', { name: /^Teachers/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('Usage tab says not measured when the games table is missing', async () => {
    await load(dashboardPayload({ roundsAvailable: false, insights: { ...dashboardPayload().insights, usage: null, retention: null } }));
    openTab(/^Usage/);
    expect(screen.getByText(/Not measured yet/)).toBeInTheDocument();
  });

  it('Pro tab surfaces trials ending soon with the teacher to contact', async () => {
    await load();
    openTab(/pro & trials/i);
    expect(screen.getByTestId('pro-soon').textContent).toContain('1');
    expect(within(screen.getByTestId('pro-soon-list')).getByText('Stuck 2')).toBeInTheDocument();
    expect(screen.getByTestId('pro-conversion').textContent).toContain('—');
  });
});

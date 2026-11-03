import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

import { RevenuePanel } from '../overview/RevenuePanel';

const revenue = { registered: 905, paying: 1, trialing: 0, granted: 2, checkoutsStarted30d: 4, paidOrders30d: 1, offerwallUsd30d: 0 };

function mockFetch(rows: unknown[] = []) {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) =>
    Promise.resolve({
      ok: true,
      json: async () => (url.includes('/revenue') ? { data: { revenue } } : { data: { rows } }),
    }),
  ));
}

describe('RevenuePanel', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows conversion rates between funnel steps', async () => {
    mockFetch();
    render(<RevenuePanel authToken="tok" />);
    await waitFor(() => expect(screen.getByText('905')).toBeInTheDocument());
    expect(screen.getByText('0.4%')).toBeInTheDocument();
    expect(screen.getByText('25.0%')).toBeInTheDocument();
  });

  it('opens the payers drill-down when a tile is clicked', async () => {
    mockFetch([{ id: 'u1', name: 'WINGS', source: 'polar', status: 'active', period_end: '2026-11-09T00:00:00Z' }]);
    render(<RevenuePanel authToken="tok" />);
    await waitFor(() => expect(screen.getByText('admin.kpi.paying')).toBeInTheDocument());
    fireEvent.click(screen.getByText('admin.kpi.paying'));
    await waitFor(() => expect(screen.getByText('WINGS')).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('kind=payers'), expect.anything());
  });

  it('shows an error when the summary fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    render(<RevenuePanel authToken="tok" />);
    await waitFor(() => expect(screen.getByTestId('revenue-error')).toBeInTheDocument());
  });
});

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="chart">{children}</div>,
  ComposedChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => null, Bar: () => null, XAxis: () => null, YAxis: () => null,
  CartesianGrid: () => null, Tooltip: () => null, Legend: () => null,
}));

import { SignupGrowthChart } from '../overview/SignupGrowthChart';

describe('SignupGrowthChart', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders the chart once growth data loads', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { growth: [{ week: '2026-11-02', signups: 15, total: 905 }] } }),
    }));
    render(<SignupGrowthChart authToken="tok" />);
    await waitFor(() => expect(screen.getByTestId('chart')).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/analytics/signup-growth'), expect.anything());
  });

  it('shows an error when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    render(<SignupGrowthChart authToken="tok" />);
    await waitFor(() => expect(screen.getByTestId('growth-error')).toBeInTheDocument());
  });
});

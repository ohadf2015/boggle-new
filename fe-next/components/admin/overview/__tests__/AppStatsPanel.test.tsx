import { render, screen, waitFor } from '@testing-library/react';
import { AppStatsPanel } from '../AppStatsPanel';

const cached = vi.fn();
vi.mock('@/lib/admin/adminJsonCache', () => ({ cachedAdminJson: (...a: unknown[]) => cached(...a) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fb?: string) => fb ?? _k, language: 'en' }),
}));

describe('AppStatsPanel', () => {
  beforeEach(() => {
    cached.mockReset();
  });

  it('shows app users from our own events', async () => {
    cached.mockResolvedValue({ app: { total: 442, new7: 12, new30: 51, active7: 60, active30: 140 }, store: null });
    render(<AppStatsPanel authToken="tok" />);
    await waitFor(() => expect(screen.getByTestId('app-new30')).toHaveTextContent('51'));
    expect(screen.getByTestId('app-active7')).toHaveTextContent('60');
    expect(screen.getByTestId('app-total')).toHaveTextContent('442');
  });

  it('shows store visitors and installs when the store numbers are available', async () => {
    cached.mockResolvedValue({
      app: { total: 1, new7: 0, new30: 0, active7: 0, active30: 0 },
      store: { month: '2026-11', visitors: 107, acquisitions: 23, installsTotal: 270 },
    });
    render(<AppStatsPanel authToken="tok" />);
    await waitFor(() => expect(screen.getByTestId('store-visitors')).toHaveTextContent('107'));
    expect(screen.getByTestId('store-acquisitions')).toHaveTextContent('23');
  });

  it('says the store numbers are not connected instead of showing zeros', async () => {
    cached.mockResolvedValue({ app: { total: 1, new7: 0, new30: 0, active7: 0, active30: 0 }, store: null });
    render(<AppStatsPanel authToken="tok" />);
    await waitFor(() => expect(screen.getByTestId('store-missing')).toBeInTheDocument());
    expect(screen.queryByTestId('store-visitors')).not.toBeInTheDocument();
  });

  it('offers a retry when the stats could not load', async () => {
    cached.mockRejectedValue(new Error('boom'));
    render(<AppStatsPanel authToken="tok" />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument());
  });
});

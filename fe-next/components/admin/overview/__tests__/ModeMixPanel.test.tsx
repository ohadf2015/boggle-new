import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { clearAdminJsonCache } from '@/lib/admin/adminJsonCache';
import { ModeMixPanel } from '../ModeMixPanel';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, fb?: string) => fb ?? k, language: 'en' }),
}));

const PAYLOAD = {
  stats: [{ mode: 'practice', playCount: 300 }, { mode: 'arena', playCount: 100 }],
  mpBreakdown: [{ mode: 'classic', playCount: 60 }, { mode: 'blast', playCount: 40 }],
};

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(PAYLOAD) }) as unknown as typeof fetch;
});
afterEach(() => vi.restoreAllMocks());

afterEach(() => clearAdminJsonCache());

describe('ModeMixPanel', () => {
  it('makes one request for both lists', async () => {
    render(<ModeMixPanel />);
    await screen.findByTestId('mode-mix-all');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('/api/game-mode-stats?days=30');
  });

  it('shows every mode with its share and the multiplayer breakdown', async () => {
    render(<ModeMixPanel />);
    const all = await screen.findByTestId('mode-mix-all');
    expect(within(all).getByText('Single player')).toBeInTheDocument();
    expect(within(all).getByText('75.0%')).toBeInTheDocument();
    expect(within(all).getByText(/Total: 400/)).toBeInTheDocument();
    const mp = screen.getByTestId('mode-mix-mp');
    expect(within(mp).getByText('Classic')).toBeInTheDocument();
    expect(within(mp).getByText('60.0%')).toBeInTheDocument();
  });

  it('changing the range refetches once for both lists', async () => {
    render(<ModeMixPanel />);
    await screen.findByTestId('mode-mix-all');
    fireEvent.click(screen.getByRole('button', { name: '7d' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/game-mode-stats?days=7'));
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('says so when a list has no data, and survives a failed request', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ stats: [], mpBreakdown: [] }) }) as unknown as typeof fetch;
    const { unmount } = render(<ModeMixPanel />);
    await waitFor(() => expect(screen.getAllByText('No data available')).toHaveLength(2));
    unmount();
    global.fetch = vi.fn().mockRejectedValue(new Error('down')) as unknown as typeof fetch;
    render(<ModeMixPanel />);
    await waitFor(() => expect(screen.getAllByText('No data available')).toHaveLength(2));
  });
});

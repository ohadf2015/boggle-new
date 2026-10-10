import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const { spendMock } = vi.hoisted(() => ({ spendMock: vi.fn(async () => true) }));

vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({ coins: 5000, spendCoins: spendMock }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

import { BlastUpgradePanel } from '../BlastUpgradePanel';
import { useBlastUpgradeStore } from '@/lib/blast/useBlastUpgradeStore';
import { getUpgrade, upgradeCost } from '@/lib/blast/blastUpgradeCatalog';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);

describe('BlastUpgradePanel', () => {
  beforeEach(() => {
    useBlastUpgradeStore.getState().reset();
    spendMock.mockClear();
    spendMock.mockResolvedValue(true);
  });
  afterEach(cleanup);

  it('prices every upgrade in coins and shows one coin wallet', () => {
    render(<BlastUpgradePanel onClose={() => {}} t={t} />);
    expect(screen.getAllByTestId('coin-counter')).toHaveLength(1);
    expect(screen.queryByText('💎')).toBeNull();
    expect(screen.getByTestId('buy-safetyNet')).toHaveTextContent(String(upgradeCost(getUpgrade('safetyNet')!, 0)));
  });

  it('first tap asks to confirm and charges nothing', () => {
    render(<BlastUpgradePanel onClose={() => {}} t={t} />);
    fireEvent.click(screen.getByTestId('buy-comboSurge'));
    expect(spendMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('buy-comboSurge')).toHaveAttribute('data-confirming', 'true');
  });

  it('confirming spends the coins through the wallet and levels the upgrade', async () => {
    render(<BlastUpgradePanel onClose={() => {}} t={t} />);
    fireEvent.click(screen.getByTestId('buy-comboSurge'));
    fireEvent.click(screen.getByTestId('buy-comboSurge'));
    await waitFor(() => expect(useBlastUpgradeStore.getState().levelOf('comboSurge')).toBe(1));
    expect(spendMock).toHaveBeenCalledWith(
      upgradeCost(getUpgrade('comboSurge')!, 0),
      'blast_upgrade',
      { id: 'comboSurge', level: 1 },
      expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
    );
  });

  it('tapping another upgrade drops the pending confirm', () => {
    render(<BlastUpgradePanel onClose={() => {}} t={t} />);
    fireEvent.click(screen.getByTestId('buy-comboSurge'));
    fireEvent.click(screen.getByTestId('buy-extraMoves'));
    expect(screen.getByTestId('buy-comboSurge')).not.toHaveAttribute('data-confirming', 'true');
    expect(spendMock).not.toHaveBeenCalled();
  });
});

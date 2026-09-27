/**
 * Word Tower upgrade shop overhaul (TDD): categorized sections, current→next
 * effect previews per row, a "best pick" recommendation chip, and buy wiring.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WordTowerUpgradePanel } from '../WordTowerUpgradePanel';

const buyMock = vi.fn(() => true);

vi.mock('@/utils/coinManager', () => ({ getCoins: () => 200 }));
vi.mock('@/lib/wordTower/useTowerUpgradeStore', () => ({
  useTowerUpgradeStore: (selector: (s: { levels: Record<string, number>; buy: (id: string) => boolean }) => unknown) =>
    selector({ levels: {}, buy: buyMock }),
}));

const t = (key: string) => key;

describe('WordTowerUpgradePanel — categorized shop', () => {
  beforeEach(() => buyMock.mockClear());

  it('renders the three category headers', () => {
    render(<WordTowerUpgradePanel onClose={() => {}} t={t} />);
    expect(screen.getByText('wordTower.upgrade.categories.crane')).toBeInTheDocument();
    expect(screen.getByText('wordTower.upgrade.categories.stability')).toBeInTheDocument();
    expect(screen.getByText('wordTower.upgrade.categories.boost')).toBeInTheDocument();
  });

  it('shows a current → next effect preview on a non-maxed row', () => {
    render(<WordTowerUpgradePanel onClose={() => {}} t={t} />);
    // steadyCable level 0: -0% → -8%
    expect(screen.getByTestId('delta-steadyCable')).toHaveTextContent('-0%');
    expect(screen.getByTestId('delta-steadyCable')).toHaveTextContent('-8%');
  });

  it('marks exactly one affordable row as the best pick (coins=200 → steadyCable)', () => {
    render(<WordTowerUpgradePanel onClose={() => {}} t={t} />);
    const chips = screen.getAllByText('wordTower.upgrade.recommended');
    expect(chips).toHaveLength(1);
    expect(screen.getByTestId('row-steadyCable')).toContainElement(chips[0]);
  });

  it('enables buy for affordable rows and disables unaffordable ones (coins=200)', () => {
    render(<WordTowerUpgradePanel onClose={() => {}} t={t} />);
    expect(screen.getByTestId('buy-steadyCable')).toBeEnabled(); // 150 ≤ 200
    expect(screen.getByTestId('buy-reinforcedCore')).toBeDisabled(); // 400 > 200
  });

  it('buying calls the store buy() once with the upgrade id', () => {
    render(<WordTowerUpgradePanel onClose={() => {}} t={t} />);
    fireEvent.click(screen.getByTestId('buy-steadyCable'));
    expect(buyMock).toHaveBeenCalledTimes(1);
    expect(buyMock).toHaveBeenCalledWith('steadyCable');
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RivalBuilding } from '../rivals/RivalBuilding';

vi.mock('@/components/Avatar', () => ({ default: () => null }));

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);

const rival = {
  userId: 'u2',
  displayName: 'Dana',
  avatar: { avatarConfig: null, avatarEmoji: null, avatarColor: null, avatarImage: null },
  district: 1,
  plots: [],
  shields: 0,
  bestM: 30,
  lastTower: [{ word: 'tower', w: 200, x: 0, y: -60, angle: 0, color: 0xff00ff }],
};

const base = { t, rival, revenge: false, busy: false, onWreck: vi.fn(), onClose: vi.fn() };

describe('RivalBuilding — buy a wrecking ball', () => {
  it('Given no charges and enough coins, when the player buys, then the buy action runs', async () => {
    const onBuyBall = vi.fn().mockResolvedValue({ ok: true });
    render(<RivalBuilding {...base} charges={0} coins={500} ballCost={90} onBuyBall={onBuyBall} />);
    fireEvent.click(screen.getByText('wordTowerV2.dailyTower.buyBall:{"n":90}'));
    await waitFor(() => expect(onBuyBall).toHaveBeenCalledOnce());
  });

  it('Given no charges and too few coins, then buying is disabled and the shortfall is shown', () => {
    render(<RivalBuilding {...base} charges={0} coins={10} ballCost={90} onBuyBall={vi.fn()} />);
    const btn = screen.getByText('wordTowerV2.dailyTower.buyBall:{"n":90}').closest('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(screen.getByText('wordTowerV2.dailyTower.ballPoor:{"n":80}')).toBeTruthy();
  });

  it('Given a charge in stock, then there is nothing to buy', () => {
    render(<RivalBuilding {...base} charges={1} coins={500} ballCost={90} onBuyBall={vi.fn()} />);
    expect(screen.queryByText('wordTowerV2.dailyTower.buyBall:{"n":90}')).toBeNull();
  });

  it('Given a payback (free swing), then there is nothing to buy', () => {
    render(<RivalBuilding {...base} revenge charges={0} coins={500} ballCost={90} onBuyBall={vi.fn()} />);
    expect(screen.queryByText('wordTowerV2.dailyTower.buyBall:{"n":90}')).toBeNull();
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, renderHook } from '@testing-library/react';
import { emptyEstate, upgradeCost, type Estate } from '@/lib/wordTowerV2/estate';
import { UpgradeReadyToast, affordableCount, useUpgradeReady } from '../UpgradeReadyToast';

afterEach(cleanup);

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key} ${JSON.stringify(params)}` : key);
const estate = (coins: number): Estate => ({ ...emptyEstate(), coins });
const cheapest = (e: Estate) => Math.min(...e.plots.map((p) => upgradeCost(e.district, p.slot, p.level)));

describe('useUpgradeReady', () => {
  it('given run coins that cross the cheapest upgrade, when they land, then it fires once', () => {
    const e = estate(0);
    const price = cheapest(e);
    const { result, rerender } = renderHook(({ run }) => useUpgradeReady(e, run), { initialProps: { run: 0 } });
    expect(result.current).toBe(0);
    rerender({ run: price - 1 });
    expect(result.current).toBe(0);
    rerender({ run: price });
    expect(result.current).toBe(1);
    rerender({ run: price + 1 });
    expect(result.current).toBe(1);
  });

  it('given the estate loads late with a big bank, when it arrives, then nothing fires', () => {
    const { result, rerender } = renderHook(({ e }) => useUpgradeReady(e, 0), { initialProps: { e: estate(0) } });
    rerender({ e: estate(1_000_000) });
    expect(result.current).toBe(0);
  });

  it('given coins, when counted, then a maxed or damaged plot is not offered', () => {
    const e = estate(1_000_000);
    e.plots = e.plots.map((p, i) => (i === 0 ? { ...p, level: 5 } : i === 1 ? { ...p, damaged: true, level: 1 } : p));
    expect(affordableCount(e, e.coins)).toBe(e.plots.length - 2);
  });
});

describe('UpgradeReadyToast', () => {
  it('given run coins cross a price, when rendered, then the toast says to build it after the run', () => {
    const e = estate(0);
    const { rerender, container } = render(<UpgradeReadyToast t={t} estate={e} runCoins={0} reducedMotion />);
    expect(container.querySelector('[data-wt2-upgrade-ready]')).toBeNull();
    rerender(<UpgradeReadyToast t={t} estate={e} runCoins={cheapest(e)} reducedMotion />);
    const toast = container.querySelector('[data-wt2-upgrade-ready]');
    expect(toast?.textContent).toContain('wordTowerV2.style.readyTitle');
  });
});

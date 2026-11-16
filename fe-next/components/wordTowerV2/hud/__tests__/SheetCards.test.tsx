import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { emptyEstate, upgradeCost, type Estate } from '@/lib/wordTowerV2/estate';
import { MAX_PLOT_LEVEL } from '@/lib/wordTowerV2/estateCatalog';
import { RivalsCard, WorkshopCard, cheapestUpgrade, workshopLine } from '../SheetCards';

afterEach(cleanup);

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key} ${JSON.stringify(params)}` : key);

const withCoins = (coins: number, patch: Partial<Estate> = {}): Estate => ({ ...emptyEstate(), coins, ...patch });

describe('workshopLine', () => {
  it('given coins for two upgrades, when read, then it says how many are ready to build', () => {
    const e = withCoins(1_000_000);
    const line = workshopLine(t, e, 0);
    expect(line.tone).toBe('ready');
    expect(line.ready).toBe(e.plots.length);
    expect(line.text).toBe(`wordTowerV2.hud.sheet.workshopReady {"n":${e.plots.length}}`);
  });

  it('given no coins, when read, then it names the price of the cheapest upgrade', () => {
    const e = withCoins(0);
    const cheapest = cheapestUpgrade(e);
    expect(cheapest).toBe(Math.min(...e.plots.map((p) => upgradeCost(e.district, p.slot, p.level))));
    expect(workshopLine(t, e, 0).tone).toBe('saving');
  });

  it('given a raided building and no coins, when read, then the repair comes first', () => {
    const e = withCoins(0);
    e.plots = e.plots.map((p, i) => (i === 0 ? { ...p, level: 2, damaged: true } : p));
    expect(workshopLine(t, e, 0)).toMatchObject({ tone: 'repair', text: 'wordTowerV2.hud.sheet.workshopRepair' });
  });

  it('given every plot maxed, when read, then it says everything is built', () => {
    const e = withCoins(0);
    e.plots = e.plots.map((p) => ({ ...p, level: MAX_PLOT_LEVEL }));
    expect(workshopLine(t, e, 0).tone).toBe('done');
  });
});

describe('WorkshopCard / RivalsCard', () => {
  it('given upgrades ready, when tapped, then it opens the workshop and shows the count badge', () => {
    const onOpen = vi.fn();
    render(<WorkshopCard t={t} estate={withCoins(1_000_000)} raids={0} onOpen={onOpen} />);
    const card = screen.getByRole('button', { name: 'wordTowerV2.estate.open' });
    expect(card.getAttribute('data-wt2-workshop-card')).toBe('ready');
    fireEvent.click(card);
    expect(onOpen).toHaveBeenCalled();
  });

  it('given one wrecking ball, when rendered, then the line says so in the singular', () => {
    render(<RivalsCard t={t} balls={1} onOpen={vi.fn()} />);
    expect(screen.getByText('wordTowerV2.hud.sheet.rivalsBallsOne')).toBeTruthy();
  });

  it('given no wrecking balls, when rendered, then the line says what rivals are for', () => {
    render(<RivalsCard t={t} balls={0} onOpen={vi.fn()} />);
    expect(screen.getByText('wordTowerV2.hud.sheet.rivalsNone')).toBeTruthy();
  });
});

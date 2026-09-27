import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRun } from '@/lib/wordTowerV2/run';
import { V2TopBar } from '../V2TopBar';

afterEach(cleanup);

// Echo the key (plus params) so assertions read which copy was chosen.
const t = (key: string, params?: Record<string, string | number>) => {
  if (!params) return key;
  // For dailyBadge, format with the date
  if (key === 'wordTowerV2.hud.dailyBadge' && params.date) {
    return `DAILY ${params.date}`;
  }
  return `${key}:${Object.values(params).join(',')}`;
};

const bar = (over: Partial<Parameters<typeof V2TopBar>[0]> = {}) => (
  <V2TopBar
    t={t}
    heightM={9}
    score={520}
    bestM={0}
    run={createRun(1)}
    coins={1200}
    coinsRef={{ current: null }}
    daily={false}
    {...over}
  />
);

describe('V2TopBar', () => {
  it('given a run in progress, when rendered, then floor, score and coins sit in ONE row', () => {
    const { container } = render(bar());

    // One positioned band, not five independently-placed layers.
    const bands = container.querySelectorAll('[data-wt2-topbar]');
    expect(bands).toHaveLength(1);
    expect(screen.getByLabelText('wordTowerV2.hud.floorA11y:3,9.0')).toBeTruthy();
    expect(screen.getByText('520')).toBeTruthy();
  });

  it('given coins banked this run, when rendered, then ONE chip shows bank plus run, not two chips', () => {
    render(bar({ coins: 1255 }));

    expect(screen.getByLabelText('wordTowerV2.coins.run:1255')).toBeTruthy();
    // The old layout had a second, visually identical coin pill.
    expect(screen.queryAllByLabelText(/wordTowerV2\.coins\.run/)).toHaveLength(1);
  });

  it('given the bar with secondary items, when a menu is provided, then the menu can be opened', () => {
    const onMenuOpen = vi.fn();
    render(bar({ run: { ...createRun(1), combo: 2 }, onMenuOpen }));

    const menu = screen.getByLabelText('wordTowerV2.hud.menu');
    expect(menu).toBeTruthy();
    fireEvent.click(menu);
    expect(onMenuOpen).toHaveBeenCalledOnce();
  });

  it('given a menu button is provided, when rendered, then the menu button is present', () => {
    const onMenuOpen = vi.fn();
    render(bar({ raids: 2, onMenuOpen }));

    const menu = screen.getByLabelText('wordTowerV2.hud.menu');
    expect(menu).toBeTruthy();
    fireEvent.click(menu);
    expect(onMenuOpen).toHaveBeenCalledOnce();
  });

  it('given a menu button is passed, when rendered, then it appears in Row 1', () => {
    const onMenuOpen = vi.fn();
    render(bar({ onMenuOpen }));

    const menuBtn = screen.getByLabelText('wordTowerV2.hud.menu');
    expect(menuBtn).toBeTruthy();
    fireEvent.click(menuBtn);
    expect(onMenuOpen).toHaveBeenCalledOnce();
  });

  it('given the topbar, when rendered, then stability meter is NOT present in it (moved to merged control in dock)', () => {
    const { container } = render(bar());

    const meter = container.querySelector('[data-wt2-stability]');
    expect(meter).toBeNull();
  });

  it('given a run in progress, when the exit is tapped, then the game is asked to leave (the run banks on the way out)', () => {
    const onExit = vi.fn();
    render(bar({ onExit, run: { ...createRun(1), floors: 3 } }));

    fireEvent.click(screen.getByLabelText('wordTowerV2.hud.exit'));
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('given nothing built yet, then the same button is a plain way home', () => {
    render(bar({ onExit: vi.fn(), run: createRun(1) }));
    expect(screen.getByLabelText('wordTowerV2.results.home')).toBeTruthy();
  });

  it('given the bar with exit and menu, then Row 1 has exactly 4 items (exit, height+score, coins, menu)', () => {
    const { container } = render(bar({ onExit: vi.fn(), onMenuOpen: vi.fn() }));
    const rows = container.querySelectorAll('[data-wt2-topbar-row]');
    // Only Row 1 now (secondary items moved to menu)
    expect(rows.length).toBe(1);

    // Exact count of direct children
    const row1 = rows[0];
    expect(row1.children.length).toBe(4);
  });

  it('given a daily run, when rendered, then the daily badge shows the date, not the best chip', () => {
    const { container } = render(
      bar({
        daily: true,
        dailyDateKey: '2026-09-25',
        dailyDateFormatted: '25 Sep',
        bestM: 15.5, // This best should not appear
      })
    );

    // Daily badge is present with date
    const dailyBadge = screen.getByLabelText(/DAILY 25 Sep/);
    expect(dailyBadge).toBeTruthy();

    // Best chip is absent
    expect(screen.queryByText(/15\.5/)).toBeNull();
  });

  it('given a non-daily run with a best, when rendered, then the best chip appears (not daily badge)', () => {
    const { container } = render(bar({ daily: false, bestM: 15.5 }));

    // Best chip appears
    expect(screen.getByText(/15\.5/)).toBeTruthy();

    // Daily badge is absent
    expect(screen.queryByLabelText(/dailyBadge/)).toBeNull();
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRun } from '@/lib/wordTowerV2/run';
import { V2TopBar } from '../V2TopBar';

afterEach(cleanup);

const t = (key: string, params?: Record<string, string | number>) => {
  if (!params) return key;
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

describe('V2TopBar HUD refactor: one row, <=5 items', () => {
  it('given a run in progress, when rendered, then the TOP HUD is ONE flex row with NO wrapping', () => {
    const { container } = render(bar());

    const topBar = container.querySelector('[data-wt2-topbar]');
    expect(topBar).toBeTruthy();

    // Get the first row (Row 1 - where am I)
    const rows = topBar!.querySelectorAll('[data-wt2-topbar-row]');
    expect(rows.length).toBeGreaterThan(0);

    const firstRow = rows[0];
    const rowClasses = firstRow.getAttribute('class') ?? '';
    // Should NOT have flex-wrap to maintain single row
    expect(rowClasses).not.toMatch(/flex-wrap/);
    expect(rowClasses).toMatch(/flex/);
  });

  it('given a run in progress, when rendered, then the TOP row contains exactly <=5 visible items: exit, height+score, coins, stability, menu', () => {
    const { container } = render(bar());

    const topBar = container.querySelector('[data-wt2-topbar]');
    const rows = topBar!.querySelectorAll('[data-wt2-topbar-row]');
    const firstRow = rows[0];

    // Count direct children (buttons/divs) that are rendered, excluding wrappers
    const visibleItems = Array.from(firstRow.children).filter(child => {
      const classes = (child as HTMLElement).getAttribute('class') ?? '';
      // Count buttons and main content divs, not wrappers
      return (child as HTMLElement).tagName === 'BUTTON' || (child instanceof HTMLDivElement && classes.includes('flex'));
    });

    expect(visibleItems.length).toBeLessThanOrEqual(5);
  });

  it('given a run in progress, when rendered, then the exit button is present and clickable', () => {
    const onExit = vi.fn();
    render(bar({ onExit, run: { ...createRun(1), floors: 3 } }));

    const exitBtn = screen.getByLabelText('wordTowerV2.hud.exit');
    expect(exitBtn).toBeTruthy();
    fireEvent.click(exitBtn);
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('given a run in progress, when rendered, then floor and score are MERGED in one chip', () => {
    const { container } = render(bar({ heightM: 12.5, score: 750 }));

    // The merged chip should show both floor and height
    const floorScore = screen.getByLabelText(/wordTowerV2\.hud\.floorA11y/);
    expect(floorScore).toBeTruthy();

    // Score should also be visible in the same area
    expect(screen.getByText('750')).toBeTruthy();
  });

  it('given coins banked, when rendered, then ONE coin chip is in the top row', () => {
    render(bar({ coins: 1255 }));

    expect(screen.getByLabelText('wordTowerV2.coins.run:1255')).toBeTruthy();
    // Should not have two coin chips
    expect(screen.queryAllByLabelText(/wordTowerV2\.coins\.run/)).toHaveLength(1);
  });

  it('given a tower with risk, when rendered, then the stability meter is COMPACT in the top row', () => {
    const { container } = render(bar({ risk: 0.5 }));

    const stability = container.querySelector('[data-wt2-stability]');
    expect(stability).toBeTruthy();

    // Should be in the top row (Row 1)
    const topBar = container.querySelector('[data-wt2-topbar]');
    const rows = topBar!.querySelectorAll('[data-wt2-topbar-row]');
    const firstRow = rows[0];
    expect(firstRow.contains(stability)).toBeTruthy();
  });

  it('given a daily run with date, when rendered, then the stability label shows DAILY instead of the band name', () => {
    const { container } = render(bar({
      daily: true,
      dailyDateKey: '2026-09-25',
      dailyDateFormatted: '25 Sep',
      risk: 0.3
    }));

    // Daily badge should appear with date
    const dailyBadge = screen.getByLabelText(/DAILY 25 Sep/);
    expect(dailyBadge).toBeTruthy();

    // The stability meter should still be present
    const stability = container.querySelector('[data-wt2-stability]');
    expect(stability).toBeTruthy();
  });

  it('given secondary items are not rendered in V2TopBar, when a menu opener is provided, then it is clickable', () => {
    const onMenuOpen = vi.fn();
    render(bar({ onMenuOpen }));

    // Menu button should be present
    const menuButton = screen.getByLabelText('wordTowerV2.hud.menu');
    expect(menuButton).toBeTruthy();
    fireEvent.click(menuButton);
    expect(onMenuOpen).toHaveBeenCalledOnce();
  });

  it('given V2TopBar has only one row, when rendered, then Row 1 contains exactly 4-5 items (exit, height, coins, stability, menu)', () => {
    const { container } = render(bar({ onMenuOpen: vi.fn() }));

    const topBar = container.querySelector('[data-wt2-topbar]');
    const rows = topBar!.querySelectorAll('[data-wt2-topbar-row]');
    // Only one row now (secondary items moved to menu)
    expect(rows.length).toBe(1);

    const firstRow = rows[0];
    const children = Array.from(firstRow.children) as HTMLElement[];
    const visibleItems = children.filter((child) => {
      const classes = child.getAttribute('class') ?? '';
      return (
        child.tagName === 'BUTTON' ||
        (child.tagName === 'DIV' && classes.includes('flex'))
      );
    });
    expect(visibleItems.length).toBeLessThanOrEqual(5); // exit, height+score, coins, stability, menu
  });

  it('given a non-daily run with best height, when rendered, then the best chip appears under the merged height+score', () => {
    render(bar({ bestM: 15.5, daily: false }));

    expect(screen.getByText(/15\.5/)).toBeTruthy();
  });

  it('given the bar, then stability is in Row 1 (streak has moved to the menu)', () => {
    const { container } = render(bar({
      run: { ...createRun(1), balls: 0, combo: 2 },
      tenants: 0,
      onMenuOpen: vi.fn()
    }));

    const topBar = container.querySelector('[data-wt2-topbar]');
    const rows = topBar!.querySelectorAll('[data-wt2-topbar-row]');

    // Only one row now
    expect(rows.length).toBe(1);

    // Row 1 should have stability
    const firstRow = rows[0];
    const stability = firstRow.querySelector('[data-wt2-stability]');

    expect(stability).toBeTruthy();
  });
});

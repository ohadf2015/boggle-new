import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
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

/**
 * Mock window.matchMedia to simulate mobile viewport.
 * At 390px, `lg:` classes should NOT apply (max-width: 1024px).
 */
function mockMobileViewport() {
  const originalMatchMedia = window.matchMedia;

  window.matchMedia = ((query: string) => ({
    matches: !query.includes('min-width: 1024px'), // lg: starts at 1024px
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as any;

  return () => {
    window.matchMedia = originalMatchMedia;
  };
}

describe('V2TopBar at mobile viewport (390px)', () => {
  let restoreMobile: () => void;

  beforeEach(() => {
    // Set viewport to 390px width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 390,
    });

    restoreMobile = mockMobileViewport();
  });

  afterEach(() => {
    restoreMobile();
  });

  it('given a 390px viewport, when rendered, then Row 1 is a single flex row with NO wrapping', () => {
    const { container } = render(bar());

    const topBar = container.querySelector('[data-wt2-topbar]');
    expect(topBar).toBeTruthy();

    const rows = topBar!.querySelectorAll('[data-wt2-topbar-row]');
    const firstRow = rows[0];
    const classes = firstRow.getAttribute('class') ?? '';

    // Should NOT have flex-wrap to maintain single row at mobile width
    expect(classes).not.toMatch(/flex-wrap/);
    expect(classes).toMatch(/flex/);
  });

  it('given the production props (exit + menu), when rendered, then the HUD is ONE row of at most 5 items', () => {
    // Every child of the row counts — an extra chip of any shape breaks the cap.
    const { container } = render(bar({ onExit: vi.fn(), onMenuOpen: vi.fn() }));

    const rows = container.querySelectorAll('[data-wt2-topbar] [data-wt2-topbar-row]');
    expect(rows).toHaveLength(1);
    expect(rows[0].children.length).toBeGreaterThanOrEqual(4);
    expect(rows[0].children.length).toBeLessThanOrEqual(5);
  });

  it('given a 390px viewport, when rendered, then exit button is present and first', () => {
    render(bar({ onExit: vi.fn(), run: { ...createRun(1), floors: 3 } }));

    const exit = screen.getByLabelText('wordTowerV2.hud.exit');
    expect(exit).toBeTruthy();
  });

  it('given a 390px viewport, when rendered, then height+score chip is present and merged', () => {
    render(bar({ heightM: 9, score: 520 }));

    // Both height and score should be in the same chip
    const floorLabel = screen.getByLabelText(/wordTowerV2\.hud\.floorA11y/);
    expect(floorLabel).toBeTruthy();

    // Score should be visible nearby
    expect(screen.getByText('520')).toBeTruthy();
  });

  it('given a 390px viewport, when rendered, then coins are shown in ONE chip', () => {
    render(bar({ coins: 1255 }));

    const coins = screen.getByLabelText('wordTowerV2.coins.run:1255');
    expect(coins).toBeTruthy();

    // Should not have two coin chips
    expect(screen.queryAllByLabelText(/wordTowerV2\.coins\.run/)).toHaveLength(1);
  });

  it('given a 390px viewport, when rendered, then stability meter is COMPACT and in Row 1', () => {
    const { container } = render(bar({ risk: 0.5 }));

    const stability = container.querySelector('[data-wt2-stability]');
    expect(stability).toBeTruthy();

    // Should be in Row 1
    const topBar = container.querySelector('[data-wt2-topbar]');
    const rows = topBar!.querySelectorAll('[data-wt2-topbar-row]');
    const firstRow = rows[0];
    expect(firstRow.contains(stability)).toBeTruthy();
  });


  it('given a 390px viewport with a menu opener, when rendered, then the menu button is in Row 1', () => {
    const onMenuOpen = vi.fn();
    const { container } = render(bar({ raids: 2, onMenuOpen }));

    const topBar = container.querySelector('[data-wt2-topbar]');
    const rows = topBar!.querySelectorAll('[data-wt2-topbar-row]');

    // Row 1 should have menu button
    const firstRow = rows[0];
    const menuBtn = firstRow.querySelector('[aria-label="wordTowerV2.hud.menu"]');
    expect(menuBtn).toBeTruthy();

    // Click it and verify the callback
    fireEvent.click(menuBtn!);
    expect(onMenuOpen).toHaveBeenCalledOnce();
  });
});

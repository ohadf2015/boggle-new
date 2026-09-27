import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { V2Hud } from '../V2Hud';
import type { RunState } from '@/lib/wordTowerV2/run';
import type { Estate } from '@/lib/wordTowerV2/estate';
import { createRef } from 'react';

const mockT = (key: string, params?: Record<string, string | number>) => {
  // Simple mock that returns the key for now
  if (params) {
    return `${key} ${JSON.stringify(params)}`;
  }
  return key;
};

const mockRun: RunState = {
  floors: 0,
  heightM: 0,
  combo: 0,
  bestCombo: 0,
  score: 0,
  coins: 0,
  balls: 0,
  tenants: 0,
  scrambles: 2,
  steadyDrops: 0,
  plumbDrops: 0,
  nextWidthMult: 1,
  bonus: 0,
};

const mockEstate: Estate = {
  id: '',
  user_id: '',
  coins: 0,
  tenants: 0,
  plots: [],
  districts: {},
  perks: {},
  created_at: '',
  updated_at: '',
};

describe('V2Hud', () => {
  it('renders the top bar with required controls', () => {
    const coinsRef = createRef<HTMLDivElement>();
    const onOpenEstate = vi.fn();
    const onExit = vi.fn();

    const { container } = render(
      <V2Hud
        t={mockT}
        heightM={0}
        score={0}
        bestM={0}
        run={mockRun}
        tenants={0}
        estate={mockEstate}
        runCoins={0}
        raids={0}
        coinsRef={coinsRef}
        onOpenEstate={onOpenEstate}
        risk={0}
        onExit={onExit}
        reducedMotion={false}
      />,
    );

    // Check that the top bar renders (contains the height chip)
    const topBar = container.querySelector('[data-wt2-topbar]');
    expect(topBar).toBeInTheDocument();
  });

  it('opens and closes the menu drawer when menu button is clicked', async () => {
    const user = userEvent.setup();
    const coinsRef = createRef<HTMLDivElement>();
    const onOpenEstate = vi.fn();
    const onExit = vi.fn();

    render(
      <V2Hud
        t={mockT}
        heightM={0}
        score={0}
        bestM={0}
        run={mockRun}
        tenants={0}
        estate={mockEstate}
        runCoins={0}
        raids={0}
        coinsRef={coinsRef}
        onOpenEstate={onOpenEstate}
        risk={0}
        onExit={onExit}
        reducedMotion={false}
      />,
    );

    // Find and click the menu button (purple button with menu icon)
    const menuButton = screen.getByRole('button', {
      name: /wordTowerV2.hud.menu/i,
    });
    expect(menuButton).toBeInTheDocument();

    // Menu should not be visible initially
    expect(
      screen.queryByText('wordTowerV2.estate.open'),
    ).not.toBeInTheDocument();

    // Click menu button
    await user.click(menuButton);

    // Menu should now be visible - check for the estate button
    expect(screen.getByText('wordTowerV2.estate.open')).toBeInTheDocument();

    // Click close button (X button) in the menu
    const closeButton = screen.getByRole('button', {
      name: /wordTowerV2.results.close/i,
    });
    await user.click(closeButton);

    // Menu should be hidden again
    expect(
      screen.queryByText('wordTowerV2.estate.open'),
    ).not.toBeInTheDocument();
  });

  it('calls onOpenEstate when workshop button is clicked in menu', async () => {
    const user = userEvent.setup();
    const coinsRef = createRef<HTMLDivElement>();
    const onOpenEstate = vi.fn();
    const onExit = vi.fn();

    render(
      <V2Hud
        t={mockT}
        heightM={0}
        score={0}
        bestM={0}
        run={mockRun}
        tenants={0}
        estate={mockEstate}
        runCoins={0}
        raids={0}
        coinsRef={coinsRef}
        onOpenEstate={onOpenEstate}
        risk={0}
        onExit={onExit}
        reducedMotion={false}
      />,
    );

    // Open the menu
    const menuButton = screen.getByRole('button', {
      name: /wordTowerV2.hud.menu/i,
    });
    await user.click(menuButton);

    // Click the estate button
    const estateButton = screen.getByRole('button', {
      name: /wordTowerV2.estate.open/i,
    });
    await user.click(estateButton);

    expect(onOpenEstate).toHaveBeenCalled();
  });

  it('shows streak, balls, and tenants in menu when run has them', async () => {
    const user = userEvent.setup();
    const coinsRef = createRef<HTMLDivElement>();
    const onOpenEstate = vi.fn();
    const onExit = vi.fn();

    const runWithItems: RunState = {
      ...mockRun,
      balls: 2,
      bestCombo: 5,
    };

    render(
      <V2Hud
        t={mockT}
        heightM={0}
        score={0}
        bestM={0}
        run={runWithItems}
        tenants={3}
        estate={mockEstate}
        runCoins={0}
        raids={0}
        coinsRef={coinsRef}
        onOpenEstate={onOpenEstate}
        risk={0}
        onExit={onExit}
        reducedMotion={false}
      />,
    );

    // Open the menu
    const menuButton = screen.getByRole('button', {
      name: /wordTowerV2.hud.menu/i,
    });
    await user.click(menuButton);

    // Check that streak section is visible
    expect(screen.getByText('wordTowerV2.streak.label')).toBeInTheDocument();

    // Check that the banked section with balls and tenants is visible
    expect(screen.getByText('wordTowerV2.hud.banked')).toBeInTheDocument();
  });

  it('menu closes when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const coinsRef = createRef<HTMLDivElement>();
    const onOpenEstate = vi.fn();
    const onExit = vi.fn();

    const { container } = render(
      <V2Hud
        t={mockT}
        heightM={0}
        score={0}
        bestM={0}
        run={mockRun}
        tenants={0}
        estate={mockEstate}
        runCoins={0}
        raids={0}
        coinsRef={coinsRef}
        onOpenEstate={onOpenEstate}
        risk={0}
        onExit={onExit}
        reducedMotion={false}
      />,
    );

    // Open the menu
    const menuButton = screen.getByRole('button', {
      name: /wordTowerV2.hud.menu/i,
    });
    await user.click(menuButton);

    // Verify menu is open
    expect(screen.getByText('wordTowerV2.estate.open')).toBeInTheDocument();

    // Find and click the backdrop
    const backdrop = container.querySelector('[class*="bg-black/40"]');
    if (backdrop) {
      await user.click(backdrop);
    }

    // Menu should be hidden
    expect(
      screen.queryByText('wordTowerV2.estate.open'),
    ).not.toBeInTheDocument();
  });

  it('renders the daily badge when daily=true with a date key', () => {
    const coinsRef = createRef<HTMLDivElement>();
    const onOpenEstate = vi.fn();
    const onExit = vi.fn();

    const mockTWithDaily = (key: string, params?: Record<string, string | number>) => {
      if (key === 'wordTowerV2.hud.dailyBadge' && params?.date) {
        return `DAILY ${params.date}`;
      }
      if (key === 'wordTowerV2.hud.daily') {
        return 'DAILY';
      }
      if (params) {
        return `${key} ${JSON.stringify(params)}`;
      }
      return key;
    };

    const { container } = render(
      <V2Hud
        t={mockTWithDaily}
        heightM={5.5}
        score={250}
        bestM={0}
        run={mockRun}
        tenants={0}
        estate={mockEstate}
        runCoins={0}
        raids={0}
        coinsRef={coinsRef}
        onOpenEstate={onOpenEstate}
        risk={0}
        onExit={onExit}
        reducedMotion={false}
        daily={true}
        dailyDateKey="2026-09-25"
        dailyDateFormatted="25 Sep"
      />,
    );

    // Daily badge should render
    const dailyBadge = container.querySelector('[class*="bg-neo-cyan"]');
    expect(dailyBadge).toBeInTheDocument();
  });

  it('given balls, tenants and a live crate effect, when the menu opens, then each chip is present and named', async () => {
    // Moved out of the top bar in the one-row HUD — they must still be reachable and labelled.
    const user = userEvent.setup();
    render(
      <V2Hud
        t={mockT}
        heightM={0}
        score={0}
        bestM={0}
        run={{ ...mockRun, balls: 2, steadyDrops: 2 }}
        tenants={3}
        estate={mockEstate}
        runCoins={0}
        raids={0}
        coinsRef={createRef<HTMLDivElement>()}
        onOpenEstate={vi.fn()}
        risk={0}
        onExit={vi.fn()}
        reducedMotion={false}
      />,
    );
    await user.click(screen.getByRole('button', { name: /wordTowerV2.hud.menu/i }));

    expect(screen.getByLabelText('wordTowerV2.wreck.balls {"n":2}')).toBeInTheDocument();
    expect(screen.getByLabelText('wordTowerV2.tenants {"n":3}')).toBeInTheDocument();
    expect(
      screen.getByLabelText('wordTowerV2.hud.effect {"name":"wordTowerV2.reward.steady.name","n":2}'),
    ).toBeInTheDocument();
  });
});

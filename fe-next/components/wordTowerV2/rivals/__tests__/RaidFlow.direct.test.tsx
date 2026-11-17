import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { emptyEstate } from '@/lib/wordTowerV2/estate';
import type { UseEstate } from '../../useEstate';
import type { WreckUpdate } from '../../WreckCanvas';

let push: (u: WreckUpdate) => void = () => {};
const cut = vi.fn();
vi.mock('../../WreckCanvas', () => ({
  default: (p: { registerCut: (c: () => void) => void; onUpdate: (u: WreckUpdate) => void; targetIndex?: number | null }) => {
    p.registerCut(cut);
    push = p.onUpdate;
    return <div data-testid="wreck-canvas" data-target-index={p.targetIndex ?? ''} />;
  },
}));

vi.mock('@/components/Avatar', () => ({ default: () => null }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playSound: vi.fn() }) }));

import { RaidFlow } from '../RaidFlow';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);

const rival = {
  userId: 'u2',
  displayName: 'Joker',
  avatar: { avatarConfig: null, avatarEmoji: null, avatarColor: null, avatarImage: null },
  district: 3,
  plots: [],
  shields: 2,
  bestM: 53,
  lastTower: [
    { word: 'שמה', w: 200, x: 0, y: -60, angle: 0, color: 0x22e1ff },
    { word: 'רמו', w: 180, x: 0, y: -180, angle: 0, color: 0xff2e88 },
  ],
};

function api(overrides: Partial<UseEstate> & { charges?: number; coins?: number } = {}): UseEstate {
  const { charges = 1, coins = 800, ...rest } = overrides;
  return {
    status: 'ready',
    authed: true,
    estate: { ...emptyEstate(), coins, raidCharges: charges },
    perks: { baseWidthMult: 1, swayMult: 1, swingPeriodMult: 1, perfectWindowMult: 1, coinMult: 1, shieldCap: 0, scoreMult: 1, freeBraces: 0 },
    inbox: [],
    reportRun: vi.fn(),
    upgrade: vi.fn(),
    repair: vi.fn(),
    buyCharge: vi.fn().mockResolvedValue({ ok: true }),
    rivals: vi.fn(),
    raid: vi.fn(),
    markSeen: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
    ...rest,
  } as UseEstate;
}

const base = {
  t,
  rival,
  balls: 2,
  reducedMotion: true,
  onClose: vi.fn(),
};

describe('RaidFlow — straight into the swing', () => {
  beforeEach(() => {
    cut.mockClear();
    vi.clearAllMocks();
  });

  it('skips the floor-pick screen and opens the live wrecking-ball attack', async () => {
    render(<RaidFlow {...base} estate={api()} revenge grievance={{ blocked: true, coinsStolen: 0, plot: 'foundation' }} />);
    expect(await screen.findByTestId('wreck-canvas')).toBeTruthy();
    expect(screen.queryByText(/pickFloor/)).toBeNull();
    expect(screen.queryByText(/coachTip/)).toBeNull();
    expect(screen.queryByText(/goalRevenge|goalRaid|aimChip|aimAt/)).toBeNull();
    // Default mid-tower aim — no pre-called floor.
    const aimed = screen.getByTestId('wreck-canvas').getAttribute('data-target-index');
    expect(aimed === null || aimed === '').toBe(true);
  });

  it('keeps shield, prize and payback bonus in a compact header, with close clear of the mute corner', async () => {
    const { container } = render(
      <RaidFlow {...base} estate={api()} revenge grievance={{ blocked: true, coinsStolen: 0, plot: 'foundation' }} />,
    );
    await screen.findByTestId('wreck-canvas');
    const header = screen.getByTestId('raid-strike-header');
    expect(header.textContent).toMatch(/shieldsN.*"n":2/);
    expect(header.textContent).toMatch(/prizeShield|prizeLoot/);
    expect(header.textContent).toMatch(/revengeBonus/);
    const close = screen.getByTestId('wreck-close');
    expect(header).toContainElement(close);
    expect(close.className).not.toMatch(/\babsolute\b/);
    expect(container.querySelector('.absolute.end-3')).toBeNull();
  });

  it('lets the player cut the swinging ball without picking a floor first', async () => {
    render(<RaidFlow {...base} estate={api()} revenge grievance={{ blocked: true, coinsStolen: 0, plot: 'foundation' }} />);
    await screen.findByTestId('wreck-canvas');
    act(() => push({ wrecked: 0, total: 2, ballsLeft: 1, armed: true, done: false, hits: 0, onTarget: true, impact: null }));
    fireEvent.click(screen.getByRole('button', { name: 'wordTowerV2.wreck.cut' }));
    expect(cut).toHaveBeenCalled();
  });

  it('Given no charges on a normal raid, then buying is offered and the swing is held', async () => {
    render(<RaidFlow {...base} estate={api({ charges: 0, coins: 500 })} revenge={false} />);
    await screen.findByTestId('wreck-canvas');
    const buy = screen.getByText(/dailyTower.buyBall/);
    expect(buy).toBeTruthy();
    act(() => push({ wrecked: 0, total: 2, ballsLeft: 1, armed: true, done: false, hits: 0, onTarget: true, impact: null }));
    expect(screen.queryByRole('button', { name: 'wordTowerV2.wreck.cut' })).toBeNull();
  });

  it('Given a payback, then there is nothing to buy even with no charges', async () => {
    render(<RaidFlow {...base} estate={api({ charges: 0 })} revenge grievance={{ blocked: false, coinsStolen: 40, plot: 'vault' }} />);
    await screen.findByTestId('wreck-canvas');
    expect(screen.queryByText(/dailyTower.buyBall/)).toBeNull();
  });

  it('Given no charges and enough coins, when the player buys, then the swing is armed', async () => {
    const buyCharge = vi.fn().mockResolvedValue({ ok: true });
    function Harness() {
      const [charges, setCharges] = useState(0);
      const estate = api({
        charges,
        coins: 500,
        buyCharge: async () => {
          const r = await buyCharge();
          if (r.ok) setCharges(1);
          return r;
        },
      });
      return <RaidFlow {...base} estate={estate} revenge={false} />;
    }
    render(<Harness />);
    await screen.findByTestId('wreck-canvas');
    fireEvent.click(screen.getByText(/dailyTower.buyBall/).closest('button') as HTMLButtonElement);
    await waitFor(() => expect(buyCharge).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByText(/dailyTower.buyBall/)).toBeNull());
    act(() => push({ wrecked: 0, total: 2, ballsLeft: 1, armed: true, done: false, hits: 0, onTarget: true, impact: null }));
    expect(screen.getByRole('button', { name: 'wordTowerV2.wreck.cut' })).toBeTruthy();
  });
});

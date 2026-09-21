import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRun } from '@/lib/wordTowerV2/run';
import { emptyEstate } from '@/lib/wordTowerV2/estate';
import { V2TopBar } from '../V2TopBar';

afterEach(cleanup);

// Echo the key (plus params) so assertions read which copy was chosen.
const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const bar = (over: Partial<Parameters<typeof V2TopBar>[0]> = {}) => (
  <V2TopBar
    t={t}
    heightM={9}
    score={520}
    bestM={0}
    run={createRun(1)}
    tenants={0}
    estate={{ ...emptyEstate(), coins: 1200 }}
    runCoins={0}
    raids={0}
    coinsRef={{ current: null }}
    onOpenEstate={() => {}}
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
    render(bar({ runCoins: 55 }));

    expect(screen.getByLabelText('wordTowerV2.coins.run:1255')).toBeTruthy();
    // The old layout had a second, visually identical coin pill.
    expect(screen.queryAllByLabelText(/wordTowerV2\.coins\.run/)).toHaveLength(1);
  });

  it('given a perfect streak, when rendered, then the streak is a ring, not a full-width bar', () => {
    const { container } = render(bar({ run: { ...createRun(1), combo: 2 } }));

    const ring = container.querySelector('[data-wt2-streak-ring]');
    expect(ring).toBeTruthy();
    // A ring is square-ish; the old bar was w-[19.5rem].
    expect(ring?.getAttribute('class') ?? '').not.toMatch(/w-\[19\.5rem\]/);
  });

  it('given the empire has something waiting, when rendered, then the button badges it and opens on tap', () => {
    const onOpenEstate = vi.fn();
    render(bar({ raids: 2, onOpenEstate }));

    const open = screen.getByLabelText('wordTowerV2.estate.open');
    // Raids + damaged + affordable, so assert it counted SOMETHING, not an exact total.
    expect(Number(open.textContent)).toBeGreaterThanOrEqual(2);
    fireEvent.click(open);
    expect(onOpenEstate).toHaveBeenCalledOnce();
  });

  it('given nothing banked, when rendered, then the secondary chip row is absent entirely', () => {
    const { container } = render(bar({ run: { ...createRun(1), balls: 0 }, tenants: 0 }));

    expect(container.querySelector('[data-wt2-topbar-secondary]')).toBeNull();
  });

  it('given a live crate effect, when rendered, then the chip NAMES it, not just an icon', () => {
    render(bar({ run: { ...createRun(1), steadyDrops: 2 } }));

    // A lone glyph never said which effect the crate had bought.
    expect(screen.getByText('wordTowerV2.reward.steady.name')).toBeTruthy();
    expect(screen.getByLabelText('wordTowerV2.hud.effect:wordTowerV2.reward.steady.name,2')).toBeTruthy();
  });

  it('given balls and tenants banked, when rendered, then they share the secondary row', () => {
    render(bar({ run: { ...createRun(1), balls: 2 }, tenants: 3 }));

    expect(screen.getByLabelText('wordTowerV2.wreck.balls:2')).toBeTruthy();
    expect(screen.getByLabelText('wordTowerV2.tenants:3')).toBeTruthy();
  });

  it('given a tower close to going over, when rendered, then the stability meter reads DANGER with its risk', () => {
    const { container } = render(bar({ risk: 0.82 }));

    const meter = container.querySelector('[data-wt2-stability]')!;
    expect(meter.getAttribute('data-band')).toBe('danger');
    expect(meter.getAttribute('role')).toBe('meter');
    expect(meter.getAttribute('aria-valuenow')).toBe('82');
    expect(screen.getByText('wordTowerV2.stability.danger')).toBeTruthy();
  });

  it('given a plumb tower, when rendered, then the meter reads steady', () => {
    const { container } = render(bar({ risk: 0.05 }));
    expect(container.querySelector('[data-wt2-stability]')!.getAttribute('data-band')).toBe('steady');
  });

  it('given a run in progress, when the exit is tapped, then the game is asked to leave (the run banks on the way out)', () => {
    const onExit = vi.fn();
    render(bar({ onExit }));

    fireEvent.click(screen.getByLabelText('wordTowerV2.hud.exit'));
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('given the bar, then the meter and the streak share a status row that never comes and goes', () => {
    const { container } = render(bar({ run: { ...createRun(1), balls: 0 }, tenants: 0 }));
    const status = container.querySelector('[data-wt2-topbar-status]')!;
    expect(status.querySelector('[data-wt2-stability]')).toBeTruthy();
    expect(status.querySelector('[data-wt2-streak-ring]')).toBeTruthy();
  });
});

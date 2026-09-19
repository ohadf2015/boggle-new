import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createRun } from '@/lib/wordTowerV2/run';
import { V2Hud } from '../V2Hud';

afterEach(cleanup);

// Echo the key (plus params) so assertions read which copy was chosen.
const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const hud = (over: Partial<Parameters<typeof V2Hud>[0]> = {}) => (
  <V2Hud t={t} heightM={9} score={520} bestM={0} run={createRun(1)} tenants={0} {...over} />
);

describe('V2Hud', () => {
  it('given a 3-storey tower, when rendered, then the floor count leads and metres follow', () => {
    render(hud());
    expect(screen.getByLabelText('wordTowerV2.hud.floorA11y:3,9.0')).toBeTruthy();
    expect(screen.getByText('520')).toBeTruthy();
  });

  it('given banked crates, when rendered, then each live effect shows its drops left', () => {
    render(hud({ run: { ...createRun(1), steadyDrops: 2, plumbDrops: 1, nextWidthMult: 1.3 } }));
    expect(screen.getByLabelText('wordTowerV2.hud.effect:wordTowerV2.reward.steady.name,2')).toBeTruthy();
    expect(screen.getByLabelText('wordTowerV2.hud.effect:wordTowerV2.reward.plumb.name,1')).toBeTruthy();
    expect(screen.getByLabelText('wordTowerV2.hud.effect:wordTowerV2.reward.wide.name,1')).toBeTruthy();
  });

  it('given no crates, when rendered, then no effect chips', () => {
    render(hud());
    expect(screen.queryByLabelText(/wordTowerV2\.hud\.effect/)).toBeNull();
  });

  it('given a combo under two, when rendered, then no combo meter; at two, it shows', () => {
    const { rerender } = render(hud({ run: { ...createRun(1), combo: 1 } }));
    expect(screen.queryByLabelText('wordTower.a11y.combo:1')).toBeNull();
    rerender(hud({ run: { ...createRun(1), combo: 2 } }));
    expect(screen.getByLabelText('wordTower.a11y.combo:2')).toBeTruthy();
  });
});

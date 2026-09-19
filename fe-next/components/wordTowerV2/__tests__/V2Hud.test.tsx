import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { V2GameOver, V2Hud } from '../V2Hud';

afterEach(cleanup);

// Echo the key (plus params) so assertions read which copy was chosen.
const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const hud = (over: Partial<Parameters<typeof V2Hud>[0]> = {}) => (
  <V2Hud
    t={t}
    heightM={4.2}
    score={520}
    bestM={0}
    combo={0}
    scrambles={3}
    biome="city"
    landing={null}
    surprise={null}
    newBest={false}
    {...over}
  />
);

describe('V2Hud', () => {
  it('given a perfect landing with points, when rendered, then the verdict and its payout show', () => {
    render(hud({ landing: { key: 1, quality: 'perfect', points: 100, combo: 2 } }));
    expect(screen.getByText('wordTower.crane.perfect')).toBeTruthy();
    expect(screen.getByText('+100')).toBeTruthy();
  });

  it('given a surprise, when rendered, then its name and every payout part are listed', () => {
    render(hud({ surprise: { key: 1, event: 'crystal', points: 200, scrambles: 1, widthMult: 1 } }));
    expect(screen.getByText('wordTower.surprise.crystal')).toBeTruthy();
    expect(screen.getByText('+200 · wordTowerV2.plusScramble:1')).toBeTruthy();
  });

  it('given a combo under two, when rendered, then no combo chip', () => {
    render(hud({ combo: 1 }));
    expect(screen.queryByLabelText('wordTower.a11y.combo:1')).toBeNull();
  });

  it('given a climb into a new biome, when re-rendered, then the zone toast names it', () => {
    const { rerender } = render(hud());
    expect(screen.queryByText('wordTower.zone.entered')).toBeNull();
    rerender(hud({ biome: 'sky' }));
    expect(screen.getByText('wordTower.biome.sky')).toBeTruthy();
  });
});

describe('V2Hud toasts never stick', () => {
  afterEach(() => vi.useRealTimers());

  it('given a verdict, when its time passes, then it clears', () => {
    vi.useFakeTimers();
    render(hud({ landing: { key: 1, quality: 'good', points: 0, combo: 0 } }));
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByText('wordTower.crane.good')).toBeNull();
  });

  it('given a verdict, when the event is reset mid-show, then it clears at once', () => {
    vi.useFakeTimers();
    const { rerender } = render(hud({ landing: { key: 1, quality: 'good', points: 0, combo: 0 } }));
    rerender(hud({ landing: null }));
    expect(screen.queryByText('wordTower.crane.good')).toBeNull();
  });

  it('given height jitter across a biome line, when it flips back and forth, then the zone toasts once', () => {
    vi.useFakeTimers();
    const { rerender } = render(hud());
    rerender(hud({ biome: 'sky' }));
    act(() => vi.advanceTimersByTime(3000));
    rerender(hud({ biome: 'city' }));
    rerender(hud({ biome: 'sky' }));
    expect(screen.queryByText('wordTower.zone.entered')).toBeNull();
  });
});

describe('V2GameOver', () => {
  it('given the results panel, when play again is pressed, then the run restarts', () => {
    const onRestart = vi.fn();
    render(<V2GameOver t={t} peakM={6.3} score={675} bestM={6.3} bestCombo={2} isBest onRestart={onRestart} />);
    expect(screen.getByText('wordTowerV2.collapsed')).toBeTruthy();
    fireEvent.click(screen.getByText('common.playAgain'));
    expect(onRestart).toHaveBeenCalledOnce();
  });
});

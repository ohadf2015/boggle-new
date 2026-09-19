import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { V2Celebrations } from '../V2Celebrations';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

describe('V2Celebrations callout lane', () => {
  it('given a landing callout with points, when rendered, then the copy and payout show', () => {
    render(<V2Celebrations t={t} callout={{ key: 1, textKey: 'wordTowerV2.call.perfect.2', tone: 'lime', points: 100 }} banners={[]} onBannerDone={() => {}} />);
    expect(screen.getByText('wordTowerV2.call.perfect.2')).toBeTruthy();
    expect(screen.getByText('+100')).toBeTruthy();
  });

  it('given a callout, when its time passes, then it clears (never sticks)', () => {
    vi.useFakeTimers();
    render(<V2Celebrations t={t} callout={{ key: 1, textKey: 'wordTowerV2.call.good.0', tone: 'cyan', points: 0 }} banners={[]} onBannerDone={() => {}} />);
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByText('wordTowerV2.call.good.0')).toBeNull();
  });

  it('given a callout, when the run resets mid-show, then it clears at once', () => {
    const { rerender } = render(<V2Celebrations t={t} callout={{ key: 1, textKey: 'wordTowerV2.call.good.0', tone: 'cyan', points: 0 }} banners={[]} onBannerDone={() => {}} />);
    rerender(<V2Celebrations t={t} callout={null} banners={[]} onBannerDone={() => {}} />);
    expect(screen.queryByText('wordTowerV2.call.good.0')).toBeNull();
  });
});

describe('V2Celebrations banner lane', () => {
  it('given a crate banner, when rendered, then its name and what it does are spelled out', () => {
    render(<V2Celebrations t={t} callout={null} banners={[{ key: 1, kind: 'reward', id: 'plumb', priority: 2 }]} onBannerDone={() => {}} />);
    expect(screen.getByText('wordTowerV2.reward.plumb.name')).toBeTruthy();
    expect(screen.getByText('wordTowerV2.reward.plumb.desc')).toBeTruthy();
  });

  it('given a queue, when rendered, then only the head shows, and it reports done after its time', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(
      <V2Celebrations
        t={t}
        callout={null}
        banners={[
          { key: 1, kind: 'achievement', id: 'highRise', priority: 4 },
          { key: 2, kind: 'zone', id: 'clouds', priority: 1 },
        ]}
        onBannerDone={onDone}
      />,
    );
    expect(screen.getByText('wordTowerV2.ach.highRise.name')).toBeTruthy();
    expect(screen.queryByText('wordTowerV2.biome.clouds')).toBeNull();
    act(() => vi.advanceTimersByTime(3000));
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('given a new sky, when bannered, then the sky is named', () => {
    render(<V2Celebrations t={t} callout={null} banners={[{ key: 1, kind: 'zone', id: 'aurora', priority: 1 }]} onBannerDone={() => {}} />);
    expect(screen.getByText('wordTowerV2.biome.aurora')).toBeTruthy();
  });
});

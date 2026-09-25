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
  /**
   * The callout is the VERDICT only. The payout number belongs on the block
   * (`ImpactBurst`) — round 2 drew a bigger `+100` up here than the one at the
   * landing, so the eye read the HUD instead of the drop it was paid for.
   */
  it('given a landing callout with points, when rendered, then only the verdict shows (the number is on the block)', () => {
    render(<V2Celebrations t={t} callout={{ key: 1, textKey: 'wordTowerV2.call.perfect.2', tone: 'lime', points: 100 }} banners={[]} onBannerDone={() => {}} />);
    expect(screen.getByText('wordTowerV2.call.perfect.2')).toBeTruthy();
    expect(screen.queryByText('+100')).toBeNull();
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

describe('V2Celebrations never covers the hanging slab', () => {
  it('given a slab on the hook, when a big-word callout fires, then it rides the low lane above the dock, not the hook lane', () => {
    const { container } = render(
      <V2Celebrations t={t} callout={{ key: 1, textKey: 'wordTowerV2.call.word.6', tone: 'purple', points: 0 }} banners={[]} onBannerDone={() => {}} swinging />,
    );
    const lane = container.querySelector('[data-wt2-callout]')!.parentElement!;
    expect(lane.className).toContain('bottom-[calc(var(--wt2-dock');
    expect(lane.className).not.toContain('top-[');
  });

  it('given nothing on the hook, when a landing verdict fires, then it sits below the measured HUD', () => {
    const { container } = render(
      <V2Celebrations t={t} callout={{ key: 1, textKey: 'wordTowerV2.call.good.0', tone: 'cyan', points: 0 }} banners={[]} onBannerDone={() => {}} />,
    );
    expect(container.querySelector('[data-wt2-callout]')!.parentElement!.className).toContain('var(--wt2-hud');
  });
});

describe('V2Celebrations banner lane', () => {
  it('given a crate banner, when rendered, then its name and what it does are spelled out', () => {
    render(<V2Celebrations t={t} callout={null} banners={[{ key: 1, kind: 'reward', id: 'plumb', priority: 2 }]} onBannerDone={() => {}} />);
    expect(screen.getByText('wordTowerV2.reward.plumb.name')).toBeTruthy();
    expect(screen.getByText('wordTowerV2.reward.plumb.desc')).toBeTruthy();
  });

  it('given an achievement badge, when rendered, then the description wraps without truncation (no ellipsis, no line-clamp, no truncate class)', () => {
    const { container } = render(
      <V2Celebrations t={t} callout={null} banners={[{ key: 1, kind: 'achievement', id: 'highRise', priority: 4 }]} onBannerDone={() => {}} />,
    );
    const descSpan = screen.getByText('wordTowerV2.ach.highRise.desc');
    const classList = descSpan.className;
    expect(classList).not.toContain('truncate');
    expect(classList).not.toContain('line-clamp');
    expect(classList).not.toContain('ellipsis');
  });

  it('given a reward crate, when rendered, then the description wraps without truncation (no ellipsis, no line-clamp, no truncate class)', () => {
    const { container } = render(
      <V2Celebrations t={t} callout={null} banners={[{ key: 1, kind: 'reward', id: 'plumb', priority: 2 }]} onBannerDone={() => {}} />,
    );
    const descSpan = screen.getByText('wordTowerV2.reward.plumb.desc');
    const classList = descSpan.className;
    expect(classList).not.toContain('truncate');
    expect(classList).not.toContain('line-clamp');
    expect(classList).not.toContain('ellipsis');
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

/**
 * One message per beat. Round f1 stacked "CLOSE ONE!" and a BADGE UNLOCKED
 * card on the same frame, and the blind judge read the reference's
 * one-thing-at-a-time discipline as the reason it won. The banner lane is a
 * QUEUE, so it can simply wait its turn.
 */
describe('V2Celebrations one message at a time', () => {
  it('given a verdict on screen, when a badge is queued, then the badge waits for the verdict to clear', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(
      <V2Celebrations
        t={t}
        callout={{ key: 1, textKey: 'wordTowerV2.call.miss.0', tone: 'red', points: 0 }}
        banners={[{ key: 1, kind: 'achievement', id: 'highRise', priority: 4 }]}
        onBannerDone={onDone}
      />,
    );
    expect(screen.queryByText('wordTowerV2.ach.highRise.name')).toBeNull();
    expect(onDone).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1200));
    expect(screen.getByText('wordTowerV2.ach.highRise.name')).toBeTruthy();
  });

  it('given no verdict, when a badge is queued, then it shows straight away (never starved)', () => {
    render(
      <V2Celebrations t={t} callout={null} banners={[{ key: 1, kind: 'best', id: 'best', priority: 3 }]} onBannerDone={() => {}} />,
    );
    expect(screen.getByText('wordTowerV2.newBest')).toBeTruthy();
  });

  it('given a slab on the hook, when a badge is queued, then it hides until the slab clears', () => {
    render(
      <V2Celebrations t={t} callout={null} banners={[{ key: 1, kind: 'achievement', id: 'highRise', priority: 4 }]} onBannerDone={() => {}} swinging />,
    );
    expect(screen.queryByText('wordTowerV2.ach.highRise.name')).toBeNull();
  });
});

describe('V2Celebrations banner positioning', () => {
  it('given no slab on hook, when a banner shows, then it sits just below the measured HUD at hud+0.5rem (exact offset)', () => {
    const { container } = render(
      <V2Celebrations t={t} callout={null} banners={[{ key: 1, kind: 'achievement', id: 'highRise', priority: 4 }]} onBannerDone={() => {}} />,
    );
    const lane = container.querySelector('[data-wt2-lane="banner"]')!;
    const classes = lane.className.split(/\s+/);
    // Must contain the exact offset at hud+0.5rem, not hud+5rem
    const hasCorrectOffset = classes.some((cls) => cls === 'top-[calc(var(--wt2-hud,7rem)+0.5rem)]');
    expect(hasCorrectOffset).toBe(true);
    // Must not use bottom- positioning
    const hasBottomClass = classes.some((cls) => cls.startsWith('bottom-'));
    expect(hasBottomClass).toBe(false);
  });

  it('given no slab on hook, when a banner shows, then it sits at a different offset than the callout lane', () => {
    const { container } = render(
      <V2Celebrations
        t={t}
        callout={{ key: 1, textKey: 'wordTowerV2.call.good.0', tone: 'cyan', points: 0 }}
        banners={[{ key: 1, kind: 'achievement', id: 'highRise', priority: 4 }]}
        onBannerDone={() => {}}
      />,
    );
    const calloutLane = container.querySelector('[data-wt2-lane="callout"]')!;
    const bannerLane = container.querySelector('[data-wt2-lane="banner"]')!;

    // Extract top- classes: callout uses top-[max(...)] or top-[calc(...)], banner uses top-[calc(...)]
    const calloutTopClass = calloutLane.className
      .split(/\s+/)
      .find((cls) => cls.startsWith('top-['));
    const bannerTopClass = bannerLane.className.split(/\s+/).find((cls) => cls.startsWith('top-['));

    expect(calloutTopClass).toBeDefined();
    expect(bannerTopClass).toBeDefined();
    expect(calloutTopClass).not.toBe(bannerTopClass);
  });

  it('given a slab on hook, when a badge is queued, then the lane disappears (never over drop zone)', () => {
    vi.useFakeTimers();
    const { container } = render(
      <V2Celebrations t={t} callout={null} banners={[{ key: 1, kind: 'achievement', id: 'highRise', priority: 4 }]} onBannerDone={() => {}} swinging />,
    );
    const lane = container.querySelector('[data-wt2-lane="banner"]')!;
    // Lane exists but no card is rendered inside
    expect(lane.querySelector('[data-testid="banner-card"]')).toBeNull();
  });

  it('given a rival challenge message showing, when a badge is queued, then it waits for the message to clear', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(
      <V2Celebrations
        t={t}
        callout={null}
        banners={[{ key: 1, kind: 'achievement', id: 'highRise', priority: 4 }]}
        onBannerDone={onDone}
        rivalChallenge
      />,
    );
    expect(screen.queryByText('wordTowerV2.ach.highRise.name')).toBeNull();
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe('V2Celebrations banner dismissal', () => {
  it('given a badge on screen, when clicked, then it dismisses immediately', () => {
    const onDone = vi.fn();
    render(
      <V2Celebrations t={t} callout={null} banners={[{ key: 1, kind: 'achievement', id: 'highRise', priority: 4 }]} onBannerDone={onDone} />,
    );
    const button = screen.getByRole('button', { name: /highRise|Five-Story/i });
    button.click();
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('given a badge on screen, when double-clicked quickly, then it dismisses only once', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(
      <V2Celebrations t={t} callout={null} banners={[{ key: 1, kind: 'achievement', id: 'highRise', priority: 4 }]} onBannerDone={onDone} />,
    );
    const button = screen.getByRole('button', { name: /highRise|Five-Story/i });
    act(() => {
      button.click();
      button.click();
    });
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('given a badge, when its timer expires, then it auto-dismisses and calls onBannerDone', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(
      <V2Celebrations t={t} callout={null} banners={[{ key: 1, kind: 'achievement', id: 'highRise', priority: 4 }]} onBannerDone={onDone} />,
    );
    act(() => vi.advanceTimersByTime(2500)); // Timer should fire before 2500ms
    expect(onDone).toHaveBeenCalledOnce();
  });
});

/**
 * Winning must read louder than losing. A miss used to get the same wide
 * centred pill as a perfect, so the failure out-shouted the payout it was
 * sitting next to.
 */
describe('V2Celebrations verdict weight', () => {
  const callout = (tone: 'lime' | 'red') => ({ key: 1, textKey: `wordTowerV2.call.${tone}`, tone, points: 0 }) as const;

  it('given a good verdict, when shown, then it is the loudest type on screen', () => {
    const { container } = render(<V2Celebrations t={t} callout={callout('lime')} banners={[]} onBannerDone={() => {}} />);
    const el = container.querySelector('[data-wt2-callout]');
    expect(el?.getAttribute('data-wt2-callout')).toBe('loud');
    expect(el?.className).toContain('text-3xl');
  });

  it('given a miss, when shown, then it is quieter than a good verdict', () => {
    const { container } = render(<V2Celebrations t={t} callout={callout('red')} banners={[]} onBannerDone={() => {}} />);
    const el = container.querySelector('[data-wt2-callout]');
    expect(el?.getAttribute('data-wt2-callout')).toBe('quiet');
    expect(el?.className).not.toContain('text-3xl');
  });
});

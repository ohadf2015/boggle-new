import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { MpBragStrip } from '../MpBragStrip';

const trackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...a: unknown[]) => trackGrowthEvent(...a),
}));
vi.mock('@/utils/share', () => ({
  getBragShareUrl: () => 'https://lexiclash.live/en/brag/ROOM?utm_source=brag_card',
  trackShareCompleted: vi.fn(),
}));

describe('MpBragStrip visibility threshold', () => {
  let observerCb: IntersectionObserverCallback | null = null;
  beforeEach(() => {
    trackGrowthEvent.mockClear();
    observerCb = null;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          observerCb = cb;
        }
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  const base = {
    visible: true,
    gameCode: 'ABCD',
    gameMode: 'classic',
    language: 'en',
    isWinner: true,
    rank: 1,
    playerCount: 2,
    score: 100,
    wordsFound: 5,
    current: { name: 'me', score: 100 },
    opponent: { name: 'you', score: 80 },
    modeLabel: 'CLASSIC',
    t: (k: string) => k,
  };

  it('does not fire impression for a sub-threshold peek (<0.25)', () => {
    render(<MpBragStrip {...base} />);
    observerCb?.(
      [{ isIntersecting: true, intersectionRatio: 0.1 } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    expect(trackGrowthEvent).not.toHaveBeenCalledWith('mp_brag_card_viewed', expect.anything());
  });

  it('fires impression once at >=0.25 visibility', () => {
    render(<MpBragStrip {...base} />);
    observerCb?.(
      [{ isIntersecting: true, intersectionRatio: 0.25 } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    expect(trackGrowthEvent).toHaveBeenCalledWith(
      'mp_brag_card_viewed',
      expect.objectContaining({ outcome: expect.any(String) }),
    );
    observerCb?.(
      [{ isIntersecting: true, intersectionRatio: 0.9 } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    expect(trackGrowthEvent.mock.calls.filter((c) => c[0] === 'mp_brag_card_viewed')).toHaveLength(1);
  });
});

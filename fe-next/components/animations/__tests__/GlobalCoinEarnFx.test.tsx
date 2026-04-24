/**
 * GlobalCoinEarnFx — thin bridge: listens to `lexiclash:coin-earned`,
 * plays sound (policy), resolves source/target positions (policy),
 * delegates particle rendering to SharedFxApp.spawnCoinStream (engine).
 */
import { render, act } from '@testing-library/react';

const { playCoinCollectMock, playCoinCascadeMock, spawnCoinStreamMock } = vi.hoisted(() => ({
  playCoinCollectMock: vi.fn(),
  playCoinCascadeMock: vi.fn(),
  spawnCoinStreamMock: vi.fn(),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playCoinCollectSound: playCoinCollectMock,
    playCoinCascadeSound: playCoinCascadeMock,
  }),
}));

vi.mock('@/lib/pixiFx/SharedFxApp', () => ({
  SharedFxApp: {
    spawnCoinStream: spawnCoinStreamMock,
  },
}));

import GlobalCoinEarnFx, { COIN_EARNED_EVENT } from '../GlobalCoinEarnFx';

function removeExtraChildren() {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
}

describe('GlobalCoinEarnFx', () => {
  beforeEach(() => {
    playCoinCollectMock.mockClear();
    playCoinCascadeMock.mockClear();
    spawnCoinStreamMock.mockClear();
    removeExtraChildren();
  });

  it('plays coin-collect sound on each coin-earned event', () => {
    render(<GlobalCoinEarnFx />);
    act(() => {
      window.dispatchEvent(
        new CustomEvent(COIN_EARNED_EVENT, { detail: { amount: 25 } }),
      );
    });
    expect(playCoinCollectMock).toHaveBeenCalledTimes(1);
    expect(playCoinCascadeMock).not.toHaveBeenCalled();
  });

  it('plays coin-cascade sound for large amounts (>= 100)', () => {
    render(<GlobalCoinEarnFx />);
    act(() => {
      window.dispatchEvent(
        new CustomEvent(COIN_EARNED_EVENT, { detail: { amount: 250 } }),
      );
    });
    expect(playCoinCascadeMock).toHaveBeenCalledTimes(1);
  });

  it('ignores events with amount <= 0', () => {
    render(<GlobalCoinEarnFx />);
    act(() => {
      window.dispatchEvent(
        new CustomEvent(COIN_EARNED_EVENT, { detail: { amount: 0 } }),
      );
      window.dispatchEvent(
        new CustomEvent(COIN_EARNED_EVENT, { detail: { amount: -5 } }),
      );
    });
    expect(playCoinCollectMock).not.toHaveBeenCalled();
    expect(playCoinCascadeMock).not.toHaveBeenCalled();
    expect(spawnCoinStreamMock).not.toHaveBeenCalled();
  });

  it('delegates particle rendering to SharedFxApp.spawnCoinStream', () => {
    const counter = document.createElement('div');
    counter.setAttribute('data-coin-counter', 'true');
    Object.defineProperty(counter, 'getBoundingClientRect', {
      value: () => ({
        left: 300, top: 20, width: 40, height: 40,
        right: 340, bottom: 60, x: 300, y: 20, toJSON: () => ({}),
      }),
    });
    document.body.appendChild(counter);

    render(<GlobalCoinEarnFx />);
    act(() => {
      window.dispatchEvent(
        new CustomEvent(COIN_EARNED_EVENT, {
          detail: { amount: 25, source: { x: 100, y: 400 } },
        }),
      );
    });

    expect(spawnCoinStreamMock).toHaveBeenCalledTimes(1);
    const arg = spawnCoinStreamMock.mock.calls[0][0];
    expect(arg.source).toEqual({ x: 100, y: 400 });
    expect(arg.target).toEqual({ x: 320, y: 40 });
    expect(arg.count).toBeGreaterThanOrEqual(4);
    expect(arg.count).toBeLessThanOrEqual(10);
  });

  it('scales count with amount (4 ≤ count ≤ 10)', () => {
    render(<GlobalCoinEarnFx />);
    act(() => {
      window.dispatchEvent(
        new CustomEvent(COIN_EARNED_EVENT, { detail: { amount: 500 } }),
      );
    });
    expect(spawnCoinStreamMock.mock.calls[0][0].count).toBe(10);
  });

  it('falls back to viewport-top-right when no counter present', () => {
    render(<GlobalCoinEarnFx />);
    act(() => {
      window.dispatchEvent(
        new CustomEvent(COIN_EARNED_EVENT, { detail: { amount: 25 } }),
      );
    });
    const arg = spawnCoinStreamMock.mock.calls[0][0];
    expect(arg.target.x).toBe(window.innerWidth - 40);
    expect(arg.target.y).toBe(40);
  });

  it('falls back to viewport center for source when detail.source omitted', () => {
    render(<GlobalCoinEarnFx />);
    act(() => {
      window.dispatchEvent(
        new CustomEvent(COIN_EARNED_EVENT, { detail: { amount: 25 } }),
      );
    });
    const arg = spawnCoinStreamMock.mock.calls[0][0];
    expect(arg.source.x).toBe(window.innerWidth / 2);
    expect(arg.source.y).toBe(window.innerHeight / 2);
  });
});

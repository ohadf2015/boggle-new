/**
 * GlobalCoinEarnFx — bridge: listens to `lexiclash:coin-earned`, plays sound
 * (always), then picks a visual: WebGL stream (web, FX active), DOM fallback
 * (native), or nothing (reduced motion / low-end). Defaults below simulate
 * "web with the FX layer mounted", which is the common case.
 */
import { render, screen, act } from '@testing-library/react';

const {
  playCoinCollectMock, playCoinCascadeMock, spawnCoinStreamMock,
  isInitializedMock, isNativeMock, reducedMock,
} = vi.hoisted(() => ({
  playCoinCollectMock: vi.fn(),
  playCoinCascadeMock: vi.fn(),
  spawnCoinStreamMock: vi.fn(),
  isInitializedMock: vi.fn(() => true),
  isNativeMock: vi.fn(() => false),
  reducedMock: vi.fn(() => false),
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
    isInitialized: () => isInitializedMock(),
  },
}));

vi.mock('@/utils/platform', () => ({ isNative: () => isNativeMock() }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => reducedMock() }));

import GlobalCoinEarnFx, { COIN_EARNED_EVENT } from '../GlobalCoinEarnFx';

function removeExtraChildren() {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
}

function fire(detail: { amount: number; source?: { x: number; y: number } }) {
  act(() => {
    window.dispatchEvent(new CustomEvent(COIN_EARNED_EVENT, { detail }));
  });
}

describe('GlobalCoinEarnFx', () => {
  beforeEach(() => {
    playCoinCollectMock.mockClear();
    playCoinCascadeMock.mockClear();
    spawnCoinStreamMock.mockClear();
    isInitializedMock.mockReturnValue(true);
    isNativeMock.mockReturnValue(false);
    reducedMock.mockReturnValue(false);
    removeExtraChildren();
  });

  it('plays coin-collect sound on each coin-earned event', () => {
    render(<GlobalCoinEarnFx />);
    fire({ amount: 25 });
    expect(playCoinCollectMock).toHaveBeenCalledTimes(1);
    expect(playCoinCascadeMock).not.toHaveBeenCalled();
  });

  it('plays coin-cascade sound for large amounts (>= 100)', () => {
    render(<GlobalCoinEarnFx />);
    fire({ amount: 250 });
    expect(playCoinCascadeMock).toHaveBeenCalledTimes(1);
  });

  it('ignores events with amount <= 0', () => {
    render(<GlobalCoinEarnFx />);
    fire({ amount: 0 });
    fire({ amount: -5 });
    expect(playCoinCollectMock).not.toHaveBeenCalled();
    expect(playCoinCascadeMock).not.toHaveBeenCalled();
    expect(spawnCoinStreamMock).not.toHaveBeenCalled();
  });

  it('delegates particle rendering to SharedFxApp.spawnCoinStream when FX active', () => {
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
    fire({ amount: 25, source: { x: 100, y: 400 } });

    expect(spawnCoinStreamMock).toHaveBeenCalledTimes(1);
    const arg = spawnCoinStreamMock.mock.calls[0][0];
    expect(arg.source).toEqual({ x: 100, y: 400 });
    expect(arg.target).toEqual({ x: 320, y: 40 });
    expect(arg.count).toBeGreaterThanOrEqual(4);
    expect(arg.count).toBeLessThanOrEqual(10);
  });

  it('scales count with amount (4 ≤ count ≤ 10)', () => {
    render(<GlobalCoinEarnFx />);
    fire({ amount: 500 });
    expect(spawnCoinStreamMock.mock.calls[0][0].count).toBe(10);
  });

  it('falls back to viewport-top-right when no counter present', () => {
    render(<GlobalCoinEarnFx />);
    fire({ amount: 25 });
    const arg = spawnCoinStreamMock.mock.calls[0][0];
    expect(arg.target.x).toBe(window.innerWidth - 40);
    expect(arg.target.y).toBe(40);
  });

  it('falls back to viewport center for source when detail.source omitted', () => {
    render(<GlobalCoinEarnFx />);
    fire({ amount: 25 });
    const arg = spawnCoinStreamMock.mock.calls[0][0];
    expect(arg.source.x).toBe(window.innerWidth / 2);
    expect(arg.source.y).toBe(window.innerHeight / 2);
  });

  // --- visual-mode matrix ---

  it('renders the DOM fallback on native when the WebGL layer is inactive', () => {
    isInitializedMock.mockReturnValue(false);
    isNativeMock.mockReturnValue(true);
    render(<GlobalCoinEarnFx />);
    fire({ amount: 50 });
    expect(playCoinCollectMock).toHaveBeenCalled();
    expect(spawnCoinStreamMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('dom-coin-burst')).toBeInTheDocument();
  });

  it('reduced motion plays sound only — no WebGL, no DOM fallback', () => {
    reducedMock.mockReturnValue(true);
    isNativeMock.mockReturnValue(true);
    isInitializedMock.mockReturnValue(false);
    render(<GlobalCoinEarnFx />);
    fire({ amount: 50 });
    expect(playCoinCollectMock).toHaveBeenCalled();
    expect(spawnCoinStreamMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('dom-coin-burst')).toBeNull();
  });

  it('low-end web (no FX, not native) plays sound only', () => {
    isInitializedMock.mockReturnValue(false);
    isNativeMock.mockReturnValue(false);
    render(<GlobalCoinEarnFx />);
    fire({ amount: 50 });
    expect(playCoinCollectMock).toHaveBeenCalled();
    expect(spawnCoinStreamMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('dom-coin-burst')).toBeNull();
  });
});

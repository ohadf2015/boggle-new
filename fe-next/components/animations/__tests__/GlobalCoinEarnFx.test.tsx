/**
 * GlobalCoinEarnFx — global listener that plays a coin sound + flying-coin
 * VFX every time the CoinContext dispatches `lexiclash:coin-earned`.
 *
 * Contract:
 * - Plays the coin-collect sound on every event.
 * - Plays the bigger coin-cascade sound when amount >= 100.
 * - Renders flying-coin sprites that animate toward the element tagged with
 *   data-coin-counter.
 */
import { render, act } from '@testing-library/react';

const playCoinCollectMock = vi.fn();
const playCoinCascadeMock = vi.fn();

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playCoinCollectSound: playCoinCollectMock,
    playCoinCascadeSound: playCoinCascadeMock,
  }),
}));

import GlobalCoinEarnFx, { COIN_EARNED_EVENT } from '../GlobalCoinEarnFx';

describe('GlobalCoinEarnFx', () => {
  beforeEach(() => {
    playCoinCollectMock.mockClear();
    playCoinCascadeMock.mockClear();
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
  });

  it('renders a flying-coin layer when an event fires', () => {
    const { container } = render(
      <div>
        <GlobalCoinEarnFx />
        <div data-coin-counter="true" style={{ position: 'fixed', top: 0, right: 0 }} />
      </div>,
    );
    act(() => {
      window.dispatchEvent(
        new CustomEvent(COIN_EARNED_EVENT, { detail: { amount: 25 } }),
      );
    });
    expect(container.querySelector('[data-testid="coin-earn-fx-layer"]')).not.toBeNull();
  });
});

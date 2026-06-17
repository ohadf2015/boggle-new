import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { CoinRewardHud } from './CoinRewardHud';

// CoinRewardHud uses requestAnimationFrame for the roll-up animation.
// Passing `undefined` as the timestamp makes p=NaN in the tick function,
// so the `if (p < 1)` guard is false and it immediately calls setDisplay(total).
// This lets waitFor() resolve without an infinite animation loop.
vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(cb, 0) as unknown as number);
vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));

afterEach(() => cleanup());

const baseProps = {
  total: 1234,
  delta: 200,
  tier: 'normal' as const,
  anchor: { x: 100, y: 40 },
  language: 'en',
  onDone: () => {},
};

describe('CoinRewardHud', () => {
  it('GIVEN reduced motion THEN shows the final total immediately, comma-formatted', () => {
    render(<CoinRewardHud {...baseProps} reduced calm={false} />);
    // 1234 with thousands separator
    expect(screen.getByTestId('coin-hud-total')).toHaveTextContent('1,234');
  });

  it('GIVEN a delta THEN renders the +amount indicator, comma-formatted', () => {
    render(<CoinRewardHud {...baseProps} total={5200} delta={1500} reduced calm={false} />);
    expect(screen.getByTestId('coin-hud-delta')).toHaveTextContent('+1,500');
  });

  it('GIVEN non-reduced THEN eventually rolls up to the final total', async () => {
    render(
      <CoinRewardHud {...baseProps} total={1000} delta={1000} reduced={false} calm={false} countDuration={50} />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('coin-hud-total')).toHaveTextContent('1,000');
    });
  });

  it('GIVEN jackpot tier AND not calm THEN renders the jackpot flair', () => {
    render(<CoinRewardHud {...baseProps} tier="jackpot" reduced calm={false} />);
    expect(screen.getByTestId('coin-hud-jackpot')).toBeInTheDocument();
  });

  it('GIVEN jackpot tier BUT calm mode THEN suppresses the jackpot flair', () => {
    render(<CoinRewardHud {...baseProps} tier="jackpot" reduced calm />);
    expect(screen.queryByTestId('coin-hud-jackpot')).not.toBeInTheDocument();
  });

  it('GIVEN mount THEN calls onDone after the moment ends', async () => {
    const onDone = vi.fn();
    render(
      <CoinRewardHud {...baseProps} reduced calm={false} countDuration={20} onDone={onDone} />,
    );
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), { timeout: 3000 });
  });

  it('GIVEN a screen-reader region THEN announces the new total politely', () => {
    render(<CoinRewardHud {...baseProps} total={9999} delta={1} reduced calm={false} />);
    const live = screen.getByRole('status');
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).toHaveTextContent('9,999');
  });

  it('GIVEN large total THEN formats with multiple separators', () => {
    render(<CoinRewardHud {...baseProps} total={1234567} delta={1} reduced calm={false} />);
    expect(screen.getByTestId('coin-hud-total')).toHaveTextContent('1,234,567');
  });

  describe('spend direction (reversed)', () => {
    it('GIVEN spend THEN renders a -delta, comma-formatted', () => {
      render(<CoinRewardHud {...baseProps} total={1000} delta={300} direction="spend" reduced calm={false} />);
      expect(screen.getByTestId('coin-hud-delta')).toHaveTextContent('-300');
    });

    it('GIVEN spend AND non-reduced THEN rolls DOWN from (total+delta) to total', async () => {
      render(
        <CoinRewardHud {...baseProps} total={1000} delta={1000} direction="spend" reduced={false} calm={false} countDuration={50} />,
      );
      await waitFor(() => expect(screen.getByTestId('coin-hud-total')).toHaveTextContent('1,000'));
    });

    it('GIVEN spend THEN never shows the jackpot flair, even on a jackpot tier', () => {
      render(<CoinRewardHud {...baseProps} tier="jackpot" direction="spend" reduced calm={false} />);
      expect(screen.queryByTestId('coin-hud-jackpot')).not.toBeInTheDocument();
    });

    it('GIVEN spend THEN screen-reader region announces the spend', () => {
      render(<CoinRewardHud {...baseProps} total={800} delta={200} direction="spend" reduced calm={false} />);
      expect(screen.getByRole('status')).toHaveTextContent('-200');
    });
  });
});

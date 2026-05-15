import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CascadeJuiceLayer } from '../CascadeJuiceLayer';

describe('cascade/CascadeJuiceLayer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing initially', () => {
    const { queryByTestId } = render(
      <CascadeJuiceLayer
        comboCount={0}
        lastWordScore={null}
        lastWord={null}
        gameOver={false}
      />,
    );
    expect(queryByTestId('cascade-juice-layer')).toBeNull();
  });

  it('flashes score-pop when lastWordScore goes from null to positive', () => {
    const { rerender, queryByText } = render(
      <CascadeJuiceLayer
        comboCount={0}
        lastWordScore={null}
        lastWord={null}
        gameOver={false}
      />,
    );
    rerender(
      <CascadeJuiceLayer
        comboCount={0}
        lastWordScore={42}
        lastWord="STAR"
        gameOver={false}
      />,
    );
    expect(queryByText('+42')).toBeTruthy();
    expect(queryByText('STAR')).toBeTruthy();
  });

  it('flashes combo label when comboCount jumps to 2+', () => {
    const { rerender, queryByText } = render(
      <CascadeJuiceLayer
        comboCount={0}
        lastWordScore={null}
        lastWord={null}
        gameOver={false}
      />,
    );
    rerender(
      <CascadeJuiceLayer
        comboCount={2}
        lastWordScore={null}
        lastWord={null}
        gameOver={false}
      />,
    );
    expect(queryByText('DOUBLE!')).toBeTruthy();
  });

  it('uses TRIPLE for 3 and ELECTRIC for 4+', () => {
    const { rerender } = render(
      <CascadeJuiceLayer
        comboCount={0}
        lastWordScore={null}
        lastWord={null}
        gameOver={false}
      />,
    );
    rerender(
      <CascadeJuiceLayer
        comboCount={3}
        lastWordScore={null}
        lastWord={null}
        gameOver={false}
      />,
    );
    expect(screen.queryByText('TRIPLE!')).toBeTruthy();
    rerender(
      <CascadeJuiceLayer
        comboCount={5}
        lastWordScore={null}
        lastWord={null}
        gameOver={false}
      />,
    );
    expect(screen.queryByText('ELECTRIC!')).toBeTruthy();
  });

  it('clears the flash after timeout', () => {
    const { rerender, queryByText } = render(
      <CascadeJuiceLayer
        comboCount={0}
        lastWordScore={null}
        lastWord={null}
        gameOver={false}
      />,
    );
    rerender(
      <CascadeJuiceLayer
        comboCount={0}
        lastWordScore={10}
        lastWord="ART"
        gameOver={false}
      />,
    );
    expect(queryByText('+10')).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(queryByText('+10')).toBeNull();
  });

  it('flashes BURNED OUT once on gameOver', () => {
    const { rerender, queryByText } = render(
      <CascadeJuiceLayer
        comboCount={0}
        lastWordScore={null}
        lastWord={null}
        gameOver={false}
      />,
    );
    rerender(
      <CascadeJuiceLayer
        comboCount={0}
        lastWordScore={null}
        lastWord={null}
        gameOver={true}
      />,
    );
    expect(queryByText('BURNED OUT')).toBeTruthy();
  });

  it('uses custom comboLabels if provided', () => {
    const { rerender, queryByText } = render(
      <CascadeJuiceLayer
        comboCount={0}
        lastWordScore={null}
        lastWord={null}
        gameOver={false}
        comboLabels={{ double: 'DOBLE!', triple: 'TRIPLE!', electric: 'ELECTRICO!' }}
      />,
    );
    rerender(
      <CascadeJuiceLayer
        comboCount={2}
        lastWordScore={null}
        lastWord={null}
        gameOver={false}
        comboLabels={{ double: 'DOBLE!', triple: 'TRIPLE!', electric: 'ELECTRICO!' }}
      />,
    );
    expect(queryByText('DOBLE!')).toBeTruthy();
  });

  it('does not flash on combo=1 (first word, not a combo)', () => {
    const { rerender, queryByText } = render(
      <CascadeJuiceLayer
        comboCount={0}
        lastWordScore={null}
        lastWord={null}
        gameOver={false}
      />,
    );
    rerender(
      <CascadeJuiceLayer
        comboCount={1}
        lastWordScore={null}
        lastWord={null}
        gameOver={false}
      />,
    );
    expect(queryByText('DOUBLE!')).toBeNull();
    expect(queryByText('TRIPLE!')).toBeNull();
  });
});

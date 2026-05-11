import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { WordCraftZoomShell } from '../WordCraftZoomShell';

function pointerDown(target: Element, pointerId: number, x: number, y: number, pointerType = 'touch') {
  fireEvent.pointerDown(target, {
    pointerId,
    clientX: x,
    clientY: y,
    pointerType,
  });
}
function pointerMove(target: Element, pointerId: number, x: number, y: number, pointerType = 'touch') {
  fireEvent.pointerMove(target, {
    pointerId,
    clientX: x,
    clientY: y,
    pointerType,
  });
}
function pointerUp(target: Element, pointerId: number, x: number, y: number, pointerType = 'touch') {
  fireEvent.pointerUp(target, {
    pointerId,
    clientX: x,
    clientY: y,
    pointerType,
  });
}

describe('WordCraftZoomShell', () => {
  it('renders children at 1x by default with no reset button visible', () => {
    render(
      <WordCraftZoomShell>
        <div data-testid="board">child</div>
      </WordCraftZoomShell>,
    );
    expect(screen.getByTestId('board')).toBeInTheDocument();
    expect(screen.queryByLabelText('Reset zoom')).not.toBeInTheDocument();
  });

  it('shows the reset button after a double-tap zoom', () => {
    render(
      <WordCraftZoomShell>
        <div data-testid="board">child</div>
      </WordCraftZoomShell>,
    );
    const region = screen.getByRole('region');
    // Two pointerdowns within the double-tap window with one finger on touch
    // pointer type. Each starts and ends on its own.
    pointerDown(region, 1, 100, 100);
    pointerUp(region, 1, 100, 100);
    pointerDown(region, 2, 100, 100);
    expect(screen.getByLabelText('Reset zoom')).toBeInTheDocument();
  });

  it('returns to 1x when reset button is clicked', () => {
    render(
      <WordCraftZoomShell>
        <div data-testid="board">child</div>
      </WordCraftZoomShell>,
    );
    const region = screen.getByRole('region');
    pointerDown(region, 1, 100, 100);
    pointerUp(region, 1, 100, 100);
    pointerDown(region, 2, 100, 100);
    fireEvent.click(screen.getByLabelText('Reset zoom'));
    expect(screen.queryByLabelText('Reset zoom')).not.toBeInTheDocument();
  });

  it('two-finger pinch increases scale beyond 1x', () => {
    render(
      <WordCraftZoomShell>
        <div data-testid="board">child</div>
      </WordCraftZoomShell>,
    );
    const region = screen.getByRole('region');
    // Two fingers start 100px apart
    pointerDown(region, 10, 100, 200, 'touch');
    pointerDown(region, 11, 200, 200, 'touch');
    // Spread to 200px apart — 2x ratio
    act(() => {
      pointerMove(region, 10, 50, 200, 'touch');
      pointerMove(region, 11, 250, 200, 'touch');
    });
    const reset = screen.queryByLabelText('Reset zoom');
    expect(reset).toBeInTheDocument();
    expect(reset?.textContent).toMatch(/×/); // scale chip rendered
  });

  it('clamps scale to MAX even with extreme spreads', () => {
    render(
      <WordCraftZoomShell>
        <div data-testid="board">child</div>
      </WordCraftZoomShell>,
    );
    const region = screen.getByRole('region');
    pointerDown(region, 20, 100, 200, 'touch');
    pointerDown(region, 21, 200, 200, 'touch');
    act(() => {
      // Wildly large spread — should clamp at MAX_SCALE = 2.0
      pointerMove(region, 20, -2000, 200, 'touch');
      pointerMove(region, 21, 2000, 200, 'touch');
    });
    const reset = screen.queryByLabelText('Reset zoom');
    expect(reset).toBeInTheDocument();
    const text = reset?.textContent ?? '';
    const match = text.match(/(\d+(?:\.\d+)?)/);
    const num = match ? parseFloat(match[1]) : 0;
    expect(num).toBeLessThanOrEqual(2.0);
    expect(num).toBeGreaterThanOrEqual(2);
  });
});

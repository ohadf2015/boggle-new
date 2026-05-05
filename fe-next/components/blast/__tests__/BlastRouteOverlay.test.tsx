/**
 * BlastRouteOverlay — visual affordance for path_route mechanic.
 */
import { render, screen } from '@testing-library/react';
import { BlastRouteOverlay } from '../BlastRouteOverlay';

describe('BlastRouteOverlay', () => {
  it('renders two endpoint rings + a wire', () => {
    render(<BlastRouteOverlay
      startCell={{ row: 0, col: 0 }}
      endCell={{ row: 5, col: 5 }}
      cellSize={48}
    />);
    const overlay = screen.getByTestId('blast-route-overlay');
    expect(overlay).toBeInTheDocument();
    // 2 main rings + 2 black-underlay rings + 2 wire paths (under + over)
    expect(overlay.querySelectorAll('circle').length).toBeGreaterThanOrEqual(2);
    expect(overlay.querySelectorAll('path').length).toBe(2);
  });

  it('switches to completed state', () => {
    render(<BlastRouteOverlay
      startCell={{ row: 0, col: 0 }}
      endCell={{ row: 5, col: 5 }}
      cellSize={48}
      completed
    />);
    expect(screen.getByTestId('blast-route-overlay'))
      .toHaveAttribute('data-completed', 'true');
  });

  it('hides via opacity when hidden prop set', () => {
    const { rerender } = render(<BlastRouteOverlay
      startCell={{ row: 0, col: 0 }}
      endCell={{ row: 5, col: 5 }}
      cellSize={48}
      hidden={false}
    />);
    expect(screen.getByTestId('blast-route-overlay').className).toContain('opacity-100');
    rerender(<BlastRouteOverlay
      startCell={{ row: 0, col: 0 }}
      endCell={{ row: 5, col: 5 }}
      cellSize={48}
      hidden
    />);
    expect(screen.getByTestId('blast-route-overlay').className).toContain('opacity-0');
  });

  it('positions rings at cell-center coords', () => {
    render(<BlastRouteOverlay
      startCell={{ row: 0, col: 0 }}
      endCell={{ row: 1, col: 1 }}
      cellSize={50}
      gap={0}
    />);
    const overlay = screen.getByTestId('blast-route-overlay');
    const circles = overlay.querySelectorAll('circle');
    // Ring at (col*50 + 25, row*50 + 25) — find expected centers
    // Note: each RouteRing renders 2 circles (shadow + main)
    const cxValues = Array.from(circles).map(c => c.getAttribute('cx'));
    expect(cxValues).toContain('25'); // col=0 center
    expect(cxValues).toContain('75'); // col=1 center
  });
});

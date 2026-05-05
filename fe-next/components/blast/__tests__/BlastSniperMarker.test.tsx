/**
 * BlastSniperMarker — visual affordance for tile_sniper mechanic.
 */
import { render, screen } from '@testing-library/react';
import { BlastSniperMarker } from '../BlastSniperMarker';

describe('BlastSniperMarker', () => {
  it('renders crosshair + ring + brackets', () => {
    render(<BlastSniperMarker
      targetCell={{ row: 2, col: 3 }}
      cellSize={50}
    />);
    const marker = screen.getByTestId('blast-sniper-marker');
    expect(marker).toBeInTheDocument();
    // Halo + ring underlay + ring main = 3 circles minimum
    expect(marker.querySelectorAll('circle').length).toBeGreaterThanOrEqual(3);
    // 4 X-lines (2 shadow + 2 main) + 8 bracket lines = 12 lines
    expect(marker.querySelectorAll('line').length).toBe(12);
  });

  it('switches to hit state', () => {
    render(<BlastSniperMarker
      targetCell={{ row: 0, col: 0 }}
      cellSize={48}
      hit
    />);
    expect(screen.getByTestId('blast-sniper-marker'))
      .toHaveAttribute('data-hit', 'true');
  });

  it('hides via opacity', () => {
    render(<BlastSniperMarker
      targetCell={{ row: 0, col: 0 }}
      cellSize={48}
      hidden
    />);
    expect(screen.getByTestId('blast-sniper-marker').className).toContain('opacity-0');
  });

  it('positions ring at cell-center', () => {
    render(<BlastSniperMarker
      targetCell={{ row: 1, col: 2 }}
      cellSize={50}
      gap={0}
    />);
    const marker = screen.getByTestId('blast-sniper-marker');
    const circles = marker.querySelectorAll('circle');
    const cxValues = Array.from(circles).map(c => c.getAttribute('cx'));
    // col=2, cellSize=50 → center x = 2*50 + 25 = 125
    expect(cxValues).toContain('125');
  });
});

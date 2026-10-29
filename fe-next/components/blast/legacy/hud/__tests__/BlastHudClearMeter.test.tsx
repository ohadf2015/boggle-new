import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlastHudClearMeter } from '../BlastHudClearMeter';

describe('BlastHudClearMeter (solo goal card)', () => {
  it('given a pass bar, then the bar ends at the pass line and counts toward the tiles needed', () => {
    render(<BlastHudClearMeter layout="card" tilesCleared={9} totalTiles={36} passPct={75} goalMet={false} clearedLabel="cleared" />);
    expect(screen.getByText('9/27')).toBeInTheDocument();
    expect(screen.getByTestId('blast-progress-fill')).toHaveStyle({ width: '33%' });
  });

  it('given more cleared than needed, then the bar stays full', () => {
    render(<BlastHudClearMeter layout="card" tilesCleared={30} totalTiles={36} passPct={75} goalMet clearedLabel="cleared" />);
    expect(screen.getByTestId('blast-progress-fill')).toHaveStyle({ width: '100%' });
  });

  it('given no pass bar (multiplayer strip), then it counts the whole board', () => {
    render(<BlastHudClearMeter layout="strip" tilesCleared={9} totalTiles={36} goalMet={false} clearedLabel="cleared" />);
    expect(screen.getByText('9/36 cleared')).toBeInTheDocument();
  });

  it('given a board where rounding passes early, then the needed count matches the rounded pass rule', () => {
    render(<BlastHudClearMeter layout="card" tilesCleared={44} totalTiles={49} passPct={90} goalMet clearedLabel="cleared" />);
    expect(screen.getByText('44/44')).toBeInTheDocument();
  });
});

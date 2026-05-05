import { render, screen } from '@testing-library/react';
import { BlastTileTypeBreakdown } from '../BlastTileTypeBreakdown';

const mockT = (key: string): string => {
  const map: Record<string, string> = {
    'blast.tileBreakdown': 'TILE BREAKDOWN',
    'blast.tileGuide.bomb.name': 'bomb',
    'blast.tileGuide.gold.name': 'gold',
    'blast.tileGuide.lightning.name': 'lightning',
    'blast.tileGuide.prism.name': 'prism',
  };
  return map[key];
};

describe('BlastTileTypeBreakdown', () => {
  it('returns null when no tile clears provided', () => {
    const { container } = render(<BlastTileTypeBreakdown t={mockT} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when all counts are zero', () => {
    const { container } = render(
      <BlastTileTypeBreakdown
        tileTypeClears={{ bomb: 0, gold: 0 }}
        t={mockT}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('omits standard + zero-count entries', () => {
    render(
      <BlastTileTypeBreakdown
        tileTypeClears={{ standard: 50, bomb: 3, gold: 0 }}
        t={mockT}
      />,
    );
    expect(screen.queryByTestId('blast-tile-pill-standard')).toBeNull();
    expect(screen.queryByTestId('blast-tile-pill-gold')).toBeNull();
    expect(screen.getByTestId('blast-tile-pill-bomb')).toBeInTheDocument();
  });

  it('marks the leader (highest count) with data-leader=true', () => {
    render(
      <BlastTileTypeBreakdown
        tileTypeClears={{ bomb: 5, gold: 2, lightning: 1 }}
        t={mockT}
      />,
    );
    expect(screen.getByTestId('blast-tile-pill-bomb'))
      .toHaveAttribute('data-leader', 'true');
    expect(screen.getByTestId('blast-tile-pill-gold'))
      .toHaveAttribute('data-leader', 'false');
    expect(screen.getByTestId('blast-tile-pill-lightning'))
      .toHaveAttribute('data-leader', 'false');
  });

  it('does not mark leader when only one type cleared', () => {
    render(
      <BlastTileTypeBreakdown tileTypeClears={{ bomb: 3 }} t={mockT} />,
    );
    expect(screen.getByTestId('blast-tile-pill-bomb'))
      .toHaveAttribute('data-leader', 'false');
  });

  it('renders count with x prefix', () => {
    render(
      <BlastTileTypeBreakdown tileTypeClears={{ bomb: 7 }} t={mockT} />,
    );
    const pill = screen.getByTestId('blast-tile-pill-bomb');
    expect(pill.textContent).toContain('×7');
  });

  it('renders translated tile name', () => {
    render(
      <BlastTileTypeBreakdown tileTypeClears={{ prism: 2 }} t={mockT} />,
    );
    const pill = screen.getByTestId('blast-tile-pill-prism');
    expect(pill.textContent?.toLowerCase()).toContain('prism');
  });

  it('renders the section label', () => {
    render(
      <BlastTileTypeBreakdown tileTypeClears={{ bomb: 1 }} t={mockT} />,
    );
    expect(screen.getByText('TILE BREAKDOWN')).toBeInTheDocument();
  });
});

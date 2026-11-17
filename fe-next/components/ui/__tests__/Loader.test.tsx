import { render, screen } from '@testing-library/react';
import { Loader } from '../Loader';

describe('Loader', () => {
  it('announces itself as a busy status', () => {
    render(<Loader />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });

  it('uses the same three bouncing tiles as the page loader', () => {
    render(<Loader size="sm" />);
    const tiles = screen.getAllByTestId('loader-tile');
    expect(tiles).toHaveLength(3);
    tiles.forEach((tile) => expect(tile).toHaveClass('lc-loader-tile'));
  });

  it('lets the caption inherit its surface colour', () => {
    render(<Loader text="Shuffling letters..." />);
    expect(screen.getByText('Shuffling letters...').className).not.toMatch(/\btext-(neo-|white|black)/);
  });
});

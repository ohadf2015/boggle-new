import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuickDetailCard } from '../QuickDetailCard';

describe('QuickDetailCard', () => {
  it('gives the card the same coloured header band the stat cards above it use', () => {
    render(
      <QuickDetailCard testId="card" band="bg-neo-pink" title="Rank" aside={<span>340</span>}>
        body
      </QuickDetailCard>
    );
    const band = screen.getByTestId('card-band');
    expect(band.className).toContain('bg-neo-pink');
    expect(band).toHaveTextContent('Rank');
    expect(band).toHaveTextContent('340');
    expect(screen.getByTestId('card')).toHaveTextContent('body');
  });

  it('reveals on scroll', () => {
    render(<QuickDetailCard testId="card" band="bg-neo-lime" title="x">y</QuickDetailCard>);
    expect(screen.getByTestId('card').className).toContain('qp-reveal');
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GemPouchMeter from '../GemPouchMeter';

const t = (key: string) => key;

describe('GemPouchMeter', () => {
  it('exposes an accessible progressbar tracking rare gems toward target', () => {
    render(<GemPouchMeter rareCount={2} target={5} fraction={0.4} totalGems={7} t={t} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '2');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '5');
  });

  it('renders the rare count over target', () => {
    render(<GemPouchMeter rareCount={2} target={5} fraction={0.4} totalGems={7} t={t} />);
    expect(screen.getByText('2/5')).toBeInTheDocument();
  });

  it('fills the bar proportionally to fraction', () => {
    render(<GemPouchMeter rareCount={2} target={5} fraction={0.4} totalGems={7} t={t} />);
    const fill = screen.getByTestId('gem-pouch-fill');
    expect(fill).toHaveStyle({ width: '40%' });
  });

  it('shows the total gems collected (the whole haul)', () => {
    render(<GemPouchMeter rareCount={2} target={5} fraction={0.4} totalGems={7} t={t} />);
    expect(screen.getByTestId('gem-haul-count')).toHaveTextContent('7');
  });

  it('marks itself full when the pouch is complete', () => {
    render(<GemPouchMeter rareCount={5} target={5} fraction={1} totalGems={9} t={t} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('data-full', 'true');
  });
});

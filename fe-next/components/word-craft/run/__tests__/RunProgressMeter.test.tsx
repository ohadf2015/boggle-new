import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RunProgressMeter from '../RunProgressMeter';

const t = (k: string) => k;

describe('RunProgressMeter', () => {
  it('exposes an accessible progressbar from score toward target', () => {
    render(<RunProgressMeter score={40} target={100} t={t} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '40');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('fills proportionally to progress', () => {
    render(<RunProgressMeter score={40} target={100} t={t} />);
    expect(screen.getByTestId('run-meter-fill')).toHaveStyle({ width: '40%' });
  });

  it('shows score over target', () => {
    render(<RunProgressMeter score={40} target={100} t={t} />);
    expect(screen.getByText('40/100')).toBeInTheDocument();
  });

  it('tags its cosy zone (building → close → reached)', () => {
    const { rerender } = render(<RunProgressMeter score={40} target={100} t={t} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('data-zone', 'building');
    rerender(<RunProgressMeter score={90} target={100} t={t} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('data-zone', 'close');
    rerender(<RunProgressMeter score={100} target={100} t={t} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('data-zone', 'reached');
  });
});

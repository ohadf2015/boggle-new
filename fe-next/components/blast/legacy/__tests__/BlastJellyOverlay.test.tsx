import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlastJellyOverlay } from '../BlastJellyOverlay';

describe('BlastJellyOverlay', () => {
  it('renders nothing when layers=0', () => {
    const { container } = render(<BlastJellyOverlay layers={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders single layer for layers=1', () => {
    render(<BlastJellyOverlay layers={1} />);
    expect(screen.getByTestId('blast-jelly-overlay')).toHaveAttribute('data-layers', '1');
  });

  it('renders bold layer for layers=2', () => {
    render(<BlastJellyOverlay layers={2} />);
    expect(screen.getByTestId('blast-jelly-overlay')).toHaveAttribute('data-layers', '2');
  });

  it('marks overlay aria-hidden (decorative)', () => {
    render(<BlastJellyOverlay layers={1} />);
    expect(screen.getByTestId('blast-jelly-overlay')).toHaveAttribute('aria-hidden', 'true');
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlastChocolateOverlay } from '../BlastChocolateOverlay';

describe('BlastChocolateOverlay', () => {
  it('renders when active', () => {
    render(<BlastChocolateOverlay active />);
    expect(screen.getByTestId('blast-chocolate-overlay')).toBeInTheDocument();
  });

  it('renders nothing when inactive', () => {
    const { container } = render(<BlastChocolateOverlay active={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('marked aria-hidden (decorative)', () => {
    render(<BlastChocolateOverlay active />);
    expect(screen.getByTestId('blast-chocolate-overlay')).toHaveAttribute('aria-hidden', 'true');
  });
});

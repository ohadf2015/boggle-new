/**
 * EnhancedEmptyState — mascotVariant + flexible action.
 *
 * Extending this survivor before retiring the duplicate EmptyState:
 * - mascotVariant swaps the old static <Image mascotSrc> for the animated,
 *   reduced-motion-aware Mascot component (upgrade, not a downgrade).
 * - action now accepts a raw ReactNode (a fully custom button) in addition
 *   to the existing {label, onClick, variant} shape, so EmptyState's one
 *   call site with bespoke button styling can move over without losing it.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { EnhancedEmptyState } from '../EnhancedEmptyState';

describe('EnhancedEmptyState', () => {
  it('renders the animated Mascot for a given mascotVariant', () => {
    render(<EnhancedEmptyState title="Nothing here" mascotVariant="oops" />);
    expect(screen.getByAltText('Lexi mascot - oops')).toBeInTheDocument();
  });

  it('falls back to the icon box when no mascotVariant is given', () => {
    render(<EnhancedEmptyState title="Nothing here" icon="inbox" />);
    expect(screen.queryByAltText(/Lexi mascot/)).not.toBeInTheDocument();
  });

  it('renders a structured action via the button and fires onClick', () => {
    const onClick = vi.fn();
    render(
      <EnhancedEmptyState
        title="Nothing here"
        action={{ label: 'Retry', onClick }}
      />
    );
    fireEvent.click(screen.getByText('Retry'));
    expect(onClick).toHaveBeenCalled();
  });

  it('renders a raw ReactNode action as-is, without wrapping it', () => {
    render(
      <EnhancedEmptyState
        title="Nothing here"
        action={<button type="button" className="custom-cta">Join classroom</button>}
      />
    );
    const btn = screen.getByText('Join classroom');
    expect(btn).toHaveClass('custom-cta');
  });
});

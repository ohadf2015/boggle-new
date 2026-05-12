import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LetterboxBars } from '../LetterboxBars';

describe('LetterboxBars', () => {
  it('renders top + bottom bars with role=presentation', () => {
    render(<LetterboxBars active={true} />);
    const bars = screen.getAllByRole('presentation');
    expect(bars.length).toBe(2);
  });

  it('does not render bars when inactive', () => {
    const { container } = render(<LetterboxBars active={false} />);
    expect(container.querySelectorAll('[role="presentation"]').length).toBe(0);
  });
});

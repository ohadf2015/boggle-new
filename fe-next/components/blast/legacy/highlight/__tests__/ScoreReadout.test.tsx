import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreReadout } from '../ScoreReadout';

describe('ScoreReadout', () => {
  it('renders +428 with prefix', () => {
    render(<ScoreReadout score={428} visible={true} />);
    expect(screen.getByText('+428')).toBeInTheDocument();
  });

  it('does not render when invisible', () => {
    const { container } = render(<ScoreReadout score={428} visible={false} />);
    expect(container.textContent).not.toContain('+428');
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConnectionsHowTo from '../ConnectionsHowTo';
import { getConnectionsLandingCopy } from '@/app/[locale]/connections/content';

describe('ConnectionsHowTo', () => {
  const copy = getConnectionsLandingCopy('en').howTo;

  it('is the target of the hero "how it works" link', () => {
    const { container } = render(<ConnectionsHowTo copy={copy} />);
    expect(container.querySelector('section#how-it-works')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: copy.heading })).toBeInTheDocument();
  });

  it('lists the steps in order', () => {
    render(<ConnectionsHowTo copy={copy} />);
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    copy.steps.forEach((step, i) => expect(items[i]).toContain(step));
  });

  it('shows each worked example with both words it forms', () => {
    render(<ConnectionsHowTo copy={copy} />);
    for (const ex of copy.examples) {
      expect(screen.getByText(ex.left)).toBeInTheDocument();
      expect(screen.getByText(ex.right)).toBeInTheDocument();
    }
  });
});

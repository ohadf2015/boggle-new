// @vitest-environment happy-dom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mascot pulls next/image + framer; stub it so this stays a pure content test.
vi.mock('@/components/ui/Mascot', () => ({
  Mascot: ({ variant }: { variant: string }) => <div data-testid="mascot" data-variant={variant} />,
}));

import { WhoPlays } from '../WhoPlays';

const cards = [
  { label: 'Any Device', detail: 'Phones, tablets, laptops — any modern browser.' },
  { label: 'Ages 6+', detail: 'Child-safety features built in.' },
  { label: 'Classrooms', detail: 'Teachers run word battles as vocabulary drills.' },
  { label: 'Friend Groups', detail: 'Host a party with up to 20 players.' },
];

describe('WhoPlays', () => {
  it('renders heading + every card label and detail (SSR content present)', () => {
    render(<WhoPlays cards={cards} heading="Made for everyone" />);
    expect(screen.getByRole('heading', { name: /made for everyone/i })).toBeInTheDocument();
    for (const c of cards) {
      expect(screen.getByText(c.label)).toBeInTheDocument();
      expect(screen.getByText(c.detail)).toBeInTheDocument();
    }
  });

  it('renders the mascot accent', () => {
    render(<WhoPlays cards={cards} heading="x" />);
    expect(screen.getByTestId('mascot')).toBeInTheDocument();
  });

  it('renders nothing without cards', () => {
    const { container } = render(<WhoPlays cards={[]} heading="x" />);
    expect(container.firstChild).toBeNull();
  });
});

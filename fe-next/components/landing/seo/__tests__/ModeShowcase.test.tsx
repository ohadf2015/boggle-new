// @vitest-environment happy-dom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ModeShowcase } from '../ModeShowcase';

// The Mode Showcase surfaces the previously-unused `gameModes` data so players
// can SEE what they can play (not read a prose features dump). Each mode is a
// color-coded tile with a tag chip. Static SSR content — fully present in DOM.

const modes = [
  { title: 'Real-Time Multiplayer', tag: '2-20 players', description: 'Compete head-to-head instantly.' },
  { title: 'Daily Challenges', tag: 'New puzzle daily', description: 'Same puzzle for everyone worldwide.' },
  { title: 'Adventure Mode', tag: '100 levels', description: '100 levels across 10 worlds.' },
  { title: 'Blast Mode', tag: 'Chain reactions', description: 'Explosive chain reactions.' },
  { title: 'Community Boards', tag: 'Player-made puzzles', description: 'Design your own grids.' },
];

describe('ModeShowcase', () => {
  it('renders a heading', () => {
    render(<ModeShowcase modes={modes} heading="Pick your battle" />);
    expect(screen.getByRole('heading', { name: /pick your battle/i })).toBeInTheDocument();
  });

  it('renders every mode title, tag, and description (SSR content present)', () => {
    render(<ModeShowcase modes={modes} heading="Modes" />);
    for (const m of modes) {
      expect(screen.getByText(m.title)).toBeInTheDocument();
      expect(screen.getByText(m.tag)).toBeInTheDocument();
      expect(screen.getByText(m.description)).toBeInTheDocument();
    }
  });

  it('renders nothing when there are no modes', () => {
    const { container } = render(<ModeShowcase modes={[]} heading="Modes" />);
    expect(container.firstChild).toBeNull();
  });
});

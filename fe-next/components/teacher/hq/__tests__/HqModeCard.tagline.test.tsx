import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/image', () => ({ default: () => null }));

import { HqModeCard } from '../HqModeCard';
import { HQ_MODES } from '../hqModes';

const BLAST = HQ_MODES.find((m) => m.id === 'blast')!;

describe('<HqModeCard> — every tile says what the game is, on a phone too', () => {
  it('Given a tagline, Then it shows under the name below desktop, one line, and the name keeps to one line there', () => {
    render(<HqModeCard mode={BLAST} label="Blast" blurb="Fast rounds, huge combos" tagline="Chain combos" selected={false} onSelect={vi.fn()} />);
    const tag = screen.getByTestId('hq-tile-tag-blast');
    expect(tag).toHaveTextContent('Chain combos');
    const cls = tag.className;
    expect(cls).not.toMatch(/(^|\s)hidden(\s|$)/);
    expect(cls).toMatch(/(^|\s)lg:hidden(\s|$)/);
    expect(cls).toMatch(/(^|\s)truncate(\s|$)/);
    expect(screen.getByText('Blast').className).toMatch(/(^|\s)line-clamp-1(\s|$)/);
  });

  it('Given the tile is a radio, Then its accessible name stays the mode name alone', () => {
    render(<HqModeCard mode={BLAST} label="Blast" blurb="b" tagline="Chain combos" selected onSelect={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'Blast' })).toBeInTheDocument();
  });
});

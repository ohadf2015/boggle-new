import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AssignmentWordcraftOption } from '../AssignmentWordcraftOption';

const t = (key: string) => key;

describe('AssignmentWordcraftOption', () => {
  it('marks the picked mode without lime, so Create stays the one lime action', () => {
    render(<AssignmentWordcraftOption selected disabled={false} onSelect={vi.fn()} t={t} />);
    const card = screen.getByTestId('assignment-mode-wordcraft');
    expect(card).toHaveAttribute('aria-pressed', 'true');
    expect(card.className).not.toMatch(/bg-neo-lime/);
    expect(card.className).toMatch(/border-\[3px\]/);
  });

  it('gives the unpicked card a visible cream edge on navy', () => {
    render(<AssignmentWordcraftOption selected={false} disabled={false} onSelect={vi.fn()} t={t} />);
    expect(screen.getByTestId('assignment-mode-wordcraft').className).toMatch(/border-neo-cream\/50/);
  });
});

// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Notebook } from '../Notebook';
import type { ClueFragment } from '@/lib/word-vault/beats/types';

const fragments: ClueFragment[] = [
  { id: 'a', roomId: 'r1.1', kind: 'whisper', text: 'הדלת חרוקה' },
  { id: 'b', roomId: 'r1.1', kind: 'sense', icon: 'name' },
  { id: 'c', roomId: 'r1.1', kind: 'glyph', glyph: 'א' },
];

describe('Notebook', () => {
  it('renders empty state when no clues', () => {
    render(<Notebook fragments={[]} />);
    expect(screen.getByText(/הפנקס ריק/)).toBeTruthy();
  });

  it('renders one row per fragment', () => {
    render(<Notebook fragments={fragments} />);
    expect(screen.getByText((content, element) => content.includes('הדלת חרוקה'))).toBeTruthy();
    expect(screen.getByText('א')).toBeTruthy();
    expect(screen.getByLabelText('clue-icon-name')).toBeTruthy();
  });
});

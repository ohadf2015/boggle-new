import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PracticeRiddleCard from '../PracticeRiddleCard';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

describe('PracticeRiddleCard', () => {
  it('renders nothing when there is no riddle', () => {
    const { container } = render(<PracticeRiddleCard riddle={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the clue text', () => {
    render(<PracticeRiddleCard riddle={{ word: 'STAR', clue: 'Twinkles at night' }} />);
    expect(screen.getByText('Twinkles at night')).toBeInTheDocument();
  });

  it('masks all letters by default', () => {
    render(<PracticeRiddleCard riddle={{ word: 'STAR', clue: 'c' }} />);
    const tiles = screen.getByTestId('practice-riddle-answer');
    // 4 hidden bullets, no real letters
    expect(tiles.textContent).not.toContain('S');
    expect((tiles.textContent?.match(/•/g) || []).length).toBe(4);
  });

  it('reveals leading letters when revealedCount is set', () => {
    render(<PracticeRiddleCard riddle={{ word: 'STAR', clue: 'c' }} revealedCount={1} />);
    const tiles = screen.getByTestId('practice-riddle-answer');
    expect(tiles.textContent).toContain('S');
    expect((tiles.textContent?.match(/•/g) || []).length).toBe(3);
  });

  it('shows the full word and a solved label when solved', () => {
    render(<PracticeRiddleCard riddle={{ word: 'STAR', clue: 'c' }} solved />);
    const tiles = screen.getByTestId('practice-riddle-answer');
    expect(tiles.textContent).toContain('S');
    expect(tiles.textContent).toContain('R');
    expect((tiles.textContent?.match(/•/g) || []).length).toBe(0);
    expect(screen.getByText('practice.riddle.solved')).toBeInTheDocument();
  });
});

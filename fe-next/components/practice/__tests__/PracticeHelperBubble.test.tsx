import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PracticeHelperBubble from '../PracticeHelperBubble';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

describe('PracticeHelperBubble', () => {
  it('renders nothing when stage is none', () => {
    const { container } = render(<PracticeHelperBubble stage="none" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the nudge message when stage is nudge', () => {
    render(<PracticeHelperBubble stage="nudge" />);
    expect(screen.getByText('practice.helper.nudge')).toBeInTheDocument();
  });

  it('shows the reveal message when stage is reveal-tile', () => {
    render(<PracticeHelperBubble stage="reveal-tile" hintCell={{ row: 0, col: 0 }} />);
    expect(screen.getByText('practice.helper.reveal')).toBeInTheDocument();
  });

  it('adds a highlight class to the target board cell on reveal', () => {
    // Simulate a real grid cell in the DOM.
    const cell = document.createElement('div');
    cell.setAttribute('data-row', '1');
    cell.setAttribute('data-col', '2');
    document.body.appendChild(cell);

    render(<PracticeHelperBubble stage="reveal-tile" hintCell={{ row: 1, col: 2 }} />);
    expect(cell.classList.contains('practice-hint-cell')).toBe(true);
    cell.remove();
  });

  it('does not throw when the target cell is absent', () => {
    expect(() =>
      render(<PracticeHelperBubble stage="reveal-tile" hintCell={{ row: 9, col: 9 }} />),
    ).not.toThrow();
  });
});

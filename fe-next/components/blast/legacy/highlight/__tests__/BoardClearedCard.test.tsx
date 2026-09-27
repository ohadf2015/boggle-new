import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BoardClearedCard } from '../BoardClearedCard';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

describe('BoardClearedCard', () => {
  it('renders translation key when visible', () => {
    render(<BoardClearedCard finalScore={1234} visible={true} />);
    expect(screen.getByText('blast.highlight.boardCleared')).toBeInTheDocument();
    expect(screen.getByText('1234')).toBeInTheDocument();
  });

  it('hidden when visible=false', () => {
    const { container } = render(<BoardClearedCard finalScore={0} visible={false} />);
    expect(container.textContent).not.toContain('boardCleared');
  });
});

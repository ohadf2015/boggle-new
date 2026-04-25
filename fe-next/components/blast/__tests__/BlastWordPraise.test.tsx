import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import BlastWordPraise from '../BlastWordPraise';

// Mock AdaptiveMotion to render children synchronously
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AdaptiveAnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'blast.praise.nice': 'Nice!',
    'blast.praise.great': 'Great!',
    'blast.praise.brilliant': 'Brilliant!',
    'blast.praise.amazing': 'AMAZING!',
    'blast.praise.legendary': 'LEGENDARY!',
  };
  return translations[key];
};

describe('BlastWordPraise', () => {
  it('renders nothing for short words (3 letters or fewer)', () => {
    const { container } = render(
      <BlastWordPraise wordLength={3} submitCount={1} t={mockT} />,
    );
    expect(container.textContent).toBe('');
  });

  it('renders "Nice!" for 4-letter words', () => {
    const { rerender } = render(
      <BlastWordPraise wordLength={0} submitCount={0} t={mockT} />,
    );
    act(() => {
      rerender(<BlastWordPraise wordLength={4} submitCount={1} t={mockT} />);
    });
    expect(screen.getByText('Nice!')).toBeDefined();
  });

  it('renders "Great!" for 5-letter words', () => {
    const { rerender } = render(
      <BlastWordPraise wordLength={0} submitCount={0} t={mockT} />,
    );
    act(() => {
      rerender(<BlastWordPraise wordLength={5} submitCount={1} t={mockT} />);
    });
    expect(screen.getByText('Great!')).toBeDefined();
  });

  it('renders "Brilliant!" for 6-letter words', () => {
    const { rerender } = render(
      <BlastWordPraise wordLength={0} submitCount={0} t={mockT} />,
    );
    act(() => {
      rerender(<BlastWordPraise wordLength={6} submitCount={1} t={mockT} />);
    });
    expect(screen.getByText('Brilliant!')).toBeDefined();
  });

  it('renders "LEGENDARY!" for 8+ letter words', () => {
    const { rerender } = render(
      <BlastWordPraise wordLength={0} submitCount={0} t={mockT} />,
    );
    act(() => {
      rerender(<BlastWordPraise wordLength={9} submitCount={1} t={mockT} />);
    });
    expect(screen.getByText('LEGENDARY!')).toBeDefined();
  });

  it('does not retrigger without submitCount change', () => {
    const { rerender, container } = render(
      <BlastWordPraise wordLength={4} submitCount={1} t={mockT} />,
    );
    // Same submitCount — should not show new praise
    rerender(<BlastWordPraise wordLength={5} submitCount={1} t={mockT} />);
    // Text should not change since submitCount didn't increment
    expect(container.querySelector('.text-neo-lime')).toBeNull();
  });
});

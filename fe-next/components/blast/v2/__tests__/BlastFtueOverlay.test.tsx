import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlastFtueOverlay } from '../BlastFtueOverlay';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

describe('BlastFtueOverlay (controlled)', () => {
  it('renders step 1 message when step=1', () => {
    render(<BlastFtueOverlay onComplete={vi.fn()} step={1} />);
    expect(screen.getByText('Drag across letters to spell a word')).toBeInTheDocument();
  });

  it('renders step 6 message + continue button when step=6', () => {
    const onComplete = vi.fn();
    render(<BlastFtueOverlay onComplete={onComplete} step={6} />);
    expect(screen.getByText(/Level 1 complete/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Continue'));
    expect(onComplete).toHaveBeenCalled();
  });

  it('renders nothing when step=null', () => {
    const { container } = render(<BlastFtueOverlay onComplete={vi.fn()} step={null} />);
    expect(container.querySelector('[data-testid="blast-ftue-spotlight"]')).toBeNull();
  });

  it('spotlight wrapper is pointer-events-none so taps reach the board', () => {
    const { container } = render(<BlastFtueOverlay onComplete={vi.fn()} step={2} />);
    const wrap = container.querySelector('[data-testid="blast-ftue-spotlight"]');
    expect(wrap).toBeInTheDocument();
    expect(wrap?.className).toMatch(/pointer-events-none/);
  });

  it('veteran path shows welcome and dismisses via CTA', () => {
    const onComplete = vi.fn();
    render(<BlastFtueOverlay onComplete={onComplete} isVeteran={true} />);
    expect(screen.getByText('Welcome back!')).toBeInTheDocument();
    fireEvent.click(screen.getByText("Let's go"));
    expect(onComplete).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

import { BlastConceptIntroCard } from '../BlastConceptIntroCard';

describe('BlastConceptIntroCard', () => {
  it('renders "anyRow" concept with title and demo grid', () => {
    render(<BlastConceptIntroCard concept="anyRow" onDismiss={() => {}} />);
    expect(screen.getByTestId('concept-intro')).toHaveAttribute('data-concept', 'anyRow');
    expect(screen.getByText(/can be on any row/i)).toBeInTheDocument();
  });

  it('renders "verticalWords" concept with vertical phrasing', () => {
    render(<BlastConceptIntroCard concept="verticalWords" onDismiss={() => {}} />);
    expect(screen.getByRole('heading', { name: /vertical/i })).toBeInTheDocument();
  });

  it('calls onDismiss when "Got it" pressed', () => {
    const onDismiss = vi.fn();
    render(<BlastConceptIntroCard concept="anyRow" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTestId('concept-got-it'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

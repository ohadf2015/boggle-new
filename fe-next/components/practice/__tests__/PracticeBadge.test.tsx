import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => {
      if (k === 'practiceBadge.label') return 'Practice';
      if (k === 'practiceBadge.aria') return 'Practice mode — no XP earned';
      return k;
    },
  }),
}));

import PracticeBadge from '../PracticeBadge';

describe('PracticeBadge', () => {
  it('renders label text', () => {
    render(<PracticeBadge />);
    expect(screen.getByText('Practice')).toBeInTheDocument();
  });

  it('exposes aria-label for screen readers', () => {
    render(<PracticeBadge />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Practice mode — no XP earned');
  });

  it('forwards custom className for positioning', () => {
    render(<PracticeBadge className="absolute top-2" />);
    expect(screen.getByRole('status').className).toContain('absolute');
  });
});

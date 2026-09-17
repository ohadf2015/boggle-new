import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ComparisonStrip } from '../ComparisonStrip';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

vi.mock('@/utils/accessibility', () => ({
  isReducedMotionPreferred: () => true,
}));

// The leading row-label column header was an empty <th> with no scope or
// accessible name — a screen reader announced nothing for that column.
describe('ComparisonStrip', () => {
  it('gives the leading row-label column a scope and an accessible name', () => {
    render(<ComparisonStrip />);
    const headers = screen.getAllByRole('columnheader');
    const rowLabelHeader = headers[0];
    expect(rowLabelHeader).toHaveAttribute('scope', 'col');
    expect(rowLabelHeader).toHaveTextContent('education.landing.compare.rowHeader');
  });
});

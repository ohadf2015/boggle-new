import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PlanComparisonMatrix } from '../PlanComparisonMatrix';
import { PLAN_MATRIX_ROWS } from '@/lib/education/planMatrix';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';

// `language`, not `locale`. The analytics page test invented a `locale` key the real context
// does not expose, so every component reading `language` silently got `undefined` and its
// upgrade link rendered as `/undefined/teacher/upgrade` while the test stayed green.
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

const K = 'teacher.subscription.matrix';

describe('PlanComparisonMatrix', () => {
  it('renders one row per configured feature, plus a header', () => {
    render(<PlanComparisonMatrix />);
    expect(screen.getAllByRole('row')).toHaveLength(PLAN_MATRIX_ROWS.length + 1);
  });

  it('names both plans as column headers', () => {
    render(<PlanComparisonMatrix />);
    const header = screen.getAllByRole('row')[0];
    expect(within(header).getByText(`${K}.featureColumn`)).toBeInTheDocument();
    expect(within(header).getByText('teacher.subscription.freePlanName')).toBeInTheDocument();
    expect(within(header).getByText('teacher.subscription.proPlanName')).toBeInTheDocument();
  });

  it('prints the enforced cap for Free and the word "unlimited" for Pro', () => {
    render(<PlanComparisonMatrix />);
    const row = screen.getByRole('row', { name: new RegExp(`${K}\\.classes`) });
    const cells = within(row).getAllByRole('cell');
    expect(cells[0]).toHaveTextContent(String(FREE_TIER_LIMITS.classes));
    expect(cells[1]).toHaveTextContent(`${K}.unlimited`);
  });

  it('states inclusion in words, not only as a glyph', () => {
    // A ✓/✗ column is unreadable to a screen reader and to anyone whose font drops the
    // glyph. The mark is decorative; the meaning has to be text.
    render(<PlanComparisonMatrix />);
    const row = screen.getByRole('row', { name: new RegExp(`${K}\\.analytics`) });
    const cells = within(row).getAllByRole('cell');
    expect(cells[0]).toHaveTextContent(`${K}.notIncluded`);
    expect(cells[1]).toHaveTextContent(`${K}.included`);
  });

  it('marks the decorative tick and cross as hidden from assistive tech', () => {
    const { container } = render(<PlanComparisonMatrix />);
    const marks = container.querySelectorAll('[data-plan-mark]');
    expect(marks.length).toBeGreaterThan(0);
    marks.forEach((mark) => expect(mark).toHaveAttribute('aria-hidden', 'true'));
  });
});

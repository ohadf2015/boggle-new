import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${Object.values(p).join('|')}` : k),
    language: 'en',
  }),
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import { SchoolPlanSection } from '../SchoolPlanSection';

describe('SchoolPlanSection', () => {
  it('shows the indicative price next to the quote form', () => {
    render(<SchoolPlanSection requester="" />);
    expect(screen.getByTestId('school-plan-section')).toContainElement(screen.getByTestId('school-price'));
    expect(screen.getByTestId('school-price-amount')).toHaveTextContent('$49');
  });
});

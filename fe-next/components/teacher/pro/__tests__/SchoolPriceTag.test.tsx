import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
// @ts-expect-error — translations are untyped .js bundles
import { en } from '@/translations/en.js';
// @ts-expect-error — translations are untyped .js bundles
import { he } from '@/translations/he.js';
import { SCHOOL_PRICING } from '@/lib/education/pro/schoolPricing';

let dict: Record<string, unknown> = en;
const lookup = (path: string) =>
  path.split('.').reduce<unknown>((n, p) => (n && typeof n === 'object' ? (n as Record<string, unknown>)[p] : undefined), dict) as string;
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) =>
      lookup(k).replace(/\{(\w+)\}/g, (m, name: string) => (p && name in p ? String(p[name]) : m)),
    language: 'en',
  }),
}));

import { SchoolPriceTag } from '../SchoolPriceTag';

describe('SchoolPriceTag', () => {
  it('renders the price and minimum from the constant (en)', () => {
    dict = en;
    render(<SchoolPriceTag />);
    expect(screen.getByTestId('school-price-amount')).toHaveTextContent(`$${SCHOOL_PRICING.perTeacherYearUsd}`);
    const tag = screen.getByTestId('school-price');
    expect(tag).toHaveTextContent('From');
    expect(tag).toHaveTextContent('per teacher / year');
    expect(screen.getByTestId('school-price-terms')).toHaveTextContent(`${SCHOOL_PRICING.minTeachers}+ teachers`);
    expect(screen.getByTestId('school-price-terms')).toHaveTextContent('invoice or purchase order');
  });

  it('keeps the price bidi-safe in Hebrew', () => {
    dict = he;
    render(<SchoolPriceTag />);
    const amount = screen.getByTestId('school-price-amount');
    expect(amount.tagName).toBe('BDI');
    expect(amount).toHaveAttribute('dir', 'ltr');
    expect(amount).toHaveTextContent(`$${SCHOOL_PRICING.perTeacherYearUsd}`);
    expect(screen.getByTestId('school-price')).not.toHaveTextContent('From');
  });
});

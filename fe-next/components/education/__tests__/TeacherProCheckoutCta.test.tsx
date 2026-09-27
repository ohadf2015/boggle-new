import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  TeacherProCheckoutCta,
  TEACHER_PRO_CHECKOUT_PATH,
  teacherProCheckoutCtaLabel,
  teacherProUpgradeCtaLabel,
} from '../TeacherProCheckoutCta';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';

describe('TeacherProCheckoutCta', () => {
  it('links to localized teacher/upgrade checkout', () => {
    render(<TeacherProCheckoutCta locale="en" />);
    const link = screen.getByTestId('teacher-pro-checkout-link');
    expect(link).toHaveAttribute('href', `/en${TEACHER_PRO_CHECKOUT_PATH}`);
    expect(link.getAttribute('href')).toContain('teacher/upgrade');
  });

  it('shows Teacher Pro price from TEACHER_PRO_PRICE_USD', () => {
    render(<TeacherProCheckoutCta locale="en" />);
    expect(screen.getByTestId('teacher-pro-checkout-cta').textContent).toContain(
      `$${TEACHER_PRO_PRICE_USD}`,
    );
    expect(teacherProCheckoutCtaLabel('en')).toContain(String(TEACHER_PRO_PRICE_USD));
  });

  it('localizes the checkout href for non-en locales', () => {
    render(<TeacherProCheckoutCta locale="he" />);
    expect(screen.getByTestId('teacher-pro-checkout-link')).toHaveAttribute(
      'href',
      `/he${TEACHER_PRO_CHECKOUT_PATH}`,
    );
  });

  it('names the in-product upgrade CTA "Upgrade to Teacher Pro"', () => {
    expect(teacherProUpgradeCtaLabel('en')).toBe('Upgrade to Teacher Pro');
    expect(teacherProUpgradeCtaLabel('he')).not.toBe('Upgrade to Teacher Pro');
    expect(teacherProUpgradeCtaLabel('HE-IL')).toBe(teacherProUpgradeCtaLabel('he'));
    expect(teacherProUpgradeCtaLabel('xx')).toBe('Upgrade to Teacher Pro');
  });
});

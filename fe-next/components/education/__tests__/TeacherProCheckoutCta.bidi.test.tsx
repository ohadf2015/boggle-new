import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const LRI = '⁦';
const PDI = '⁩';

const tMock = vi.fn((key: string, fallback?: unknown, params?: Record<string, string>) =>
  `[${key}]${params?.price ?? ''}`,
);
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: tMock, language: 'he' }) }));

import { TeacherProCheckoutCta, teacherProCheckoutCtaLabel, teacherProCheckoutCopy } from '../TeacherProCheckoutCta';

describe('Teacher Pro CTA copy — Hebrew bidi and t()', () => {
  it('isolates the price so RTL cannot detach "$9" from "per month"', () => {
    const label = teacherProCheckoutCtaLabel('he');
    expect(label).toContain(`${LRI}$9${PDI}`);
    expect(label).not.toMatch(/\$9\/חודש/);
  });

  it('names the plan in Hebrew, with no Latin "Teacher Pro" left to isolate', () => {
    expect(teacherProCheckoutCtaLabel('he')).toContain('פרו למורים');
    expect(teacherProCheckoutCtaLabel('he')).not.toMatch(/Teacher Pro/);
  });

  it('no longer shows teachers the payment processor name', () => {
    for (const locale of ['en', 'he', 'es', 'sv', 'ja', 'ru']) {
      expect(teacherProCheckoutCopy(locale).note).not.toMatch(/polar/i);
    }
  });

  it('renders its copy through t() with the isolated price', () => {
    render(<TeacherProCheckoutCta locale="he" />);
    const root = screen.getByTestId('teacher-pro-checkout-cta');
    expect(root.textContent).toContain('[eg2Pro.checkoutCta.heading]');
    expect(root.textContent).toContain('[eg2Pro.checkoutCta.cta]');
    expect(tMock).toHaveBeenCalledWith('eg2Pro.checkoutCta.cta', expect.any(String), expect.objectContaining({ price: `${LRI}$9${PDI}` }));
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherProAskBanner } from '../TeacherProAskBanner';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { en } from '@/translations/en';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';

vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

describe('TeacherProAskBanner', () => {
  const renderBanner = () =>
    render(
      <LanguageProvider initialLanguage="en" initialTranslations={en}>
        <TeacherProAskBanner />
      </LanguageProvider>,
    );

  it('shows Teacher Pro, $9/mo, unlimited classes and reports, and hits /pricing', () => {
    renderBanner();
    const ask = screen.getByTestId('teacher-pro-ask');
    expect(ask).toBeInTheDocument();
    expect(ask.textContent).toContain(en.teacher.subscription.proPlanName);
    expect(ask.textContent).toContain('$' + String(TEACHER_PRO_PRICE_USD));
    expect(screen.getByText(en.teacher.subscription.unlimitedClasses)).toBeInTheDocument();
    expect(screen.getByText(en.education.landing.pro.analytics)).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: en.teacher.subscription.upgradeNow });
    expect(cta).toHaveAttribute('href', '/en/pricing');
  });
});

import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProGate } from '../ProGate';

const mockUseTeacherPro = vi.fn();
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => mockUseTeacherPro() }));
vi.mock('@/hooks/useTeacherTrialRecap', () => ({ useTeacherTrialRecap: () => null }));
vi.mock('@/lib/education/proFunnelTelemetry', () => ({
  trackProGateViewed: vi.fn(),
  trackProUpgradeClicked: vi.fn(),
  trackProTrialPreviewViewed: vi.fn(),
  trackProTrialPreviewUpgradeClicked: vi.fn(),
}));
vi.mock('@/hooks/useTeacherProCheckout', () => ({ useTeacherProCheckout: () => ({ pending: false, start: vi.fn() }) }));
vi.mock('@/hooks/useStartTeacherProTrial', () => ({ useStartTeacherProTrial: () => ({ pending: false, start: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key, language: 'en' }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

const COLOR_FILL = /(^|\s)bg-neo-(lime|cyan|pink|purple|orange|yellow|white|cream)(\/\d+)?(\s|$)/;
const fills = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>('[class]')).filter((el) => COLOR_FILL.test(el.getAttribute('class') ?? ''));

afterEach(cleanup);

describe('ProGate calm tone (reports)', () => {
  it('Given a never-trialed free teacher, Then the lock has one lime trial CTA, a small yellow PRO badge, and no other fill', () => {
    mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false, known: true, status: 'active', trialUsed: false });
    const { container } = render(
      <ProGate feature="reports" tone="calm" polarTrialPlacement="reports_teaser">
        <div>paid</div>
      </ProGate>,
    );
    const cta = screen.getByTestId('pro-gate-upgrade-reports');
    const badge = screen.getByTestId('pro-gate-pill');
    expect(cta).toHaveTextContent('eduPlans.reports.startTrialCta');
    expect(cta.className).toMatch(/\bbg-neo-lime\b/);
    expect(badge.className).toMatch(/\bbg-neo-yellow\b/);
    expect(badge).toHaveTextContent('eduShell.nav.pro');
    expect(fills(container).filter((el) => el !== cta && el !== badge)).toEqual([]);
    expect(container.querySelectorAll('.uppercase')).toHaveLength(0);
  });

  it('Given a teacher on a live access trial, Then the strip upgrade button is outlined, not a colored fill', () => {
    mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false, accessTrialExpires: new Date(Date.now() + 5 * 864e5).toISOString() });
    render(
      <ProGate feature="reports" tone="calm">
        <div>paid</div>
      </ProGate>,
    );
    expect(fills(screen.getByTestId('pro-trial-preview'))).toEqual([]);
  });

  it('Given no tone, Then the default lock keeps its existing look for other pages', () => {
    mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false, known: true, status: 'active', trialUsed: false });
    render(
      <ProGate feature="analytics" polarTrialPlacement="reports_teaser">
        <div>paid</div>
      </ProGate>,
    );
    expect(screen.getByTestId('pro-gate-upgrade-analytics').className).toMatch(/\bbg-neo-cyan\b/);
    expect(screen.getByTestId('pro-gate-upgrade-analytics')).toHaveTextContent('eduPlans.reports.trialCta');
  });
});

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

  it('Given no tone, Then the default lock wears the same chunky panel, yellow PRO sticker and lime CTA', () => {
    mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false, known: true, status: 'active', trialUsed: false });
    render(
      <ProGate feature="analytics" polarTrialPlacement="reports_teaser">
        <div>paid</div>
      </ProGate>,
    );
    expect(screen.getByTestId('pro-gate-upgrade-analytics').className).toMatch(/\bbg-neo-lime\b/);
    expect(screen.getByTestId('pro-gate-pill').className).toMatch(/\bbg-neo-yellow\b/);
    expect(screen.getByTestId('pro-gate-lock').className).toMatch(/\bshadow-hard-xl\b/);
    expect(screen.getByTestId('pro-gate-upgrade-analytics')).toHaveTextContent('eduPlans.reports.trialCta');
  });

  it('Given a phone, Then the pitch and its button come before the sample report and the calm lock is a chunky panel', () => {
    mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false, known: true, status: 'active', trialUsed: false });
    render(
      <ProGate feature="reports" tone="calm" polarTrialPlacement="reports_teaser">
        <div>paid</div>
      </ProGate>,
    );
    expect(screen.getByTestId('pro-gate-pitch').className).toMatch(/(^|\s)max-md:order-first(\s|$)/);
    expect(screen.getByTestId('pro-gate-upgrade-reports').className).toMatch(/(^|\s)max-sm:w-full(\s|$)/);
    const lock = screen.getByTestId('pro-gate-lock');
    expect(lock.className).toMatch(/border-\[3px\]/);
    expect(lock.className).toMatch(/(^|\s)shadow-hard-xl(\s|$)/);
  });

  it('Given a quiet lock (the class has no games yet), Then the upgrade is a plain secondary link with no fill, still 44px tall, so the page keeps one loud primary', () => {
    mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false, known: true, status: 'active', trialUsed: false });
    render(
      <ProGate feature="analytics" tone="calm" quiet>
        <div>paid</div>
      </ProGate>,
    );
    const cta = screen.getByTestId('pro-gate-upgrade-analytics');
    expect(cta.className).not.toMatch(COLOR_FILL);
    expect(cta.className).toMatch(/\bunderline\b/);
    expect(cta.className).toMatch(/\bmin-h-11\b/);
    expect(cta.className).not.toMatch(/shadow-hard/);
    expect(fills(screen.getByTestId('pro-gate-pitch')).filter((el) => el !== screen.getByTestId('pro-gate-pill'))).toEqual([]);
  });
});

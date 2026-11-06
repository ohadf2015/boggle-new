import React from 'react';
import { render, screen, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProGate } from '../ProGate';

vi.mock('@/lib/education/motion/useEduReducedMotion', () => ({ useEduReducedMotion: () => false }));

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

describe('ProGate arcade tone (reports)', () => {
  const renderLock = () => {
    mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false, known: true, status: 'active', trialUsed: false });
    return render(
      <ProGate feature="reports" tone="arcade" polarTrialPlacement="reports_teaser">
        <div>paid</div>
      </ProGate>,
    );
  };

  it('Given a free teacher, Then the lock is a chunky game card with the mascot beside the sample report', () => {
    renderLock();
    const lock = screen.getByTestId('pro-gate-lock');
    expect(lock.className).toMatch(/border-\[3px\]/);
    expect(lock.className).toContain('border-neo-black');
    expect(lock).toContainElement(screen.getByTestId('edu-mascot-pro'));
    expect(screen.getByTestId('edu-mascot-pro').closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('Given the sample report, Then each student accuracy is a colored chip and none of them is lime', () => {
    renderLock();
    const chips = screen.getAllByTestId('pro-preview-accuracy-chip');
    expect(chips.length).toBeGreaterThan(1);
    chips.forEach((c) => expect(c.className).toMatch(/(^|\s)bg-neo-(cyan|yellow|pink)(\s|$)/));
  });

  it('Given the lock, Then the trial button is the one lime fill on the page and it carries the shine', () => {
    const { container } = renderLock();
    const cta = screen.getByTestId('pro-gate-upgrade-reports');
    const lime = Array.from(container.querySelectorAll<HTMLElement>('[class]')).filter((el) => /(^|\s)bg-neo-lime(\s|$)/.test(el.getAttribute('class') ?? ''));
    expect(lime).toEqual([cta]);
    expect(cta.className).toContain('animate-edu-shine');
    expect(container.querySelectorAll('.uppercase')).toHaveLength(0);
  });

  it('Given the sample report, Then each student row carries a segmented accuracy bar in the same color as its chip', () => {
    renderLock();
    const rows = screen.getAllByTestId('pro-preview-student-row');
    expect(rows.length).toBeGreaterThan(1);
    rows.forEach((row) => {
      const chipColor = within(row).getByTestId('pro-preview-accuracy-chip').className.match(/bg-neo-(cyan|yellow|pink)/)?.[1];
      const bar = within(row).getByTestId('pro-preview-accuracy-bar');
      const filled = Array.from(bar.children).filter((seg) => seg.className.includes(`bg-neo-${chipColor}`));
      expect(filled.length).toBeGreaterThan(0);
      expect(bar.children.length).toBe(10);
    });
  });
});

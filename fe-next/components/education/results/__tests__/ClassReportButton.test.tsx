import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
const pro = vi.hoisted(() => ({ hasPro: false, loading: false, known: true, trialUsed: false, accessTrialExpires: null as string | null, accessTrialEnded: false }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'teacher-1' } }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/lib/education/proFunnelTelemetry', () => ({ trackTeacherProUpgradeClick: vi.fn() }));
const reports = vi.hoisted(() => ({ reportProOfferImpression: vi.fn(), reportProOfferClick: vi.fn(), reportProCtaClick: vi.fn() }));
vi.mock('@/lib/education/reportProCtaClick', () => reports);

import { ClassReportButton } from '../ClassReportButton';

const DAY = 24 * 60 * 60 * 1000;

describe('ClassReportButton (round results, free teacher)', () => {
  beforeEach(() => {
    Object.assign(pro, { hasPro: false, loading: false, known: true, trialUsed: false, accessTrialExpires: null, accessTrialEnded: false });
    reports.reportProOfferImpression.mockClear();
    reports.reportProOfferClick.mockClear();
  });

  it.each([
    ['en', "See this class's report"],
    ['he', 'לדוח של הכיתה הזו'],
    ['es', 'Ver el informe de esta clase'],
    ['sv', 'Se klassens rapport'],
    ['ja', 'このクラスのレポートを見る'],
    ['ru', 'Отчёт по этому классу'],
  ])('shows the button in %s', (language, label) => {
    render(<ClassReportButton language={language} underHalf={2} bars={[10, 40]} />);
    expect(screen.getByTestId('class-report-button')).toHaveTextContent(label);
  });

  it('a tap is recorded as edu_pro_offer_clicked from class_report_button and opens the teaser', () => {
    render(<ClassReportButton language="en" underHalf={2} bars={[10, 40, 90]} />);
    expect(reports.reportProOfferImpression).toHaveBeenCalledWith(
      expect.objectContaining({ placement: 'class_report_button', format: 'report_button', stage: 'rendered' }),
      { userId: 'teacher-1' },
    );
    expect(screen.queryByTestId('class-report-teaser')).toBeNull();
    fireEvent.click(screen.getByTestId('class-report-button'));
    expect(reports.reportProOfferClick).toHaveBeenCalledWith({ placement: 'class_report_button', locale: 'en', cta: 'teacher_pro_trial', offer: 'trial', format: 'report_button' });
    const teaser = screen.getByTestId('class-report-teaser');
    expect(teaser).toHaveTextContent('2 students found under half the words this round');
    expect(teaser).not.toHaveTextContent(/Noa|Ido/);
    expect(reports.reportProOfferImpression).toHaveBeenCalledWith(expect.objectContaining({ format: 'report_teaser', stage: 'rendered' }), { userId: 'teacher-1' });
  });

  it('never trialed: the 14-day trial, straight into /teacher/upgrade', () => {
    render(<ClassReportButton language="en" underHalf={0} bars={[]} />);
    fireEvent.click(screen.getByTestId('class-report-button'));
    const cta = screen.getByTestId('class-report-teaser-cta');
    expect(cta).toHaveTextContent('Start your 14-day Teacher Pro trial');
    expect(cta).toHaveAttribute('href', '/en/teacher/upgrade?source=class_report_button');
    expect(screen.getByTestId('class-report-teaser-note')).toHaveTextContent('$9/mo');
    fireEvent.click(cta);
    expect(reports.reportProOfferClick).toHaveBeenLastCalledWith(expect.objectContaining({ placement: 'class_report_button', format: 'report_teaser', offer: 'trial' }));
  });

  it('inside the free access trial: keep Teacher Pro after the free trial, no new trial', () => {
    pro.accessTrialExpires = new Date(Date.now() + 5 * DAY).toISOString();
    render(<ClassReportButton language="en" underHalf={1} bars={[20]} />);
    fireEvent.click(screen.getByTestId('class-report-button'));
    const teaser = screen.getByTestId('class-report-teaser');
    expect(teaser).toHaveAttribute('data-offer', 'keep_after_trial');
    expect(teaser).toHaveTextContent(/Keep Teacher Pro after your free trial/i);
    expect(teaser).not.toHaveTextContent(/14-day|Start your/);
    // The access trial opens the report right now, so the teaser links to it instead of calling it locked.
    expect(teaser).toHaveTextContent('Your class report is open during your free trial');
    expect(screen.getByTestId('class-report-teaser-open')).toHaveAttribute('href', '/en/teacher/reports');
  });

  it('access trial ended: straight $9/mo, no trial wording', () => {
    pro.accessTrialEnded = true;
    render(<ClassReportButton language="en" underHalf={1} bars={[20]} />);
    fireEvent.click(screen.getByTestId('class-report-button'));
    const teaser = screen.getByTestId('class-report-teaser');
    expect(teaser).toHaveAttribute('data-offer', 'paid');
    expect(screen.getByTestId('class-report-teaser-cta')).toHaveTextContent('Continue with Teacher Pro');
    expect(teaser).toHaveTextContent('$9/mo');
    expect(teaser).not.toHaveTextContent(/14-day|Start your|Try Teacher Pro free/);
    expect(screen.queryByTestId('class-report-teaser-open')).toBeNull();
  });

  it('Hebrew teaser is RTL and keeps the single-trial ask', () => {
    pro.accessTrialEnded = true;
    const { container } = render(<ClassReportButton language="he" underHalf={3} bars={[20]} />);
    fireEvent.click(screen.getByTestId('class-report-button'));
    expect(container.firstElementChild).toHaveAttribute('dir', 'rtl');
    expect(screen.getByTestId('class-report-teaser-cta')).toHaveTextContent('להמשיך עם פרו למורים');
  });

  it('hidden for Pro teachers and while the entitlement loads', () => {
    pro.hasPro = true;
    const { rerender } = render(<ClassReportButton language="en" underHalf={1} bars={[]} />);
    expect(screen.queryByTestId('class-report-button')).toBeNull();
    pro.hasPro = false;
    pro.loading = true;
    rerender(<ClassReportButton language="en" underHalf={1} bars={[]} />);
    expect(screen.queryByTestId('class-report-button')).toBeNull();
    expect(reports.reportProOfferImpression).not.toHaveBeenCalled();
  });
});

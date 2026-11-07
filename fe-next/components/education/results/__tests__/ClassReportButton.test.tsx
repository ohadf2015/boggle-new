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
const useTeacherPro = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => useTeacherPro() }));
const auth = vi.hoisted(() => ({ user: { id: 'teacher-1' } as { id: string } | null, loading: false, isTeacher: true }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/lib/education/proFunnelTelemetry', () => ({ trackTeacherProUpgradeClick: vi.fn() }));
const reports = vi.hoisted(() => ({ reportProOfferImpression: vi.fn(), reportProOfferClick: vi.fn(), reportProCtaClick: vi.fn() }));
vi.mock('@/lib/education/reportProCtaClick', () => reports);

import { ClassReportButton } from '../ClassReportButton';
import type { RoundWordGridInput } from '../roundWordGrid';

const ROUND: RoundWordGridInput = {
  gameMode: 'classic',
  coverage: [
    { word: 'castle', foundBy: ['Noa'] },
    { word: 'bridge', foundBy: [] },
  ],
  masteryByPlayer: { Noa: { found: 1, total: 2 }, Ido: { found: 0, total: 2 } },
};

const DAY = 24 * 60 * 60 * 1000;

describe('ClassReportButton (round results, free teacher)', () => {
  beforeEach(() => {
    Object.assign(pro, { hasPro: false, loading: false, known: true, trialUsed: false, accessTrialExpires: null, accessTrialEnded: false });
    Object.assign(auth, { user: { id: 'teacher-1' }, loading: false, isTeacher: true });
    useTeacherPro.mockReset();
    useTeacherPro.mockImplementation(() => pro);
    reports.reportProOfferImpression.mockClear();
    reports.reportProOfferClick.mockClear();
  });

  it('Given a free teacher, When the round ends, Then the report reads as free, never "comes with Teacher Pro", and records rendered + viewed', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<ClassReportButton language="en" underHalf={2} bars={[10, 40, 90]} round={ROUND} proLabel="Pro" />);
    const teaser = screen.getByTestId('class-report-teaser');
    expect(teaser).toHaveTextContent('eduProResults.freeTitle');
    expect(teaser).not.toHaveTextContent(/comes with Teacher Pro/);
    expect(teaser.innerHTML).not.toMatch(/blur-/);
    expect(teaser).toHaveTextContent('2 students found under half the words this round');
    expect(teaser).not.toHaveTextContent(/Noa|Ido/);
    expect(screen.getByTestId('class-report-depth')).toHaveTextContent('eduProResults.proDepth');
    expect(screen.getByTestId('class-report-depth').querySelector('[data-testid="pro-pill"]')).toHaveTextContent('Pro');
    for (const stage of ['rendered', 'viewed']) {
      expect(reports.reportProOfferImpression).toHaveBeenCalledWith(
        expect.objectContaining({ placement: 'class_report_button', format: 'report_teaser', stage }),
        { userId: 'teacher-1' },
      );
    }
    vi.unstubAllGlobals();
  });

  it('Given this round\'s data, When the teacher opens the report, Then the real word-by-student grid shows free, with names only inside it', () => {
    render(<ClassReportButton language="en" underHalf={1} bars={[0, 50]} round={ROUND} />);
    expect(screen.queryByTestId('round-grid-dialog')).toBeNull();
    expect(screen.getByTestId('class-report-open-grid-note')).toHaveTextContent('eduProResults.openGridNote');
    fireEvent.click(screen.getByTestId('class-report-open-grid'));
    const dialog = screen.getByTestId('round-grid-dialog');
    expect(dialog).toHaveAttribute('role', 'dialog');
    expect(dialog).toHaveTextContent('Noa');
    expect(dialog).toHaveTextContent('Ido');
    expect(screen.getAllByTestId('report-row').map((r) => r.getAttribute('data-word'))).toEqual(['bridge', 'castle']);
    expect(dialog.innerHTML).not.toMatch(/blur-/);
    expect(screen.getByTestId('round-grid-school-quote')).toHaveAttribute('href', '/en/education/for-schools?source=class_report_grid');
    expect(screen.getByTestId('round-grid-school-quote')).toHaveAttribute('target', '_blank');
    fireEvent.click(screen.getByTestId('round-grid-close'));
    expect(screen.queryByTestId('round-grid-dialog')).toBeNull();
  });

  it('Given no round data (an older summary), When shown, Then there is no grid button rather than an empty grid', () => {
    render(<ClassReportButton language="en" underHalf={0} bars={[]} />);
    expect(screen.queryByTestId('class-report-open-grid')).toBeNull();
  });

  it('Given the host tree mounted the slot but the profile lookup failed (isTeacher false), When results show, Then the free grid still opens', () => {
    Object.assign(auth, { user: { id: 'teacher-1' }, loading: false, isTeacher: false });
    render(<ClassReportButton language="en" underHalf={1} bars={[0, 50]} round={ROUND} />);
    fireEvent.click(screen.getByTestId('class-report-open-grid'));
    expect(screen.getByTestId('round-grid-dialog')).toHaveTextContent('Noa');
  });

  it('Given the auth session is still loading, When results mount, Then nothing renders and no impression fires before the user id is known', () => {
    Object.assign(auth, { user: null, loading: true, isTeacher: false });
    const { container } = render(<ClassReportButton language="en" underHalf={2} bars={[10]} round={ROUND} />);
    expect(container).toBeEmptyDOMElement();
    expect(reports.reportProOfferImpression).not.toHaveBeenCalled();
  });

  it('Given the dialog opened from its button, When it closes, Then focus returns to that button', () => {
    render(<ClassReportButton language="en" underHalf={1} bars={[0, 50]} round={ROUND} />);
    const opener = screen.getByTestId('class-report-open-grid');
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByTestId('round-grid-close')).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('round-grid-dialog')).toBeNull();
    expect(screen.getByTestId('class-report-open-grid')).toHaveFocus();
  });

  it('Given the dialog is open, When Tab leaves the last control or Shift+Tab the first, Then focus wraps inside the dialog', () => {
    render(<ClassReportButton language="en" underHalf={1} bars={[0, 50]} round={ROUND} />);
    fireEvent.click(screen.getByTestId('class-report-open-grid'));
    const first = screen.getByTestId('round-grid-close');
    const last = screen.getByTestId('round-grid-school-quote');
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });

  it('the upgrade link opens in a new tab so the live room stays up, and is 44px tall', () => {
    render(<ClassReportButton language="en" underHalf={0} bars={[]} proLabel="Pro" />);
    const cta = screen.getByTestId('class-report-teaser-cta');
    expect(cta).toHaveAttribute('target', '_blank');
    expect(cta.className).toMatch(/min-h-11/);
    expect(cta.className).toMatch(/focus-visible:ring/);
  });

  it('never trialed: the 14-day trial, straight into /teacher/upgrade', () => {
    render(<ClassReportButton language="en" underHalf={0} bars={[]} />);
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
    const teaser = screen.getByTestId('class-report-teaser');
    expect(teaser).toHaveAttribute('data-offer', 'keep_after_trial');
    expect(teaser).toHaveTextContent(/Keep Teacher Pro after your free trial/i);
    expect(teaser).not.toHaveTextContent(/14-day|Start your/);
    // The access trial opens the report right now, so the teaser links to it instead of calling it locked.
    expect(teaser).toHaveTextContent('Your class report is open during your free trial');
    expect(screen.getByTestId('class-report-teaser-open')).toHaveAttribute('href', '/en/teacher/reports');
    // One action per Pro slot: while the report is open, no second upgrade link competes with it.
    expect(screen.queryByTestId('class-report-teaser-cta')).toBeNull();
  });

  it('access trial ended: straight $9/mo, no trial wording', () => {
    pro.accessTrialEnded = true;
    render(<ClassReportButton language="en" underHalf={1} bars={[20]} />);
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
    expect(container.firstElementChild).toHaveAttribute('dir', 'rtl');
    expect(screen.getByTestId('class-report-teaser-cta')).toHaveTextContent('להמשיך עם פרו למורים');
  });

  it('hidden for Pro teachers and while the entitlement loads', () => {
    pro.hasPro = true;
    const { rerender } = render(<ClassReportButton language="en" underHalf={1} bars={[]} />);
    expect(screen.queryByTestId('class-report-teaser')).toBeNull();
    pro.hasPro = false;
    pro.loading = true;
    rerender(<ClassReportButton language="en" underHalf={1} bars={[]} />);
    expect(screen.queryByTestId('class-report-teaser')).toBeNull();
    expect(reports.reportProOfferImpression).not.toHaveBeenCalled();
  });
});

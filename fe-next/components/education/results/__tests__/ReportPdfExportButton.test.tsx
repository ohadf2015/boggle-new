import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

const pro = vi.hoisted(() => ({ hasPro: false, loading: false, known: true, trialUsed: false, accessTrialExpires: null as string | null, accessTrialEnded: false }));
const useTeacherPro = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => useTeacherPro() }));
const auth = vi.hoisted(() => ({ user: { id: 'teacher-1' } as { id: string } | null, loading: false, isTeacher: true }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string, p?: Record<string, string>) => (p?.name ? `${k}:${p.name}` : k), language: 'en', dir: 'ltr' }) }));
vi.mock('@/lib/education/proFunnelTelemetry', () => ({ trackTeacherProUpgradeClick: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));
const reports = vi.hoisted(() => ({ reportProOfferImpression: vi.fn(), reportProOfferClick: vi.fn(), reportProCtaClick: vi.fn() }));
vi.mock('@/lib/education/reportProCtaClick', () => reports);
const checkout = vi.hoisted(() => ({
  postTeacherProCheckout: vi.fn(async () => ({ ok: true as const, url: 'https://polar.example/checkout' })),
  goToPolarCheckout: vi.fn(),
  checkoutFailureKey: vi.fn(() => 'teacher.subscription.checkoutError'),
}));
vi.mock('@/lib/education/postTeacherProCheckout', () => checkout);
const pdf = vi.hoisted(() => ({ downloadReportPdf: vi.fn(async () => {}) }));
vi.mock('@/components/teacher/reports/downloadReportPdf', () => pdf);

import { ReportPdfExportButton, REPORT_PDF_PLACEMENT } from '../ReportPdfExportButton';
import { reportPdfButtonCopy, REPORT_PDF_BUTTON_LOCALES } from '@/lib/education/pro/reportPdfButtonCopy';
import { PRO_OFFER_PLACEMENTS } from '@/lib/education/pro/proOfferPlacements';

const DAY = 24 * 60 * 60 * 1000;
const summary = {
  teacherName: 'Ms Dana',
  lessonNames: ['Animals'],
  totalWords: 10,
  classFoundCount: 7,
  masteryByPlayer: { Noa: { found: 8, total: 10 }, Ido: { found: 2, total: 10 }, 'Ms Dana': { found: 10, total: 10 } },
};
const players = [
  { username: 'Noa', score: 40 },
  { username: 'Ido', score: 10 },
];

describe('ReportPdfExportButton', () => {
  beforeEach(() => {
    Object.assign(auth, { user: { id: 'teacher-1' }, loading: false, isTeacher: true });
    useTeacherPro.mockReset();
    useTeacherPro.mockImplementation(() => pro);
  });

  it.each([
    ['a student', { user: { id: 's1' }, loading: false, isTeacher: false }],
    ['an anonymous guest', { user: null, loading: false, isTeacher: false }],
    ['a viewer whose role is still loading', { user: { id: 't1' }, loading: true, isTeacher: false }],
  ])('Given %s, Then no locked export or price renders and Pro status is never fetched', (_label, viewer) => {
    Object.assign(auth, viewer);
    const { container } = render(<ReportPdfExportButton language="en" summary={summary} players={players} />);
    expect(container).toBeEmptyDOMElement();
    expect(useTeacherPro).not.toHaveBeenCalled();
  });

  let tab: { location: { href: string }; close: ReturnType<typeof vi.fn>; opener: unknown };
  beforeEach(() => {
    Object.assign(pro, { hasPro: false, loading: false, known: true, trialUsed: false, accessTrialExpires: null, accessTrialEnded: false });
    vi.clearAllMocks();
    tab = { location: { href: 'about:blank' }, close: vi.fn(), opener: {} };
    vi.spyOn(window, 'open').mockImplementation(() => tab as unknown as Window);
  });
  afterEach(() => vi.restoreAllMocks());

  it('has its own placement that the server twins accept', () => {
    expect(REPORT_PDF_PLACEMENT).toBe('results_report_pdf');
    expect(PRO_OFFER_PLACEMENTS.has('results_report_pdf')).toBe(true);
    expect(PRO_OFFER_PLACEMENTS.has('dashboard')).toBe(true);
    expect(PRO_OFFER_PLACEMENTS.has('trial_ending_card')).toBe(true);
  });

  it.each(['en', 'he', 'es', 'sv', 'ja', 'ru'])('is translated in %s', (language) => {
    expect(REPORT_PDF_BUTTON_LOCALES).toContain(language);
    const copy = reportPdfButtonCopy(language);
    if (language !== 'en') expect(copy.button).not.toBe(reportPdfButtonCopy('en').button);
    render(<ReportPdfExportButton language={language} summary={summary} players={players} />);
    expect(screen.getByTestId('report-pdf-export')).toHaveTextContent(copy.button);
  });

  it('free teacher: locked with a Pro pill, impression once per session via the shared dedupe', () => {
    render(<ReportPdfExportButton language="en" summary={summary} players={players} />);
    const btn = screen.getByTestId('report-pdf-export');
    expect(btn).toHaveAttribute('data-locked', 'true');
    expect(btn).toHaveTextContent('Export class report (PDF)');
    expect(btn.querySelector('[data-testid="pro-pill"]')).not.toBeNull();
    expect(reports.reportProOfferImpression).toHaveBeenCalledTimes(1);
    expect(reports.reportProOfferImpression).toHaveBeenCalledWith(
      expect.objectContaining({ placement: 'results_report_pdf', format: 'report_button', stage: 'rendered' }),
      { userId: 'teacher-1' },
    );
  });

  it('never trialed: the 14-day trial, straight to checkout in a new tab', async () => {
    render(<ReportPdfExportButton language="en" summary={summary} players={players} />);
    expect(screen.getByTestId('report-pdf-offer')).toHaveTextContent(/14-day/);
    fireEvent.click(screen.getByTestId('report-pdf-export'));
    expect(reports.reportProOfferClick).toHaveBeenCalledWith(expect.objectContaining({ placement: 'results_report_pdf', offer: 'trial', format: 'report_button' }));
    await waitFor(() => expect(tab.location.href).toBe('https://polar.example/checkout'));
    expect(checkout.postTeacherProCheckout).toHaveBeenCalledWith(expect.anything(), { trial: true, locale: 'en', placement: 'results_report_pdf' });
    expect(checkout.goToPolarCheckout).not.toHaveBeenCalled();
    expect(pdf.downloadReportPdf).not.toHaveBeenCalled();
  });

  it('inside the free access trial: keep Teacher Pro after the free trial, no new trial wording', async () => {
    pro.accessTrialExpires = new Date(Date.now() + 5 * DAY).toISOString();
    render(<ReportPdfExportButton language="en" summary={summary} players={players} />);
    expect(screen.getByTestId('report-pdf-locked')).toHaveAttribute('data-offer', 'keep_after_trial');
    const offer = screen.getByTestId('report-pdf-offer');
    expect(offer).toHaveTextContent(/Keep Teacher Pro after/i);
    expect(offer).not.toHaveTextContent(/14-day|Start your/);
    fireEvent.click(screen.getByTestId('report-pdf-export'));
    await waitFor(() => expect(checkout.postTeacherProCheckout).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ trial: true })));
  });

  it('access trial ended: straight $9/mo, no trial', async () => {
    pro.accessTrialEnded = true;
    render(<ReportPdfExportButton language="en" summary={summary} players={players} />);
    expect(screen.getByTestId('report-pdf-locked')).toHaveAttribute('data-offer', 'paid');
    const offer = screen.getByTestId('report-pdf-offer');
    expect(offer).toHaveTextContent('$9');
    expect(offer).not.toHaveTextContent(/14-day|free trial/i);
    fireEvent.click(screen.getByTestId('report-pdf-export'));
    await waitFor(() => expect(checkout.postTeacherProCheckout).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ trial: false })));
  });

  it('a failed checkout closes the blank tab', async () => {
    checkout.postTeacherProCheckout.mockResolvedValueOnce({ ok: false, status: 503 } as never);
    render(<ReportPdfExportButton language="en" summary={summary} players={players} />);
    fireEvent.click(screen.getByTestId('report-pdf-export'));
    await waitFor(() => expect(tab.close).toHaveBeenCalled());
  });

  it('Pro teacher: exports this round as the class-report PDF, no offer, no impression', async () => {
    pro.hasPro = true;
    render(<ReportPdfExportButton language="en" summary={summary} players={players} />);
    const btn = screen.getByTestId('report-pdf-export');
    expect(btn).toHaveAttribute('data-locked', 'false');
    expect(screen.queryByTestId('report-pdf-offer')).toBeNull();
    expect(reports.reportProOfferImpression).not.toHaveBeenCalled();
    fireEvent.click(btn);
    await waitFor(() => expect(pdf.downloadReportPdf).toHaveBeenCalledTimes(1));
    const arg = (pdf.downloadReportPdf.mock.calls[0] as unknown as [{ data: { type: string; classroomName: string; studentRankings: unknown[] }; fileName: string }])[0];
    expect(arg.data.type).toBe('class');
    expect(arg.data.classroomName).toBe('Animals');
    expect(arg.data.studentRankings).toHaveLength(2);
    expect(arg.fileName).toBe('teacher.reports.export.fileClass:Animals');
    expect(checkout.postTeacherProCheckout).not.toHaveBeenCalled();
  });

  it('renders nothing while the entitlement loads', () => {
    pro.loading = true;
    const { container } = render(<ReportPdfExportButton language="en" summary={summary} players={players} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('reports viewed once half of the locked button is on screen', () => {
    type Cb = (entries: Array<{ isIntersecting: boolean; intersectionRatio: number }>) => void;
    const observers: Array<{ cb: Cb }> = [];
    const original = globalThis.IntersectionObserver;
    class FakeIO {
      constructor(cb: Cb) {
        observers.push({ cb });
      }
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
    }
    globalThis.IntersectionObserver = FakeIO as unknown as typeof IntersectionObserver;
    try {
      render(<ReportPdfExportButton language="en" summary={summary} players={players} />);
      expect(reports.reportProOfferImpression).toHaveBeenCalledWith(
        expect.objectContaining({ placement: 'results_report_pdf', format: 'report_button', stage: 'rendered' }),
        { userId: 'teacher-1' },
      );
      expect(reports.reportProOfferImpression).not.toHaveBeenCalledWith(expect.objectContaining({ stage: 'viewed' }), expect.anything());
      act(() => observers.forEach((o) => o.cb([{ isIntersecting: true, intersectionRatio: 1 }])));
      expect(reports.reportProOfferImpression).toHaveBeenCalledWith(
        expect.objectContaining({ placement: 'results_report_pdf', format: 'report_button', stage: 'viewed' }),
        { userId: 'teacher-1' },
      );
    } finally {
      globalThis.IntersectionObserver = original;
    }
  });
});

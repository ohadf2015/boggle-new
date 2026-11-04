import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

const pro = vi.hoisted(() => ({ hasPro: false, loading: false, known: true, trialUsed: false, accessTrialExpires: null as string | null, accessTrialEnded: false }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'teacher-1' } }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }) }));
vi.mock('@/lib/education/proFunnelTelemetry', () => ({ trackTeacherProUpgradeClick: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));
vi.mock('@/lib/education/reportProCtaClick', () => ({ reportProOfferImpression: vi.fn(), reportProOfferClick: vi.fn(), reportProCtaClick: vi.fn() }));
vi.mock('@/lib/education/postTeacherProCheckout', () => ({ postTeacherProCheckout: vi.fn(), goToPolarCheckout: vi.fn(), checkoutFailureKey: vi.fn() }));
const growth = vi.hoisted(() => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/utils/growthTracking', () => growth);
const classes = vi.hoisted(() => ({ countTeacherClassrooms: vi.fn(async () => 3 as number | null) }));
vi.mock('@/lib/supabase/education/classrooms', () => classes);
const upsell = vi.hoisted(() => ({ useUpsellImpression: vi.fn() }));
vi.mock('@/lib/education/useUpsellImpression', () => upsell);

import { ReportPdfExportButton } from '../ReportPdfExportButton';
import { RESULTS_SCHOOL_QUOTE_PLACEMENT, SCHOOL_QUOTE_MIN_CLASSES, schoolQuoteHref } from '../ResultsSchoolQuoteLink';
import { resultsTrialCopy } from '@/lib/education/pro/trialCtaCopy';
import { SCHOOL_PRICING } from '@/lib/education/pro/schoolPricing';

const summary = { teacherName: 'T', lessonNames: [], totalWords: 10, classFoundCount: 7, masteryByPlayer: { A: { found: 5, total: 10 } } };

function renderButton(language = 'en') {
  return render(<ReportPdfExportButton language={language} summary={summary} players={[{ username: 'A', score: 1 }]} />);
}

describe('"Get a school quote" beside the locked class-report PDF button', () => {
  beforeEach(() => {
    Object.assign(pro, { hasPro: false, loading: false, known: true });
    classes.countTeacherClassrooms.mockResolvedValue(3);
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('uses its own placement and a 3-class threshold', () => {
    expect(RESULTS_SCHOOL_QUOTE_PLACEMENT).toBe('results_school_quote');
    expect(SCHOOL_QUOTE_MIN_CLASSES).toBe(3);
    expect(schoolQuoteHref('he')).toBe('/he/education/for-schools?source=results_school_quote');
  });

  it('Given a free teacher with 3 classes, Then the quote link shows next to the locked button and points at for-schools', async () => {
    renderButton();
    const link = await screen.findByTestId('results-school-quote-pdf-link');
    expect(screen.getByTestId('report-pdf-locked')).toContainElement(link);
    expect(link).toHaveAttribute('href', '/en/education/for-schools?source=results_school_quote');
    expect(link).toHaveTextContent('Get a school quote');
    expect(link).toHaveAttribute('target', '_blank');
    expect(classes.countTeacherClassrooms).toHaveBeenCalledWith('teacher-1');
  });

  it('Given 2 classes, Then there is no quote link', async () => {
    classes.countTeacherClassrooms.mockResolvedValue(2);
    renderButton();
    await waitFor(() => expect(classes.countTeacherClassrooms).toHaveBeenCalled());
    expect(screen.queryByTestId('results-school-quote')).toBeNull();
  });

  it('Given the class count read fails, Then there is no quote link', async () => {
    classes.countTeacherClassrooms.mockResolvedValue(null);
    renderButton();
    await waitFor(() => expect(classes.countTeacherClassrooms).toHaveBeenCalled());
    expect(screen.queryByTestId('results-school-quote')).toBeNull();
  });

  it('Given a Pro teacher, Then the unlocked export has no quote link and no count read', () => {
    pro.hasPro = true;
    renderButton();
    expect(screen.queryByTestId('results-school-quote')).toBeNull();
    expect(classes.countTeacherClassrooms).not.toHaveBeenCalled();
  });

  it('tracks a tap with the existing school-quote click event and placement', async () => {
    renderButton();
    fireEvent.click(await screen.findByTestId('results-school-quote-pdf-link'));
    expect(growth.trackGrowthEvent).toHaveBeenCalledWith('landing_cta_clicked', { cta: 'district_upsell', source: 'results_school_quote', locale: 'en' });
  });

  it('reports the existing school impression once shown', async () => {
    renderButton();
    await screen.findByTestId('results-school-quote-pdf-link');
    expect(upsell.useUpsellImpression).toHaveBeenLastCalledWith(expect.anything(), { cta: 'district_upsell', placement: 'results_school_quote' }, { locale: 'en' });
  });

  it.each(['en', 'he', 'es', 'sv', 'ja', 'ru'])('is translated in %s and keeps the school price', async (language) => {
    renderButton(language);
    const box = await screen.findByTestId('results-school-quote');
    const copy = resultsTrialCopy(language);
    expect(box).toHaveTextContent(copy.quoteCta);
    if (language !== 'en') expect(copy.quoteCta).not.toBe(resultsTrialCopy('en').quoteCta);
    expect(box.textContent).toContain(String(SCHOOL_PRICING.perTeacherYearUsd));
    expect(screen.getByTestId('results-school-quote-pdf-link')).toHaveAttribute('href', `/${language}/education/for-schools?source=results_school_quote`);
  });
});

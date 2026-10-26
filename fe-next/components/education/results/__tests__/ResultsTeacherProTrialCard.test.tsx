import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResultsTeacherProTrialCard } from '@/components/education/results/ResultsTeacherProTrialCard';
import { resultsTrialCopy } from '@/lib/education/pro/trialCtaCopy';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
const pro = vi.hoisted(() => ({ hasPro: false, loading: false, known: true, trialUsed: false, accessTrialExpires: null as string | null, accessTrialEnded: false }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro }));
const growth = vi.hoisted(() => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/utils/growthTracking', () => growth);
const funnel = vi.hoisted(() => ({ trackTeacherProUpgradeClick: vi.fn() }));
vi.mock('@/lib/education/proFunnelTelemetry', () => funnel);

describe('ResultsTeacherProTrialCard', () => {
  beforeEach(() => {
    Object.assign(pro, { hasPro: false, loading: false, known: true, trialUsed: false, accessTrialExpires: null, accessTrialEnded: false });
    growth.trackGrowthEvent.mockClear();
    funnel.trackTeacherProUpgradeClick.mockClear();
  });

  it('offers the 14-day trial and a school quote link to a free teacher', () => {
    render(<ResultsTeacherProTrialCard language="en" />);
    const cta = screen.getByTestId('results-teacher-pro-trial-cta');
    expect(cta).toHaveTextContent('Start your 14-day Teacher Pro trial');
    expect(cta.getAttribute('href')).toMatch(/^\/en\/teacher\/upgrade/);
    expect(screen.getByTestId('results-teacher-pro-trial-card')).toHaveTextContent('$9/mo');
    const quote = screen.getByTestId('results-school-quote-link');
    expect(quote).toHaveTextContent('Get a school quote');
    expect(quote.getAttribute('href')).toMatch(/^\/en\/education\/for-schools/);
    expect(screen.getByTestId('results-teacher-pro-trial-card')).toHaveTextContent('$49 per teacher / year for 5+ teachers');
  });

  it('stays a quiet outlined secondary so the round-end screen keeps one solid primary', () => {
    for (const placement of [undefined, 'class_created'] as const) {
      const { unmount } = render(<ResultsTeacherProTrialCard language="en" placement={placement} />);
      const cta = screen.getByTestId('results-teacher-pro-trial-cta');
      const solidFill = cta.className.split(/\s+/).filter((c) => /^bg-neo-[a-z-]+$/.test(c) && !/navy/.test(c));
      expect(solidFill).toEqual([]);
      expect(cta.className).not.toMatch(/shadow-hard/);
      expect(cta.className).toMatch(/\bborder-neo-pink\b/);
      expect(screen.getByTestId('results-teacher-pro-trial-card')).toHaveTextContent('Teacher Pro');
      unmount();
    }
  });

  it('fires the upgrade click with placement classroom_results on tap (impressions: see the viewport-gated suite)', () => {
    render(<ResultsTeacherProTrialCard language="he" />);
    fireEvent.click(screen.getByTestId('results-teacher-pro-trial-cta'));
    expect(funnel.trackTeacherProUpgradeClick).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'he', placement: 'classroom_results' }),
    );
    expect(screen.getByTestId('results-teacher-pro-trial-card')).toHaveAttribute('dir', 'rtl');
  });

  it('inside the free access trial asks to keep Pro when it ends, not for a second 14-day trial', () => {
    pro.accessTrialExpires = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();
    render(<ResultsTeacherProTrialCard language="en" />);
    const card = screen.getByTestId('results-teacher-pro-trial-card');
    expect(card).toHaveTextContent('Keep Teacher Pro after your free trial');
    expect(screen.getByTestId('results-teacher-pro-trial-cta')).toHaveTextContent('Keep Teacher Pro after my trial');
    expect(card).toHaveTextContent('$9/mo starts when your trial ends');
    expect(card).toHaveTextContent('Cancel anytime');
    expect(card).not.toHaveTextContent('14-day');
  });

  it('an access trial that already ended gets the normal trial offer', () => {
    pro.accessTrialExpires = new Date(Date.now() - 60_000).toISOString();
    render(<ResultsTeacherProTrialCard language="en" />);
    expect(screen.getByTestId('results-teacher-pro-trial-cta')).toHaveTextContent('Start your 14-day Teacher Pro trial');
  });

  it('free access trial ended: continue with Teacher Pro, no trial wording (results and class-ready)', () => {
    pro.accessTrialEnded = true;
    for (const placement of [undefined, 'class_created'] as const) {
      const { unmount } = render(<ResultsTeacherProTrialCard language="en" placement={placement} />);
      const card = screen.getByTestId('results-teacher-pro-trial-card');
      expect(card).toHaveTextContent('Your free trial has ended: continue with Teacher Pro');
      expect(screen.getByTestId('results-teacher-pro-trial-cta')).toHaveTextContent('Continue with Teacher Pro');
      expect(card).toHaveTextContent('$9/mo · Cancel anytime');
      expect(card).not.toHaveTextContent(/14-day|Start your|Try Teacher Pro free/);
      unmount();
    }
  });

  it('free access trial ended, in Hebrew', () => {
    pro.accessTrialEnded = true;
    render(<ResultsTeacherProTrialCard language="he" />);
    expect(screen.getByTestId('results-teacher-pro-trial-cta')).toHaveTextContent('להמשיך עם פרו למורים');
  });

  it('stays hidden for Pro teachers and while the entitlement loads', () => {
    pro.hasPro = true;
    const { rerender } = render(<ResultsTeacherProTrialCard language="en" />);
    expect(screen.queryByTestId('results-teacher-pro-trial-card')).toBeNull();
    pro.hasPro = false;
    pro.loading = true;
    rerender(<ResultsTeacherProTrialCard language="en" />);
    expect(screen.queryByTestId('results-teacher-pro-trial-card')).toBeNull();
    expect(growth.trackGrowthEvent).not.toHaveBeenCalled();
  });

  it('falls back to the upgrade label once the trial is used', () => {
    pro.trialUsed = true;
    render(<ResultsTeacherProTrialCard language="en" />);
    expect(screen.getByTestId('results-teacher-pro-trial-cta')).toHaveTextContent('Upgrade to Teacher Pro');
  });

  it('has complete copy for every supported locale', () => {
    for (const l of ['en', 'he', 'sv', 'ja', 'es', 'ru']) {
      const c = resultsTrialCopy(l);
      for (const v of Object.values(c)) {
        expect(v).not.toMatch(/\{\w+\}/);
        expect(v.length).toBeGreaterThan(0);
      }
      expect(c.trialCta).toContain('14');
    }
  });
});

describe('ResultsTeacherProTrialCard impressions are viewport-gated', () => {
  type Cb = (entries: Array<{ isIntersecting: boolean; intersectionRatio: number }>) => void;
  let observers: Array<{ cb: Cb; targets: Element[] }> = [];
  const original = globalThis.IntersectionObserver;

  beforeEach(() => {
    Object.assign(pro, { hasPro: false, loading: false, known: true, trialUsed: false });
    growth.trackGrowthEvent.mockClear();
    observers = [];
    class FakeIO {
      private o: { cb: Cb; targets: Element[] };
      constructor(cb: Cb) {
        this.o = { cb, targets: [] };
        observers.push(this.o);
      }
      observe(el: Element) {
        this.o.targets.push(el);
      }
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
    }
    globalThis.IntersectionObserver = FakeIO as unknown as typeof IntersectionObserver;
  });
  afterEach(() => {
    globalThis.IntersectionObserver = original;
  });

  const impressions = () =>
    growth.trackGrowthEvent.mock.calls.filter(([e]) => e === 'education_upsell_impression').map(([, d]) => (d as { cta: string }).cta);

  it('does not count an impression while the card is hidden or off screen (display:none on a short projector, below the fold on a phone)', () => {
    render(<ResultsTeacherProTrialCard language="en" />);
    const card = screen.getByTestId('results-teacher-pro-trial-card');
    expect(observers.length).toBe(2);
    expect(observers.every((o) => o.targets.includes(card))).toBe(true);
    act(() => observers.forEach((o) => o.cb([{ isIntersecting: false, intersectionRatio: 0 }])));
    expect(impressions()).toEqual([]);
  });

  it('counts trial + school impressions once, when half the card is on screen', () => {
    render(<ResultsTeacherProTrialCard language="he" />);
    act(() => observers.forEach((o) => o.cb([{ isIntersecting: true, intersectionRatio: 0.6 }])));
    act(() => observers.forEach((o) => o.cb([{ isIntersecting: true, intersectionRatio: 1 }])));
    expect(impressions().sort()).toEqual(['district_upsell', 'teacher_pro_trial']);
    expect(growth.trackGrowthEvent).toHaveBeenCalledWith(
      'education_upsell_impression',
      expect.objectContaining({ cta: 'teacher_pro_trial', placement: 'classroom_results', locale: 'he' }),
    );
    expect(growth.trackGrowthEvent).toHaveBeenCalledWith(
      'education_upsell_impression',
      expect.objectContaining({ cta: 'district_upsell', placement: 'classroom_results', locale: 'he' }),
    );
  });

  it('attaches the observer only after the entitlement read settles', () => {
    pro.loading = true;
    const { rerender } = render(<ResultsTeacherProTrialCard language="en" />);
    expect(observers.length).toBe(0);
    pro.loading = false;
    rerender(<ResultsTeacherProTrialCard language="en" />);
    expect(observers.length).toBe(2);
    act(() => observers.forEach((o) => o.cb([{ isIntersecting: true, intersectionRatio: 1 }])));
    expect(impressions().length).toBe(2);
  });
});

describe('ResultsTeacherProTrialCard on the class-created screen', () => {
  beforeEach(() => {
    Object.assign(pro, { hasPro: false, loading: false, known: true, trialUsed: false });
    growth.trackGrowthEvent.mockClear();
    funnel.trackTeacherProUpgradeClick.mockClear();
    window.localStorage.clear();
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch;
  });

  it('offers the trial with its own title and placement, CTA to the /teacher/upgrade trial path', () => {
    render(<ResultsTeacherProTrialCard language="en" placement="class_created" />);
    const card = screen.getByTestId('results-teacher-pro-trial-card');
    expect(card).toHaveAttribute('data-placement', 'class_created');
    expect(card).toHaveTextContent('Try Teacher Pro free with your new class');
    expect(card).toHaveTextContent('Then $9/mo');
    const cta = screen.getByTestId('results-teacher-pro-trial-cta');
    expect(cta).toHaveTextContent('Start your 14-day Teacher Pro trial');
    expect(cta.getAttribute('href')).toBe('/en/teacher/upgrade?source=class_created');
    expect(screen.getByTestId('results-school-quote-link').getAttribute('href')).toBe('/en/education/for-schools?source=class_created');
  });

  it('fires the browser click events and the server twin on tap', () => {
    render(<ResultsTeacherProTrialCard language="sv" placement="class_created" />);
    fireEvent.click(screen.getByTestId('results-teacher-pro-trial-cta'));
    expect(funnel.trackTeacherProUpgradeClick).toHaveBeenCalledWith(expect.objectContaining({ locale: 'sv', placement: 'class_created' }));
    expect(growth.trackGrowthEvent).toHaveBeenCalledWith('landing_cta_clicked', { cta: 'teacher_pro_trial', source: 'class_created' });
    const clickCall = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find(([u]) => u === '/api/education/pro-cta-click');
    expect(clickCall).toBeDefined();
    const [, init] = clickCall!;
    expect(JSON.parse(init.body)).toEqual({ placement: 'class_created', locale: 'sv', cta: 'teacher_pro_trial' });
    expect(init.keepalive).toBe(true);
  });

  it('can be dismissed, and stays dismissed on the next visit', () => {
    const { unmount } = render(<ResultsTeacherProTrialCard language="he" placement="class_created" />);
    const dismiss = screen.getByTestId('teacher-pro-trial-dismiss');
    expect(dismiss).toHaveAttribute('aria-label', 'לא עכשיו');
    fireEvent.click(dismiss);
    expect(screen.queryByTestId('results-teacher-pro-trial-card')).toBeNull();
    unmount();
    render(<ResultsTeacherProTrialCard language="he" placement="class_created" />);
    expect(screen.queryByTestId('results-teacher-pro-trial-card')).toBeNull();
  });

  it('never shows to a Pro teacher', () => {
    pro.hasPro = true;
    render(<ResultsTeacherProTrialCard language="en" placement="class_created" />);
    expect(screen.queryByTestId('results-teacher-pro-trial-card')).toBeNull();
  });

  it('the results screen keeps no dismiss button', () => {
    render(<ResultsTeacherProTrialCard language="en" />);
    expect(screen.queryByTestId('teacher-pro-trial-dismiss')).toBeNull();
  });

  it('has a translated class-created title and dismiss for all 6 locales', async () => {
    const { classCreatedTrialCopy } = await import('@/lib/education/pro/trialCtaCopy');
    const titles = new Set<string>();
    for (const l of ['en', 'he', 'sv', 'ja', 'es', 'ru']) {
      const c = classCreatedTrialCopy(l);
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.dismiss.length).toBeGreaterThan(0);
      expect(c.trialCta).toContain('14');
      titles.add(c.title);
    }
    expect(titles.size).toBe(6);
  });
});

describe('ResultsTeacherProTrialCard server-side (cookie-independent) impressions', () => {
  type Cb = (entries: Array<{ isIntersecting: boolean; intersectionRatio: number }>) => void;
  let observers: Array<{ cb: Cb }> = [];
  const original = globalThis.IntersectionObserver;
  const posts = () =>
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
      .filter(([u]) => u === '/api/education/pro-offer-impression')
      .map(([, init]) => JSON.parse((init as RequestInit).body as string));

  beforeEach(() => {
    Object.assign(pro, { hasPro: false, loading: false, known: true, trialUsed: false, accessTrialExpires: null, accessTrialEnded: false });
    growth.trackGrowthEvent.mockClear();
    window.localStorage.clear();
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch;
    observers = [];
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
  });
  afterEach(() => {
    globalThis.IntersectionObserver = original;
  });

  it('reports rendered on mount and viewed once on screen, with source=class_created, even when browser analytics is off', () => {
    pro.accessTrialExpires = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    render(<ResultsTeacherProTrialCard language="sv" placement="class_created" />);
    expect(posts()).toEqual([
      { placement: 'class_created', locale: 'sv', cta: 'teacher_pro_trial', offer: 'keep_after_trial', stage: 'rendered' },
    ]);
    act(() => observers.forEach((o) => o.cb([{ isIntersecting: true, intersectionRatio: 1 }])));
    act(() => observers.forEach((o) => o.cb([{ isIntersecting: true, intersectionRatio: 1 }])));
    expect(posts()).toEqual([
      { placement: 'class_created', locale: 'sv', cta: 'teacher_pro_trial', offer: 'keep_after_trial', stage: 'rendered' },
      { placement: 'class_created', locale: 'sv', cta: 'teacher_pro_trial', offer: 'keep_after_trial', stage: 'viewed' },
    ]);
  });

  it('labels the offer: a fresh trial, or paid once the access trial ended', () => {
    const { unmount } = render(<ResultsTeacherProTrialCard language="en" placement="class_created" />);
    expect(posts()[0]).toMatchObject({ offer: 'trial', cta: 'teacher_pro_trial' });
    unmount();
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockClear();
    pro.accessTrialEnded = true;
    render(<ResultsTeacherProTrialCard language="he" />);
    expect(posts()[0]).toMatchObject({ placement: 'classroom_results', offer: 'paid', cta: 'teacher_pro', locale: 'he' });
  });

  it('reports nothing while loading, for a Pro teacher, or once dismissed', () => {
    pro.loading = true;
    const a = render(<ResultsTeacherProTrialCard language="en" placement="class_created" />);
    a.unmount();
    pro.loading = false;
    pro.hasPro = true;
    const b = render(<ResultsTeacherProTrialCard language="en" placement="class_created" />);
    b.unmount();
    pro.hasPro = false;
    window.localStorage.setItem('lexi:proTrialCardDismissed:class_created', String(Date.now()));
    render(<ResultsTeacherProTrialCard language="en" placement="class_created" />);
    expect(posts()).toEqual([]);
  });

  it('a teacher who never scrolls to the card is rendered, not viewed', () => {
    render(<ResultsTeacherProTrialCard language="ja" placement="class_created" />);
    act(() => observers.forEach((o) => o.cb([{ isIntersecting: false, intersectionRatio: 0 }])));
    expect(posts().map((p) => p.stage)).toEqual(['rendered']);
  });
});

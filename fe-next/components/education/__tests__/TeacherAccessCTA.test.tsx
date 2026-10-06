import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TeacherAccessCTA } from '../TeacherAccessCTA';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/lib/animation/useGsapReveal', () => ({
  useGsapReveal: () => ({ current: null }),
}));

const mockTrackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => mockTrackGrowthEvent(...args),
}));

type IOCallback = (entries: Array<{ isIntersecting: boolean; target: Element; intersectionRatio?: number }>) => void;
let observers: Array<{ cb: IOCallback; targets: Element[]; disconnected: boolean }> = [];

class FakeIO {
  private entry: { cb: IOCallback; targets: Element[]; disconnected: boolean };
  constructor(cb: IOCallback) {
    this.entry = { cb, targets: [], disconnected: false };
    observers.push(this.entry);
  }
  observe(el: Element) { this.entry.targets.push(el); }
  unobserve(el: Element) { this.entry.targets = this.entry.targets.filter((t) => t !== el); }
  disconnect() { this.entry.disconnected = true; this.entry.targets = []; }
}

function triggerIntersection(ratio: number, isIntersecting = true) {
  act(() => {
    for (const o of [...observers]) {
      if (o.disconnected) continue;
      for (const t of [...o.targets]) {
        o.cb([{ isIntersecting, intersectionRatio: ratio, target: t }]);
      }
    }
  });
}

describe('TeacherAccessCTA', () => {
  beforeEach(() => {
    mockTrackGrowthEvent.mockClear();
    observers = [];
    vi.stubGlobal('IntersectionObserver', FakeIO);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renders teacher access link', () => {
    render(<TeacherAccessCTA />);
    const link = screen.getByRole('link', { name: 'education.landing.cta.button' });
    expect(link).toHaveAttribute('href', '/en/education/access');
  });

  it('renders district pricing link pointing to for-schools', () => {
    render(<TeacherAccessCTA />);
    const link = screen.getByRole('link', { name: /education\.landing\.districtCta\.button/ });
    expect(link).toHaveAttribute('href', '/en/education/for-schools');
  });

  it('shows district CTA title text', () => {
    render(<TeacherAccessCTA />);
    expect(screen.getByText('education.landing.districtCta.title')).toBeTruthy();
  });

  it('does NOT track teacher CTA impression on mount before visibility', () => {
    render(<TeacherAccessCTA />);
    expect(mockTrackGrowthEvent).not.toHaveBeenCalledWith('education_upsell_impression', expect.anything());
  });

  it('does NOT track when intersection ratio is below 50%', () => {
    render(<TeacherAccessCTA />);
    triggerIntersection(0.3, true);
    expect(mockTrackGrowthEvent).not.toHaveBeenCalledWith('education_upsell_impression', expect.anything());
  });

  it('tracks teacher CTA impression once when >=50% visible', () => {
    render(<TeacherAccessCTA />);
    triggerIntersection(0.5, true);
    expect(mockTrackGrowthEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('education_upsell_impression', { cta: 'teacher_individual' });

    // Subsequent scroll / intersection does not fire again (fire ONCE)
    triggerIntersection(1.0, true);
    expect(mockTrackGrowthEvent).toHaveBeenCalledTimes(1);
  });

  it('tracks teacher link click', () => {
    render(<TeacherAccessCTA />);
    const link = screen.getByRole('link', { name: 'education.landing.cta.button' });
    fireEvent.click(link);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('landing_cta_clicked', { cta: 'teacher_individual' });
  });

  it('tracks district link click', () => {
    render(<TeacherAccessCTA />);
    const link = screen.getByRole('link', { name: /education\.landing\.districtCta\.button/ });
    fireEvent.click(link);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('landing_cta_clicked', { cta: 'district_upsell' });
  });
});

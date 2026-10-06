import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DistrictUpsellStrip } from '../DistrictUpsellStrip';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
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

describe('DistrictUpsellStrip', () => {
  beforeEach(() => {
    mockTrackGrowthEvent.mockClear();
    observers = [];
    vi.stubGlobal('IntersectionObserver', FakeIO);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renders title, body, and button', () => {
    render(<DistrictUpsellStrip />);
    expect(screen.getByText('education.landing.districtCta.title')).toBeInTheDocument();
    expect(screen.getByText('education.landing.districtCta.body')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'education.landing.districtCta.button' })).toBeInTheDocument();
  });

  it('district button routes to the qualified For Schools lead form (not a raw mailto)', () => {
    render(<DistrictUpsellStrip />);
    const link = screen.getByRole('link', { name: 'education.landing.districtCta.button' });
    const href = link.getAttribute('href') ?? '';
    expect(href).toContain('/education/for-schools');
    expect(href).not.toContain('mailto:');
  });

  it('calls trackGrowthEvent on button click', () => {
    render(<DistrictUpsellStrip />);
    const link = screen.getByRole('link', { name: 'education.landing.districtCta.button' });
    fireEvent.click(link);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('landing_cta_clicked', { cta: 'district_upsell' });
  });

  it('does NOT fire impressions on mount before visibility', () => {
    render(<DistrictUpsellStrip />);
    expect(mockTrackGrowthEvent).not.toHaveBeenCalledWith('education_upsell_impression', expect.anything());
  });

  it('does NOT fire when visibility is below 50%', () => {
    render(<DistrictUpsellStrip />);
    triggerIntersection(0.4, true);
    expect(mockTrackGrowthEvent).not.toHaveBeenCalledWith('education_upsell_impression', expect.anything());
  });

  it('tracks impressions once when >=50% visible', () => {
    render(<DistrictUpsellStrip />);
    triggerIntersection(0.5, true);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('education_upsell_impression', { cta: 'district_upsell' });
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('education_upsell_impression', { cta: 'teacher_individual' });
    expect(mockTrackGrowthEvent).toHaveBeenCalledTimes(2);

    // Subsequent scroll does not fire again (fire ONCE)
    triggerIntersection(1.0, true);
    expect(mockTrackGrowthEvent).toHaveBeenCalledTimes(2);
  });

  // Teacher individual lead-gen CTA
  it('renders teacher lead title, body, and button', () => {
    render(<DistrictUpsellStrip />);
    expect(screen.getByText('education.landing.teacherLeadCta.title')).toBeInTheDocument();
    expect(screen.getByText('education.landing.teacherLeadCta.body')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'education.landing.teacherLeadCta.button' })).toBeInTheDocument();
  });

  it('teacher button routes to the structured teacher access form (not a raw mailto)', () => {
    render(<DistrictUpsellStrip />);
    const link = screen.getByRole('link', { name: 'education.landing.teacherLeadCta.button' });
    const href = link.getAttribute('href') ?? '';
    expect(href).toContain('/education/access');
    expect(href).not.toContain('mailto:');
  });

  it('tracks teacher CTA click', () => {
    render(<DistrictUpsellStrip />);
    const link = screen.getByRole('link', { name: 'education.landing.teacherLeadCta.button' });
    fireEvent.click(link);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('landing_cta_clicked', { cta: 'teacher_individual' });
  });

  describe('hideTeacherCta prop', () => {
    it('hides teacher CTA when hideTeacherCta=true', () => {
      render(<DistrictUpsellStrip hideTeacherCta />);
      expect(screen.queryByText('education.landing.teacherLeadCta.title')).not.toBeInTheDocument();
    });

    it('still shows district CTA when hideTeacherCta=true', () => {
      render(<DistrictUpsellStrip hideTeacherCta />);
      expect(screen.getByText('education.landing.districtCta.title')).toBeInTheDocument();
    });

    it('does not fire teacher impression when hideTeacherCta=true upon >=50% visibility', () => {
      render(<DistrictUpsellStrip hideTeacherCta />);
      triggerIntersection(0.6, true);
      expect(mockTrackGrowthEvent).not.toHaveBeenCalledWith('education_upsell_impression', { cta: 'teacher_individual' });
      expect(mockTrackGrowthEvent).toHaveBeenCalledWith('education_upsell_impression', { cta: 'district_upsell' });
    });
  });
});

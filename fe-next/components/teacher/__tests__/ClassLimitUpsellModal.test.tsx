import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ClassLimitUpsellModal from '../ClassLimitUpsellModal';

const mockTrackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => mockTrackGrowthEvent(...args),
}));

const trackShown = vi.fn();
const trackClick = vi.fn();
vi.mock('@/lib/education/proFunnelTelemetry', () => ({
  trackTeacherPlanGateShown: (...args: unknown[]) => trackShown(...args),
  trackTeacherPlanGateUpgradeClick: (...args: unknown[]) => trackClick(...args),
}));

const goToPolarCheckout = vi.fn();
const postTeacherProCheckout = vi.fn();
vi.mock('@/lib/education/postTeacherProCheckout', () => ({
  postTeacherProCheckout: (...args: unknown[]) => postTeacherProCheckout(...args),
  goToPolarCheckout: (...args: unknown[]) => goToPolarCheckout(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      ({
        'teacher.subscription.classLimitTitle': 'Class limit reached',
        'teacher.subscription.classLimitMessage': `You have ${vars?.current}/${vars?.limit} classes`,
        'teacher.subscription.studentLimitTitle': 'Student limit reached',
        'teacher.subscription.studentLimitMessage': `You have ${vars?.current}/${vars?.limit} students`,
        'teacher.subscription.upgradeProDescription': 'Upgrade for more',
        'teacher.subscription.proFeatures': 'Pro features',
        'teacher.subscription.unlimitedClasses': 'Unlimited classes',
        'teacher.subscription.unlimitedStudents': 'Unlimited students',
        'teacher.subscription.priceUSD': 'Price',
        'teacher.subscription.perMonth': '/mo',
        'teacher.subscription.autoRenew': 'Auto-renews',
        'teacher.subscription.upgradeNow': 'Upgrade now',
        'common.cancel': 'Cancel',
        'common.close': 'Close',
        'common.loading': 'Loading',
        'education.landing.districtCta.title': 'Whole school or district?',
        'education.landing.districtCta.body': 'Talk to us about bulk pricing.',
        'education.landing.districtCta.button': 'See district pricing',
      })[key] || key,
    language: 'en',
  }),
}));

describe('ClassLimitUpsellModal', () => {
  beforeEach(() => {
    mockTrackGrowthEvent.mockClear();
    trackShown.mockClear();
    trackClick.mockClear();
    goToPolarCheckout.mockClear();
    postTeacherProCheckout.mockReset();
    postTeacherProCheckout.mockResolvedValue({ ok: true, url: 'https://polar.example/checkout' });
  });

  it('shows a district/school cross-sell link alongside the individual Pro upsell', () => {
    render(
      <ClassLimitUpsellModal isOpen={true} onClose={vi.fn()} currentCount={2} limit={2} />,
    );

    const districtLink = screen.getByRole('link', { name: 'See district pricing' });
    expect(districtLink).toHaveAttribute('href', '/en/education/for-schools');
  });

  it('tracks a district_upsell click distinguished from the individual Pro CTA', () => {
    render(
      <ClassLimitUpsellModal isOpen={true} onClose={vi.fn()} currentCount={2} limit={2} />,
    );

    fireEvent.click(screen.getByRole('link', { name: 'See district pricing' }));

    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('landing_cta_clicked', {
      cta: 'district_upsell',
      source: 'class_limit_modal',
    });
  });

  it('POSTs the same Polar checkout the trial countdown CTA uses', async () => {
    render(
      <ClassLimitUpsellModal isOpen={true} onClose={vi.fn()} currentCount={2} limit={2} />,
    );

    fireEvent.click(screen.getByTestId('plan-gate-upgrade'));

    await waitFor(() => {
      expect(postTeacherProCheckout).toHaveBeenCalledWith(fetch, { trial: false, locale: 'en' });
    });
    expect(goToPolarCheckout).toHaveBeenCalledWith('https://polar.example/checkout');
  });

  it('emits teacher_plan_gate_shown with surface and limit_type when the class wall opens', () => {
    mockTrackGrowthEvent.mockClear();
    const { rerender } = render(
      <ClassLimitUpsellModal isOpen={false} onClose={vi.fn()} currentCount={2} limit={2} />,
    );

    rerender(
      <ClassLimitUpsellModal isOpen={true} onClose={vi.fn()} currentCount={2} limit={2} />,
    );

    expect(trackShown).toHaveBeenCalledWith({
      surface: 'classroom_create',
      limit_type: 'classrooms',
    });
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('iap_viewed', {
      source: 'class_limit',
      currentCount: 2,
      limit: 2,
    });
  });

  it('emits teacher_plan_gate_upgrade_click then Polar checkout on the student wall CTA', async () => {
    render(
      <ClassLimitUpsellModal
        isOpen
        onClose={vi.fn()}
        currentCount={50}
        limit={50}
        reason="student_limit"
      />,
    );

    expect(screen.getByText('Student limit reached')).toBeInTheDocument();
    expect(trackShown).toHaveBeenCalledWith({
      surface: 'student_enroll',
      limit_type: 'students',
    });

    fireEvent.click(screen.getByTestId('plan-gate-upgrade'));

    await waitFor(() => {
      expect(trackClick).toHaveBeenCalledWith({
        surface: 'student_enroll',
        limit_type: 'students',
      });
    });
    expect(postTeacherProCheckout).toHaveBeenCalled();
  });

  it('shows a concrete sample of what Pro adds to every class, not just a bullet list', () => {
    render(<ClassLimitUpsellModal isOpen onClose={() => {}} currentCount={3} limit={3} />);
    expect(screen.getByTestId('pro-preview-analytics')).toBeInTheDocument();
    expect(screen.getAllByTestId('pro-preview-student-row').length).toBeGreaterThan(1);
  });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ClassLimitUpsellModal from '../ClassLimitUpsellModal';

vi.mock('next/image', () => ({
  default: ({ alt, src, ...props }: { alt?: string; src: string; [k: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt ?? ''} src={typeof src === 'string' ? src : ''} />
  ),
}));

const mockTrackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => mockTrackGrowthEvent(...args),
}));

const trackShown = vi.fn();
const trackClick = vi.fn();
const mockBeaconShown = vi.fn();
const mockBeaconClicked = vi.fn();
vi.mock('@/lib/education/proFunnelTelemetry', () => ({
  trackTeacherPlanGateShown: (...args: unknown[]) => trackShown(...args),
  trackTeacherPlanGateUpgradeClick: (...args: unknown[]) => trackClick(...args),
}));
vi.mock('@/lib/education/teacherProUpgradeBeacon', () => ({
  beaconTeacherProUpgradeShown: (...args: unknown[]) => mockBeaconShown(...args),
  beaconTeacherProUpgradeClicked: (...args: unknown[]) => mockBeaconClicked(...args),
}));

const goToPolarCheckout = vi.fn();
const postTeacherProCheckout = vi.fn();
vi.mock('@/lib/education/postTeacherProCheckout', async (importOriginal) => ({
  ...(await importOriginal<object>()),
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
        'teacher.subscription.upsellHeroAlt': 'A colorful cartoon classroom playing a word game',
        'teacher.subscription.featureOutcome1': 'Run every class you teach, no cap',
        'teacher.subscription.featureOutcome3': 'See who is stuck, word by word, live',
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
    mockBeaconShown.mockClear();
    mockBeaconClicked.mockClear();
    trackShown.mockClear();
    trackClick.mockClear();
    goToPolarCheckout.mockClear();
    postTeacherProCheckout.mockReset();
    postTeacherProCheckout.mockResolvedValue({ ok: true, url: 'https://polar.example/checkout' });
  });

  it('shows a pointer cursor on every clickable control', () => {
    render(
      <ClassLimitUpsellModal isOpen={true} onClose={vi.fn()} currentCount={2} limit={2} />,
    );

    const controls = [
      screen.getByRole('button', { name: 'Close' }),
      screen.getByTestId('plan-gate-upgrade'),
      screen.getByRole('button', { name: 'Cancel' }),
      screen.getByRole('link', { name: 'See district pricing' }),
    ];
    for (const el of controls) {
      expect(el.className).toContain('cursor-pointer');
    }
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
      expect(postTeacherProCheckout).toHaveBeenCalledWith(fetch, { trial: false, locale: 'en', placement: 'class_limit_modal' });
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
    expect(mockBeaconShown).toHaveBeenCalledWith(expect.objectContaining({
      placement: 'student_limit_modal',
      reason: 'free_tier_limit',
      count: 50,
      limit: 50,
    }));

    fireEvent.click(screen.getByTestId('plan-gate-upgrade'));

    await waitFor(() => {
      expect(trackClick).toHaveBeenCalledWith({
        surface: 'student_enroll',
        limit_type: 'students',
      });
      expect(mockBeaconClicked).toHaveBeenCalledWith(expect.objectContaining({
        placement: 'student_limit_modal',
        reason: 'free_tier_limit',
        count: 50,
        limit: 50,
      }));
    });
    expect(postTeacherProCheckout).toHaveBeenCalledWith(fetch, { trial: false, locale: 'en', placement: 'student_limit_modal' });
  });

  it('shows a concrete sample of what Pro adds to every class, not just a bullet list', () => {
    render(<ClassLimitUpsellModal isOpen onClose={() => {}} currentCount={3} limit={3} />);
    const hero = screen.getByRole('img', { name: 'A colorful cartoon classroom playing a word game' });
    expect(hero).toHaveAttribute('src', '/images/education/teacher-pro-upsell-hero.webp');
    expect(screen.getByText('Run every class you teach, no cap')).toBeInTheDocument();
    expect(screen.getByText('See who is stuck, word by word, live')).toBeInTheDocument();
  });

  it('renders the light Education sky theme, not the dark game chrome', () => {
    render(<ClassLimitUpsellModal isOpen onClose={() => {}} currentCount={3} limit={3} />);
    const dialog = screen.getByTestId('teacher-pro-upsell');
    expect(dialog).toHaveAttribute('data-edu-theme', 'sky');
    expect(dialog.className).toContain('bg-edu-surface');
    expect(dialog.className).toContain('text-edu-ink');
  });
});

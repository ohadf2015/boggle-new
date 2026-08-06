import { render, screen, fireEvent } from '@testing-library/react';
import ClassLimitUpsellModal from '../ClassLimitUpsellModal';

const mockTrackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => mockTrackGrowthEvent(...args),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      ({
        'teacher.subscription.classLimitTitle': 'Class limit reached',
        'teacher.subscription.classLimitMessage': `You have ${vars?.current}/${vars?.limit} classes`,
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
  });

  it('shows a district/school cross-sell link alongside the individual Pro upsell', () => {
    render(
      <ClassLimitUpsellModal isOpen={true} onClose={vi.fn()} currentCount={2} limit={2} />
    );

    const districtLink = screen.getByRole('link', { name: 'See district pricing' });
    expect(districtLink).toHaveAttribute('href', '/en/education/for-schools');
  });

  it('tracks a district_upsell click distinguished from the individual Pro CTA', () => {
    render(
      <ClassLimitUpsellModal isOpen={true} onClose={vi.fn()} currentCount={2} limit={2} />
    );

    fireEvent.click(screen.getByRole('link', { name: 'See district pricing' }));

    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('landing_cta_clicked', {
      cta: 'district_upsell',
      source: 'class_limit_modal',
    });
  });
});

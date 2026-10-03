import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${Object.values(p).join('|')}` : k),
    language: 'en',
  }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.PropsWithChildren<{ href: string }>) => <a href={href} {...props}>{children}</a>,
}));
const trackUpgrade = vi.fn();
vi.mock('@/lib/education/proFunnelTelemetry', () => ({ trackEduProUpgradeClicked: (...a: unknown[]) => trackUpgrade(...a) }));

import { UpgradePlanCards, type UpgradePlanCardsProps } from '../UpgradePlanCards';
import type { UpgradeViewer } from '@/lib/education/pro/upgradeViewer';

function setup(viewer: UpgradeViewer, extra: Partial<UpgradePlanCardsProps> = {}) {
  const props: UpgradePlanCardsProps = {
    viewer,
    freeFeatures: [{ label: 'free-a', included: true }, { label: 'free-x', included: false }],
    proFeatures: ['pro-a', 'pro-b'],
    showTrial: viewer === 'anon',
    pending: null,
    onTrial: vi.fn(),
    onBuy: vi.fn(),
    onSchool: vi.fn(),
    askSchool: <div data-testid="ask-slot" />,
    ...extra,
  };
  render(<UpgradePlanCards {...props} />);
  return props;
}

describe('UpgradePlanCards school price', () => {
  it('shows the indicative school price on the school card', () => {
    setup('free');
    const card = screen.getByTestId('plan-card-school');
    expect(card).toContainElement(screen.getByTestId('school-price'));
    expect(screen.getByTestId('school-price-amount')).toHaveTextContent('$49');
  });
});

describe('UpgradePlanCards', () => {
  it('never tells a logged-out visitor they are on a plan; offers Start free instead', () => {
    setup('anon');
    expect(screen.queryByTestId('pricing-free-current')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'eg2Pro.plans.startFree' })).toHaveAttribute('href', '/en/education/access');
  });

  it.each(['anon', 'free', 'pro', 'loading'] as UpgradeViewer[])('gives the Free card a price note for %s, like the Pro card has', (viewer) => {
    setup(viewer);
    expect(screen.getByTestId('plan-free-note')).toHaveTextContent('eg2Polish.plans.freeNote');
  });

  it('fills the Free card action slot for a Pro teacher instead of leaving it blank', () => {
    setup('pro');
    expect(screen.getByTestId('plan-free-included')).toHaveTextContent('eg2Polish.plans.freeIncluded');
  });

  it('marks Free as current only for a signed-in free teacher', () => {
    setup('free');
    expect(screen.getByTestId('pricing-free-current')).toBeDisabled();
  });

  it.each(['loading', 'unknown'] as UpgradeViewer[])('claims no current plan while %s', (viewer) => {
    setup(viewer);
    expect(screen.queryByTestId('pricing-free-current')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pricing-pro-current')).not.toBeInTheDocument();
  });

  it('shows the trial first when it is on offer, and still lets them buy outright', () => {
    const props = setup('anon');
    fireEvent.click(screen.getByTestId('pricing-trial-cta'));
    expect(props.onTrial).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('pricing-paid-cta'));
    expect(props.onBuy).toHaveBeenCalled();
  });

  it('hides the trial when it is not on offer', () => {
    setup('free', { showTrial: false });
    expect(screen.queryByTestId('pricing-trial-cta')).not.toBeInTheDocument();
    expect(screen.getByTestId('pricing-paid-cta')).toBeInTheDocument();
  });

  it('puts the buy button above the feature list, so it is in the first screen', () => {
    setup('free', { showTrial: false });
    const card = screen.getByTestId('plan-card-pro');
    const html = card.innerHTML;
    expect(html.indexOf('pricing-paid-cta')).toBeLessThan(html.indexOf('pro-a'));
  });

  it('shows a Pro teacher their plan and no buy button', () => {
    setup('pro', { showTrial: false });
    expect(screen.getByTestId('pricing-pro-current')).toBeInTheDocument();
    expect(screen.queryByTestId('pricing-paid-cta')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ask-slot')).not.toBeInTheDocument();
  });

  it('isolates the price as left-to-right so RTL cannot scramble "$9 /month"', () => {
    setup('free');
    const price = screen.getByTestId('plan-pro-price');
    expect(price.getAttribute('dir')).toBe('ltr');
    expect(price.tagName.toLowerCase()).toBe('bdi');
  });

  it('routes the school card to the quote tab', () => {
    const props = setup('anon');
    fireEvent.click(screen.getByTestId('plan-school-cta'));
    expect(props.onSchool).toHaveBeenCalled();
  });

  it('tracks the buy tap with its source, and a throwing tracker never blocks checkout', () => {
    trackUpgrade.mockImplementationOnce(() => { throw new Error('analytics down'); });
    const props = setup('free', { showTrial: false });
    fireEvent.click(screen.getByTestId('pricing-paid-cta'));
    expect(trackUpgrade).toHaveBeenCalledWith({ source: 'pricing_page' });
    expect(props.onBuy).toHaveBeenCalledTimes(1);
  });
});

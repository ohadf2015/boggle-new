/**
 * `edu_pro_upgrade_clicked` — the pricing page's one money button. The click
 * is the only funnel step the server cannot see, and it used to fire nothing.
 * Analytics only: the checkout handler must still run even if tracking throws.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
const trackEduProUpgradeClicked = vi.fn();
vi.mock('@/lib/education/proFunnelTelemetry', () => ({
  trackEduProUpgradeClicked: (...a: unknown[]) => trackEduProUpgradeClicked(...a),
}));

import { PricingCards } from '../PricingCards';

const renderCards = (onUpgradeClick = vi.fn(), isLoading = false) => {
  render(
    <PricingCards
      freeFeatures={[{ label: 'free', included: true }]}
      proFeatures={['pro']}
      isLoading={isLoading}
      onUpgradeClick={onUpgradeClick}
    />
  );
  return onUpgradeClick;
};

describe('<PricingCards> upgrade telemetry', () => {
  beforeEach(() => trackEduProUpgradeClicked.mockReset());

  it('Given the Upgrade button, When tapped, Then it tracks the click with its source and starts checkout', () => {
    const onUpgradeClick = renderCards();
    fireEvent.click(screen.getByRole('button', { name: 'teacher.subscription.upgradeNow' }));
    expect(trackEduProUpgradeClicked).toHaveBeenCalledWith({ source: 'pricing_page' });
    expect(onUpgradeClick).toHaveBeenCalledTimes(1);
  });

  it('Given tracking throws, When tapped, Then checkout still starts', () => {
    trackEduProUpgradeClicked.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const onUpgradeClick = renderCards();
    fireEvent.click(screen.getByRole('button', { name: 'teacher.subscription.upgradeNow' }));
    expect(onUpgradeClick).toHaveBeenCalledTimes(1);
  });
});

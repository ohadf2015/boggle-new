/**
 * P2 t_32179c7e: the Free card used to always render "You're on this plan",
 * even for a trialing/paying Pro teacher. Current-plan state must follow
 * `currentTier`, never the card that happens to be on the left.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/lib/education/proFunnelTelemetry', () => ({
  trackEduProUpgradeClicked: vi.fn(),
}));

import { PricingCards } from '../PricingCards';

const baseProps = {
  freeFeatures: [{ label: 'free', included: true }],
  proFeatures: ['pro'],
  isLoading: false,
  onUpgradeClick: vi.fn(),
};

describe('<PricingCards> current-tier state', () => {
  it('Given a free teacher, When the cards render, Then only the Free card claims the current plan and Pro still sells', () => {
    render(<PricingCards {...baseProps} currentTier="free" />);
    const current = screen.getAllByRole('button', { name: 'teacher.subscription.currentPlan' });
    expect(current).toHaveLength(1);
    expect(current[0]).toBeDisabled();
    expect(screen.getByTestId('pricing-free-current')).toBe(current[0]);
    expect(screen.queryByTestId('pricing-pro-current')).toBeNull();
    expect(screen.getByTestId('pricing-paid-cta')).toHaveTextContent(
      'teacher.subscription.upgradeNow',
    );
  });

  it('Given a Pro (trialing or paying) teacher, When the cards render, Then only the Pro card claims the current plan and the paid CTA is gone', () => {
    render(<PricingCards {...baseProps} currentTier="pro" />);
    const current = screen.getAllByRole('button', { name: 'teacher.subscription.currentPlan' });
    expect(current).toHaveLength(1);
    expect(current[0]).toBeDisabled();
    expect(screen.getByTestId('pricing-pro-current')).toBe(current[0]);
    expect(screen.queryByTestId('pricing-free-current')).toBeNull();
    expect(screen.queryByTestId('pricing-paid-cta')).toBeNull();
  });
});

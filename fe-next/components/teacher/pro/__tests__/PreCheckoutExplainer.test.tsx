/**
 * The pre-checkout explainer is the last in-app screen before Polar: it must
 * state the price after the trial, that cancellation is free, and hand off to
 * the checkout POST only via its confirm button.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${Object.values(p).join('|')}` : k),
    language: 'en',
  }),
}));

import { PreCheckoutExplainer } from '../PreCheckoutExplainer';

function setup(mode: 'trial' | 'paid' = 'trial', pending = false) {
  const props = { mode, pending, onConfirm: vi.fn(), onBack: vi.fn() };
  render(<PreCheckoutExplainer {...props} />);
  return props;
}

describe('PreCheckoutExplainer', () => {
  it('trial mode states the free window, the price after, and cancel-anytime', () => {
    setup('trial');
    expect(screen.getByTestId('pre-checkout-price-line')).toHaveTextContent('eg2Pro.plans.trialNote|14|$9');
    expect(screen.getByText('teacher.subscription.trustCancel')).toBeInTheDocument();
    expect(screen.getByText('eg2Pro.preCheckout.secure')).toBeInTheDocument();
  });

  it('paid mode states the price starting today, with no trial wording', () => {
    setup('paid');
    expect(screen.getByTestId('pre-checkout-price-line')).toHaveTextContent('eg2Pro.preCheckout.paidLine|$9');
    expect(screen.queryByText(/trialNote/)).not.toBeInTheDocument();
  });

  it('lists what Pro includes', () => {
    setup('trial');
    expect(screen.getByText('teacher.subscription.unlimitedClasses')).toBeInTheDocument();
    expect(screen.getByText('education.landing.pro.analytics')).toBeInTheDocument();
    expect(screen.queryByText('teacher.subscription.unlimitedStudents')).toBeNull();
    expect(screen.queryByText('education.landing.pro.noAds')).toBeNull();
  });

  it('confirm starts the checkout; back leaves without touching the till', () => {
    const props = setup('trial');
    fireEvent.click(screen.getByTestId('pre-checkout-confirm'));
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    expect(props.onBack).not.toHaveBeenCalled();

    props.onConfirm.mockClear();
    fireEvent.click(screen.getByTestId('pre-checkout-back'));
    expect(props.onBack).toHaveBeenCalledTimes(1);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('locks both buttons while the checkout POST is in flight', () => {
    setup('trial', true);
    expect(screen.getByTestId('pre-checkout-confirm')).toBeDisabled();
    expect(screen.getByTestId('pre-checkout-back')).toBeDisabled();
  });
});

describe('PreCheckoutExplainer over the upgrade page', () => {
  it('given a phone, when it opens, then it is a centered card over a see-through scrim, not a bottom sheet under a black half-screen', () => {
    setup('trial');
    const layer = screen.getByTestId('pre-checkout-explainer');
    expect(layer.className).not.toMatch(/bg-neo-black\/85/);
    expect(layer.className).toMatch(/(^|\s)bg-neo-navy\/60(\s|$)/);
    expect(layer.className).toMatch(/(^|\s)items-center(\s|$)/);
    expect(layer.className).not.toMatch(/(^|\s)items-end(\s|$)/);
    expect(layer.firstElementChild?.className).toMatch(/(^|\s)rounded-neo-xl(\s|$)/);
  });
});

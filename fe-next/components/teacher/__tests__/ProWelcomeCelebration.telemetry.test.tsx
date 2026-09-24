/**
 * The teacher landing back from Polar is the last client-side funnel step
 * (`edu_pro_checkout_success_seen`). Only for a PAID return — a complimentary
 * grant is a gift, not a conversion — and once per return (the tracker dedupes
 * reloads that keep `?checkout=success`).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
const trackEduProCheckoutSuccessSeen = vi.fn();
vi.mock('@/lib/education/proFunnelTelemetry', () => ({
  trackEduProCheckoutSuccessSeen: (...a: unknown[]) => trackEduProCheckoutSuccessSeen(...a),
}));

import { ProWelcomeCelebration } from '../ProWelcomeCelebration';

const GRANT = { expires_at: '2027-01-01T00:00:00Z', welcomed: false } as never;

describe('<ProWelcomeCelebration> success telemetry', () => {
  beforeEach(() => {
    trackEduProCheckoutSuccessSeen.mockReset();
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
  });

  it('Given a paid return, When it mounts, Then the success step is tracked once', () => {
    const { rerender } = render(<ProWelcomeCelebration grant={null} paid />);
    rerender(<ProWelcomeCelebration grant={null} paid />);
    expect(trackEduProCheckoutSuccessSeen).toHaveBeenCalledTimes(1);
  });

  it('Given a comp grant only, When it mounts, Then no conversion is tracked', () => {
    render(<ProWelcomeCelebration grant={GRANT} />);
    expect(trackEduProCheckoutSuccessSeen).not.toHaveBeenCalled();
  });

  it('Given a grant opened first and paid flips later, When paid arrives, Then it is still tracked', () => {
    const { rerender } = render(<ProWelcomeCelebration grant={GRANT} paid={false} />);
    rerender(<ProWelcomeCelebration grant={GRANT} paid />);
    expect(trackEduProCheckoutSuccessSeen).toHaveBeenCalledTimes(1);
  });

  it('Given tracking throws, When it mounts, Then the celebration still renders', () => {
    trackEduProCheckoutSuccessSeen.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const { getByRole } = render(<ProWelcomeCelebration grant={null} paid />);
    expect(getByRole('dialog')).toBeTruthy();
  });
});

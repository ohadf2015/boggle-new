import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProPlanPanel } from '../ProPlanPanel';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, string | number>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    language: 'en',
  }),
}));

const trial = {
  status: 'trialing',
  source: 'polar',
  trialExpires: '2026-12-06T19:21:51.009Z',
  periodEnd: '2026-12-06T19:21:51.009Z',
  portalUrl: 'https://polar.sh/lexiclash/portal?customer_session_token=x',
  included: [],
};

describe('ProPlanPanel after a cancel', () => {
  it('says Pro stays on until the end date, not "then $9 unless you cancel", and offers Keep Pro', () => {
    render(<ProPlanPanel {...trial} cancelAtPeriodEnd onResumed={vi.fn()} />);
    expect(screen.getByTestId('pro-plan-status')).toHaveTextContent('eduPlans.manage.ends:December 6, 2026');
    expect(screen.getByTestId('teacher-pro-resume-cta')).toBeInTheDocument();
  });

  it('a running trial that was not cancelled keeps the renew line and no Keep Pro button', () => {
    render(<ProPlanPanel {...trial} onResumed={vi.fn()} />);
    expect(screen.getByTestId('pro-plan-status')).toHaveTextContent('eduPlans.manage.trialing');
    expect(screen.queryByTestId('teacher-pro-resume-cta')).toBeNull();
  });
});

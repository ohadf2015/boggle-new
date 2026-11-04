import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { TeacherProState } from '@/hooks/useTeacherPro';

const DAY = 24 * 60 * 60 * 1000;
const future = new Date(Date.now() + 5 * DAY).toISOString();
const past = new Date(Date.now() - 2 * DAY).toISOString();

type ProShape = Omit<TeacherProState, 'refresh'>;
const BASE: ProShape = {
  hasPro: false, loading: false, source: 'polar', status: 'active', periodEnd: null, trialExpires: null,
  accessTrialExpires: null, accessTrialEnded: false, trialUsed: false, known: true, grant: null,
  grantExpired: false, portalUrl: null, pendingCheckout: false,
};

const TIERS: Record<string, ProShape> = {
  free: BASE,
  trial: { ...BASE, accessTrialExpires: future },
  'polar trial': { ...BASE, hasPro: true, status: 'trialing', trialExpires: future, trialUsed: true },
  'trial expired': { ...BASE, accessTrialExpires: past, accessTrialEnded: true },
  paid: { ...BASE, hasPro: true, periodEnd: future },
  'admin grant': {
    ...BASE, hasPro: true, source: 'admin_grant', periodEnd: future,
    grant: { id: 'g1', expires_at: future, days: 30, note: null, welcomed: true },
  },
};

let pro: ProShape = BASE;
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ ...pro, refresh: vi.fn() }) }));
vi.mock('@/hooks/useTeacherTrialRecap', () => ({ useTeacherTrialRecap: () => null }));
vi.mock('@/hooks/useCheckoutBlockedInApp', () => ({ useCheckoutBlockedInApp: () => false }));
const startCheckout = vi.fn();
vi.mock('@/hooks/useTeacherProCheckout', () => ({ useTeacherProCheckout: () => ({ pending: false, start: startCheckout }) }));
vi.mock('@/hooks/useStartTeacherProTrial', () => ({ useStartTeacherProTrial: () => ({ pending: false, start: vi.fn() }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/lib/education/proFunnelTelemetry', () => ({
  trackProGateViewed: vi.fn(),
  trackProUpgradeClicked: vi.fn(),
  trackProTrialPreviewViewed: vi.fn(),
  trackProTrialPreviewUpgradeClicked: vi.fn(),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'he' }),
}));

import { ProGate, PRO_FEATURES } from '../ProGate';
import { CHECKOUT_ORIGIN_KEY } from '@/lib/education/checkoutReturn';

const LOCKED = ['free', 'trial expired'];
const OPEN_WITH_STRIP = ['trial'];
const OPEN = ['polar trial', 'paid', 'admin grant'];

const cases = PRO_FEATURES.flatMap((feature) => Object.keys(TIERS).map((tier) => [feature, tier] as const));

describe('ProGate: every enforced feature, every teacher tier', () => {
  beforeEach(() => {
    sessionStorage.clear();
    startCheckout.mockReset();
  });

  it.each(cases)('%s for a %s teacher', (feature, tier) => {
    pro = TIERS[tier];
    render(<ProGate feature={feature}><div>the real feature</div></ProGate>);

    if (LOCKED.includes(tier)) {
      expect(screen.queryByText('the real feature')).not.toBeInTheDocument();
      expect(screen.getByTestId(`pro-preview-${feature}`)).toBeInTheDocument();
      expect(screen.getAllByRole('button')).toHaveLength(1);
      expect(screen.queryAllByRole('link')).toHaveLength(0);
      expect(screen.getByTestId('pro-gate-honest-line')).toHaveTextContent(
        tier === 'trial expired' ? 'teacher.proGate.trialEnded' : 'teacher.proGate.freeKeeps',
      );
    } else if (OPEN_WITH_STRIP.includes(tier)) {
      expect(screen.getByText('the real feature')).toBeInTheDocument();
      expect(screen.getByTestId('pro-trial-preview')).toBeInTheDocument();
      expect(screen.queryByTestId('pro-gate-lock')).not.toBeInTheDocument();
      expect(screen.getAllByRole('button')).toHaveLength(1);
    } else {
      expect(OPEN).toContain(tier);
      expect(screen.getByText('the real feature')).toBeInTheDocument();
      expect(screen.queryByTestId('pro-gate-lock')).not.toBeInTheDocument();
      expect(screen.queryByTestId('pro-trial-preview')).not.toBeInTheDocument();
      expect(screen.queryAllByRole('button')).toHaveLength(0);
    }
  });

  it.each(['free', 'trial'])('a %s teacher who upgrades from a report is remembered on that report', (tier) => {
    pro = TIERS[tier];
    window.history.pushState({}, '', '/he/teacher/reports?classroomId=c-1');
    render(<ProGate feature="reports"><div>the real feature</div></ProGate>);
    fireEvent.click(screen.getByRole('button'));
    expect(startCheckout).toHaveBeenCalledTimes(1);
    expect(JSON.parse(sessionStorage.getItem(CHECKOUT_ORIGIN_KEY) ?? '{}').path).toBe('/he/teacher/reports?classroomId=c-1');
  });
});

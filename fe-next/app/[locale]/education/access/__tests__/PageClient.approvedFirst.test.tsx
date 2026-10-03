import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock contexts
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

// Mock the heavy form component
vi.mock('@/components/education/AccessRequestGate', () => ({
  AccessRequestGate: () => <div data-testid="access-request-gate">Gate</div>,
}));

vi.mock('@/components/education/DistrictUpsellStrip', () => ({
  DistrictUpsellStrip: () => <div data-testid="district-upsell">Upsell</div>,
}));

vi.mock('@/components/education/TrialUrgencyBanner', () => ({
  TrialUrgencyBanner: () => <div data-testid="trial-urgency">Trial</div>,
}));

// The approved card shows the trial banner only when the Pro entitlement has
// RESOLVED to free — a loading entitlement hides it. Mock the hook resolved so
// the state machine tests don't depend on the real fetch timing out.
const mockProState = { hasPro: false, loading: false, source: 'polar', periodEnd: null, grant: null, grantExpired: false, refresh: async () => {} };
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => mockProState,
}));

// Mock GSAP — jsdom can't render animations, so the effect runs but has no visual effect
vi.mock('gsap', () => ({
  gsap: {
    timeline: () => ({ set: vi.fn(), to: vi.fn(), fromTo: vi.fn(), kill: vi.fn() }),
    set: vi.fn(),
    fromTo: vi.fn(),
  },
}));

// Mock the useGsapReveal hook
vi.mock('@/lib/animation/useGsapReveal', () => ({
  useGsapReveal: () => ({ current: null }),
}));

// Mock accessibility check
vi.mock('@/utils/accessibility', () => ({
  isReducedMotionPreferred: () => false,
}));

let mockTeacherAccessState: any = {
  hasAccess: false,
  status: 'none',
  latestRequest: null,
  trial: null,
  isLoading: false,
};

vi.mock('@/lib/education/useTeacherAccess', () => ({
  useTeacherAccess: () => mockTeacherAccessState,
}));

import { PageClient } from '../PageClient';

describe('<PageClient> — a returning teacher with access is one tap from HQ', () => {
  beforeEach(() => {
    mockTeacherAccessState = { hasAccess: true, status: 'approved', latestRequest: null, trial: null, isLoading: false };
  });

  it('Given access, Then the HQ link is the first link on the page and the apply pitch is gone', () => {
    render(<PageClient />);
    const main = screen.getByRole('main');
    const firstLink = main.querySelector('a');
    expect(firstLink).toHaveTextContent('education.access.go_to_teacher');
    expect(firstLink).toHaveAttribute('href', '/en/teacher');
    expect(screen.queryByText('education.access.h1')).toBeNull();
    expect(screen.queryByText('education.access.next.step1_title')).toBeNull();
    expect(screen.queryByTestId('district-upsell')).toBeNull();
  });

  it('Given access, Then the approved title is the page heading', () => {
    render(<PageClient />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('education.access.already_approved_title');
  });
});

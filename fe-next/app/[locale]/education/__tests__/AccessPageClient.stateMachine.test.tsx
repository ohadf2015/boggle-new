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

import { PageClient } from '../access/PageClient';

describe('<PageClient> (access page state machine)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeacherAccessState = {
      hasAccess: false,
      status: 'none',
      latestRequest: null,
      trial: null,
      isLoading: false,
    };
  });

  it('renders a loading skeleton while isLoading is true', () => {
    mockTeacherAccessState.isLoading = true;
    render(<PageClient />);
    // The skeleton is an aria-hidden pulse block
    const skeleton = document.querySelector('[aria-hidden="true"]');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('animate-pulse');
    // The form should not render while loading
    expect(screen.queryByTestId('access-request-gate')).not.toBeInTheDocument();
  });

  it('renders the approved card when hasAccess is true', () => {
    mockTeacherAccessState.hasAccess = true;
    mockTeacherAccessState.status = 'approved';
    render(<PageClient />);
    expect(screen.getByText('education.access.already_approved_title')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'education.access.go_to_teacher' })).toBeInTheDocument();
    // Should NOT render the form
    expect(screen.queryByTestId('access-request-gate')).not.toBeInTheDocument();
  });

  it('renders the approved affordance when status is approved but hasAccess is not yet true', () => {
    // This is the race condition: the request resolved, status is approved, but the
    // profile hasn't resolved yet so hasAccess is false. Should show the approved
    // card, not the form.
    mockTeacherAccessState.hasAccess = false;
    mockTeacherAccessState.status = 'approved';
    mockTeacherAccessState.isLoading = false;
    render(<PageClient />);
    expect(screen.getByText('education.access.already_approved_title')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'education.access.go_to_teacher' })).toBeInTheDocument();
    // Should NOT render the form
    expect(screen.queryByTestId('access-request-gate')).not.toBeInTheDocument();
  });

  it('renders the pending card when status is pending and hasAccess is false', () => {
    mockTeacherAccessState.hasAccess = false;
    mockTeacherAccessState.status = 'pending';
    render(<PageClient />);
    expect(screen.getByText('education.access.pending_title')).toBeInTheDocument();
    // Should NOT render the form
    expect(screen.queryByTestId('access-request-gate')).not.toBeInTheDocument();
  });

  it('renders the declined card when status is declined and hasAccess is false', () => {
    mockTeacherAccessState.hasAccess = false;
    mockTeacherAccessState.status = 'declined';
    render(<PageClient />);
    expect(screen.getByText('education.access.declined_title')).toBeInTheDocument();
    // Should NOT render the form
    expect(screen.queryByTestId('access-request-gate')).not.toBeInTheDocument();
  });

  it('renders the form only when status is none and hasAccess is false and isLoading is false', () => {
    mockTeacherAccessState.hasAccess = false;
    mockTeacherAccessState.status = 'none';
    mockTeacherAccessState.isLoading = false;
    render(<PageClient />);
    expect(screen.getByTestId('access-request-gate')).toBeInTheDocument();
  });

  it('does NOT render the form when status is unknown but loading (until status resolves)', () => {
    mockTeacherAccessState.hasAccess = false;
    mockTeacherAccessState.status = 'none';
    mockTeacherAccessState.isLoading = true;
    render(<PageClient />);
    // Should show skeleton, not form
    const skeleton = document.querySelector('[aria-hidden="true"]');
    expect(skeleton).toBeInTheDocument();
    expect(screen.queryByTestId('access-request-gate')).not.toBeInTheDocument();
  });

  it('shows the approved card with trial banner when hasAccess and trial info present', () => {
    mockTeacherAccessState.hasAccess = true;
    mockTeacherAccessState.status = 'approved';
    mockTeacherAccessState.trial = { daysRemaining: 7, endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() };
    render(<PageClient />);
    expect(screen.getByText('education.access.already_approved_title')).toBeInTheDocument();
    expect(screen.getByTestId('trial-urgency')).toBeInTheDocument();
  });

  describe('issue 2: unrecognized status values do not render blank page', () => {
    it('renders a fallback card for unknown/malformed status instead of blank page', () => {
      mockTeacherAccessState.hasAccess = false;
      mockTeacherAccessState.status = 'unknown_future_status' as any;
      mockTeacherAccessState.isLoading = false;
      render(<PageClient />);
      // Should NOT render the form
      expect(screen.queryByTestId('access-request-gate')).not.toBeInTheDocument();
      // Should NOT be blank — should render a fallback card with helpful text
      const main = screen.getByRole('main');
      expect(main.textContent).not.toBe('');
      // Should have a link to the teacher dashboard as a fallback affordance
      const links = screen.getAllByRole('link');
      expect(links.some((l) => l.getAttribute('href')?.includes('/teacher'))).toBe(true);
    });
  });

  describe('issue 3: loading skeleton should not drop page content (jank regression)', () => {
    it('renders step cards while loading (no early return that drops content)', () => {
      mockTeacherAccessState.isLoading = true;
      render(<PageClient />);
      // Should have the skeleton in the status-card slot
      const skeleton = document.querySelector('[aria-hidden="true"]');
      expect(skeleton).toBeInTheDocument();
      // CRITICAL: step cards should STILL be rendered, not dropped by early return
      expect(screen.getByText('education.access.next.step1_title')).toBeInTheDocument();
      expect(screen.getByText('education.access.next.step2_title')).toBeInTheDocument();
      expect(screen.getByText('education.access.next.step3_title')).toBeInTheDocument();
      // Try-a-game block should also be present
      expect(screen.getByText('education.access.regular_game_title')).toBeInTheDocument();
    });

    it('tightened: loading state has skeleton AND form is absent AND steps present', () => {
      // Existing test passes but doesn't check for step presence — tighten it
      mockTeacherAccessState.isLoading = true;
      render(<PageClient />);
      const skeleton = document.querySelector('[aria-hidden="true"]');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('animate-pulse');
      expect(screen.queryByTestId('access-request-gate')).not.toBeInTheDocument();
      // NEW assertion: steps are visible during loading
      expect(screen.getByText('education.access.next.step1_title')).toBeInTheDocument();
    });
  });
});

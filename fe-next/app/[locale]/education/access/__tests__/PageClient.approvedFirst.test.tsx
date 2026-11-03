import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock contexts
vi.mock('@/components/education/landing/LandingHeader', () => ({
  LandingHeader: () => <header data-testid="landing-header" />,
}));
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

const classes = vi.hoisted(() => ({ value: { classrooms: [] as unknown[], isLoading: false, error: null as string | null } }));
vi.mock('@/hooks/useClassroom', () => ({ useClassrooms: () => classes.value }));

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

describe('<PageClient> — an approved teacher is one tap from the right next step', () => {
  beforeEach(() => {
    mockTeacherAccessState = { hasAccess: true, status: 'approved', latestRequest: null, trial: null, isLoading: false };
    classes.value = { classrooms: [], isLoading: false, error: null };
  });

  it('Given no class yet, Then "Start your first class" is the first link and the dashboard comes second', () => {
    render(<PageClient />);
    const links = Array.from(screen.getByRole('main').querySelectorAll('a'));
    expect(links[0]).toHaveTextContent('education.trial.cta');
    expect(links[0]).toHaveAttribute('href', '/en/teacher/classroom/new');
    expect(links[1]).toHaveTextContent('education.access.go_to_teacher');
    expect(links[1]).toHaveAttribute('href', '/en/teacher');
    expect(screen.queryByText('education.access.h1')).toBeNull();
    expect(screen.queryByText('education.access.next.step1_title')).toBeNull();
    expect(screen.queryByTestId('district-upsell')).toBeNull();
  });

  it('Given a class already exists, Then the dashboard is the only action', () => {
    classes.value = { classrooms: [{ id: 'c1' }], isLoading: false, error: null };
    render(<PageClient />);
    const links = Array.from(screen.getByRole('main').querySelectorAll('a'));
    expect(links[0]).toHaveTextContent('education.access.go_to_teacher');
    expect(screen.queryByText('education.trial.cta')).toBeNull();
  });

  it('Given the class list is still loading, Then no action is offered that could flip a moment later', () => {
    classes.value = { classrooms: [], isLoading: true, error: null };
    render(<PageClient />);
    expect(screen.getByRole('main').querySelectorAll('a')).toHaveLength(0);
    expect(screen.getByTestId('approved-actions-loading')).toBeInTheDocument();
  });

  it('Given the class list failed to load, Then only the dashboard is offered, never "first class"', () => {
    classes.value = { classrooms: [], isLoading: false, error: 'Failed to load classrooms' };
    render(<PageClient />);
    const links = Array.from(screen.getByRole('main').querySelectorAll('a'));
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent('education.access.go_to_teacher');
  });

  it('Given access, Then the approved title is the page heading', () => {
    render(<PageClient />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('education.access.already_approved_title');
  });
});

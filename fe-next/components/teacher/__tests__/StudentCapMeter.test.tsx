import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StudentCapMeter, shouldShowStudentCapUpgradeCta } from '../StudentCapMeter';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import { TEACHER_PRO_MILESTONE_MIN_STUDENTS } from '@/lib/education/teacherProMilestone';
import { trackGrowthEvent } from '@/utils/growthTracking';

const mockUseTeacherPro = vi.fn();
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => mockUseTeacherPro() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, a?: unknown, b?: unknown) => {
      const params = (typeof a === 'object' && a !== null ? a : b) as Record<string, unknown> | undefined;
      return params ? `${k}:${Object.values(params).join(',')}` : k;
    },
    language: 'en',
  }),
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
const mockTrackGrowthEvent = vi.mocked(trackGrowthEvent);
vi.mock('@/components/teacher/ClassLimitUpsellModal', () => ({
  default: ({ isOpen, reason }: { isOpen: boolean; reason?: string }) =>
    isOpen ? <div data-testid="plan-gate-sheet" data-reason={reason ?? ''} /> : null,
}));
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe('shouldShowStudentCapUpgradeCta', () => {
  it('is false for a Pro teacher even at the cap', () => {
    expect(shouldShowStudentCapUpgradeCta(FREE_TIER_LIMITS.studentsPerClass, true)).toBe(false);
  });

  it('is false below the engagement milestone', () => {
    expect(shouldShowStudentCapUpgradeCta(TEACHER_PRO_MILESTONE_MIN_STUDENTS - 1, false)).toBe(false);
  });

  it('is true at the 3-student milestone', () => {
    expect(shouldShowStudentCapUpgradeCta(TEACHER_PRO_MILESTONE_MIN_STUDENTS, false)).toBe(true);
  });

  it('is true at the free-tier student cap', () => {
    expect(shouldShowStudentCapUpgradeCta(FREE_TIER_LIMITS.studentsPerClass, false)).toBe(true);
  });
});

describe('StudentCapMeter', () => {
  beforeEach(() => {
    mockTrackGrowthEvent.mockClear();
    mockUseTeacherPro.mockReturnValue({
      hasPro: false,
      loading: false,
      source: 'polar',
      periodEnd: null,
      grant: null,
      grantExpired: false,
      refresh: vi.fn(),
    });
  });

  it('shows count over the free-tier limit', () => {
    render(<StudentCapMeter studentCount={2} />);
    const count = screen.getByTestId('student-cap-count');
    expect(count.textContent).toContain('2');
    expect(count.textContent).toContain(String(FREE_TIER_LIMITS.studentsPerClass));
    expect(screen.queryByTestId('student-cap-upgrade-cta')).toBeNull();
  });

  it('shows the Polar upgrade CTA at 3+ students', () => {
    render(<StudentCapMeter studentCount={3} />);
    const cta = screen.getByTestId('student-cap-upgrade-cta');
    expect(cta).toHaveAttribute('href', '/en/teacher/upgrade');
  });

  it('opens the Polar plan-gate sheet at the student cap instead of linking away', () => {
    render(<StudentCapMeter studentCount={FREE_TIER_LIMITS.studentsPerClass} />);
    expect(screen.getByTestId('student-cap-meter')).toHaveAttribute('data-at-cap', 'true');
    const cta = screen.getByTestId('student-cap-upgrade-cta');
    expect(cta).not.toHaveAttribute('href');
    fireEvent.click(cta);
    expect(screen.getByTestId('plan-gate-sheet')).toHaveAttribute('data-reason', 'student_limit');
  });

  it('is not at the cap for a teacher on a live access trial, matching the server cap', () => {
    mockUseTeacherPro.mockReturnValue({
      hasPro: false,
      loading: false,
      accessTrialExpires: new Date(Date.now() + 3 * 86_400_000).toISOString(),
      refresh: vi.fn(),
    });
    render(<StudentCapMeter studentCount={FREE_TIER_LIMITS.studentsPerClass} />);
    expect(screen.queryByTestId('student-cap-upgrade-cta')).toBeNull();
  });

  it('renders nothing for a Pro teacher: no plan talk and no second student count', () => {
    mockUseTeacherPro.mockReturnValue({
      hasPro: true,
      loading: false,
      source: 'polar',
      periodEnd: null,
      grant: null,
      grantExpired: false,
      refresh: vi.fn(),
    });
    const { container } = render(<StudentCapMeter studentCount={12} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing until the plan is known, so a paying teacher never sees the free cap', () => {
    mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: true, refresh: vi.fn() });
    const { container } = render(<StudentCapMeter studentCount={12} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('hides the CTA while entitlement is loading', () => {
    mockUseTeacherPro.mockReturnValue({
      hasPro: false,
      loading: true,
      source: 'polar',
      periodEnd: null,
      grant: null,
      grantExpired: false,
      refresh: vi.fn(),
    });
    render(<StudentCapMeter studentCount={8} />);
    expect(screen.queryByTestId('student-cap-upgrade-cta')).toBeNull();
  });

  // "Get Pro: $9" right under "3 / 50 students" read as "Pro raises the cap". It does not.
  it('makes the ask one inline link naming what Pro adds, in the count row', () => {
    render(<StudentCapMeter studentCount={3} />);
    const cta = screen.getByTestId('student-cap-upgrade-cta');
    expect(cta).toHaveAttribute('href', '/en/teacher/upgrade');
    expect(cta).toHaveTextContent('academy.classes.proUnlocks');
    expect(cta.parentElement).toContainElement(screen.getByTestId('student-cap-count'));
    expect(cta.className).toMatch(/min-h-11/);
    expect(cta.className).toMatch(/underline/);
  });

  it('at the cap, labels the button with the plan ask that matches the student-limit sheet it opens', () => {
    render(<StudentCapMeter studentCount={FREE_TIER_LIMITS.studentsPerClass} />);
    const cta = screen.getByTestId('student-cap-upgrade-cta');
    expect(cta).toHaveTextContent('academy.classes.proCta');
    expect(cta).not.toHaveTextContent('academy.classes.proUnlocks');
  });

  it('is one plain line: no panel, no fill, no badge', () => {
    const { container } = render(<StudentCapMeter studentCount={3} />);
    const meter = screen.getByTestId('student-cap-meter');
    expect(meter.className).not.toMatch(/border|shadow|bg-neo/);
    expect(container.querySelector('[data-pro-badge]')).toBeNull();
    expect(container.innerHTML).not.toMatch(/bg-neo-(yellow|cream|cyan|white|lime)/);
  });

  it('fires iap_viewed impression and landing_cta_clicked on dashboard path with source student_cap_dashboard', () => {
    render(<StudentCapMeter studentCount={3} source="dashboard" />);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('iap_viewed', {
      product: 'teacher_pro',
      source: 'student_cap_dashboard',
      studentCount: 3,
      limit: FREE_TIER_LIMITS.studentsPerClass,
      atCap: false,
    });

    const cta = screen.getByTestId('student-cap-upgrade-cta');
    fireEvent.click(cta);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('landing_cta_clicked', {
      cta: 'teacher_pro',
      source: 'student_cap_dashboard',
      studentCount: 3,
      limit: FREE_TIER_LIMITS.studentsPerClass,
      atCap: false,
    });
  });

  it('fires iap_viewed impression and landing_cta_clicked on classroom_card path with source student_cap_classroom_card', () => {
    render(<StudentCapMeter studentCount={FREE_TIER_LIMITS.studentsPerClass} source="classroom_card" />);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('iap_viewed', {
      product: 'teacher_pro',
      source: 'student_cap_classroom_card',
      studentCount: FREE_TIER_LIMITS.studentsPerClass,
      limit: FREE_TIER_LIMITS.studentsPerClass,
      atCap: true,
    });

    const cta = screen.getByTestId('student-cap-upgrade-cta');
    fireEvent.click(cta);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('landing_cta_clicked', {
      cta: 'teacher_pro',
      source: 'student_cap_classroom_card',
      studentCount: FREE_TIER_LIMITS.studentsPerClass,
      limit: FREE_TIER_LIMITS.studentsPerClass,
      atCap: true,
    });
  });

  it('does not fire iap_viewed when CTA is hidden (below milestone or Pro)', () => {
    render(<StudentCapMeter studentCount={2} source="dashboard" />);
    expect(mockTrackGrowthEvent).not.toHaveBeenCalledWith('iap_viewed', expect.anything());
  });

  it('renders classroomName when provided', () => {
    render(<StudentCapMeter studentCount={5} classroomName="Period 2" />);
    expect(screen.getByTestId('student-cap-class-name')).toHaveTextContent('Period 2');
  });
});

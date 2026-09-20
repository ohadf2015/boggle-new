import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StudentCapMeter, shouldShowStudentCapUpgradeCta } from '../StudentCapMeter';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import { TEACHER_PRO_MILESTONE_MIN_STUDENTS } from '@/lib/education/teacherProMilestone';

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

  it('shows the Polar upgrade CTA at the student cap', () => {
    render(<StudentCapMeter studentCount={FREE_TIER_LIMITS.studentsPerClass} />);
    expect(screen.getByTestId('student-cap-meter')).toHaveAttribute('data-at-cap', 'true');
    expect(screen.getByTestId('student-cap-upgrade-cta')).toHaveAttribute('href', '/en/teacher/upgrade');
  });

  it('hides the CTA for a Pro teacher', () => {
    mockUseTeacherPro.mockReturnValue({
      hasPro: true,
      loading: false,
      source: 'polar',
      periodEnd: null,
      grant: null,
      grantExpired: false,
      refresh: vi.fn(),
    });
    render(<StudentCapMeter studentCount={12} />);
    expect(screen.queryByTestId('student-cap-upgrade-cta')).toBeNull();
    expect(screen.getByTestId('student-cap-count').textContent).toContain('12');
    expect(screen.getByTestId('student-cap-count').textContent).not.toContain(
      String(FREE_TIER_LIMITS.studentsPerClass),
    );
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
});

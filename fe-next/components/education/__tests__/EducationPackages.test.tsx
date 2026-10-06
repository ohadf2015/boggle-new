import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let mockLanguage = 'en';
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: mockLanguage }),
}));

const mockTrackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => mockTrackGrowthEvent(...args),
}));

vi.mock('@/lib/education/proFunnelTelemetry', () => ({
  trackTeacherProUpgradeClick: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, onClick }: { children: React.ReactNode; href: string; onClick?: () => void }) => (
    <a href={href} onClick={onClick}>{children}</a>
  ),
}));

import { EducationPackages } from '../EducationPackages';

describe('<EducationPackages>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLanguage = 'en';
  });

  it('fires education_package_viewed on mount (package_view)', () => {
    render(<EducationPackages locale="en" />);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith(
      'education_package_viewed',
      expect.objectContaining({ locale: 'en' }),
    );
  });

  it('Teacher Pro CTA is the existing upgrade checkout, not a lead form', () => {
    render(<EducationPackages locale="en" />);
    const pro = screen.getByRole('link', { name: /education\.packages\.teacherPro\.cta/i });
    expect(pro).toHaveAttribute('href', '/en/teacher/upgrade');
  });

  it('Schools CTA is a lead button tagged school, never a checkout URL', () => {
    render(<EducationPackages locale="en" />);
    const school = screen.getByRole('button', { name: /education\.packages\.school\.cta/i });
    expect(school.closest('a')).toBeNull();
    expect(school).not.toHaveAttribute('href');
  });

  it('selecting Schools sets the lead form plan to school', async () => {
    const user = userEvent.setup();
    const onPlan = vi.fn();
    render(<EducationPackages locale="en" onPlanChange={onPlan} />);
    await user.click(screen.getByRole('button', { name: /education\.packages\.school\.cta/i }));
    expect(onPlan).toHaveBeenCalledWith('school');
  });

  it('shows the $9 and $49 price anchors', () => {
    render(<EducationPackages locale="en" />);
    expect(screen.getByText('$9')).toBeInTheDocument();
    expect(screen.getByText('$49')).toBeInTheDocument();
  });

  it('does not show a Classroom $39 card', () => {
    render(<EducationPackages locale="en" />);
    expect(screen.queryByText('$39')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /classroom/i })).not.toBeInTheDocument();
  });

  it('sets dir=rtl when language is Hebrew', () => {
    mockLanguage = 'he';
    const { container } = render(<EducationPackages locale="he" />);
    expect(container.firstChild).toHaveAttribute('dir', 'rtl');
  });
});

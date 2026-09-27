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

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
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

  it('Classroom CTA is a lead button, never a checkout URL', () => {
    render(<EducationPackages locale="en" />);
    const classroom = screen.getByRole('button', { name: /education\.packages\.classroom\.cta/i });
    expect(classroom.closest('a')).toBeNull();
    expect(classroom).not.toHaveAttribute('href');
  });

  it('Schools CTA is a lead button tagged school', () => {
    render(<EducationPackages locale="en" />);
    expect(screen.getByRole('button', { name: /education\.packages\.school\.cta/i })).toBeInTheDocument();
  });

  it('selecting Classroom sets the lead form plan to classroom', async () => {
    const user = userEvent.setup();
    const onPlan = vi.fn();
    render(<EducationPackages locale="en" onPlanChange={onPlan} />);
    await user.click(screen.getByRole('button', { name: /education\.packages\.classroom\.cta/i }));
    expect(onPlan).toHaveBeenCalledWith('classroom');
  });

  it('selecting Schools sets the lead form plan to school', async () => {
    const user = userEvent.setup();
    const onPlan = vi.fn();
    render(<EducationPackages locale="en" onPlanChange={onPlan} />);
    await user.click(screen.getByRole('button', { name: /education\.packages\.school\.cta/i }));
    expect(onPlan).toHaveBeenCalledWith('school');
  });

  it('shows the $9 and $39 price anchors', () => {
    render(<EducationPackages locale="en" />);
    expect(screen.getByText('$9')).toBeInTheDocument();
    expect(screen.getByText('$39')).toBeInTheDocument();
  });

  it('sets dir=rtl when language is Hebrew', () => {
    mockLanguage = 'he';
    const { container } = render(<EducationPackages locale="he" />);
    expect(container.firstChild).toHaveAttribute('dir', 'rtl');
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherPlanBadge } from '../TeacherPlanBadge';

const mockUseTeacherPro = vi.fn();
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => mockUseTeacherPro() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

const free = { hasPro: false, loading: false, source: null, periodEnd: null, grant: null, grantExpired: false };

describe('TeacherPlanBadge — quiet when a louder Pro ask is already on screen', () => {
  it('Given quiet, Then the free chip keeps its link and plan name but drops the Upgrade word', () => {
    mockUseTeacherPro.mockReturnValue(free);
    render(<TeacherPlanBadge quiet />);
    const badge = screen.getByTestId('teacher-plan-badge');
    expect(badge).toHaveAttribute('href', '/en/teacher/upgrade');
    expect(screen.getByText('teacher.plan.free')).toBeInTheDocument();
    expect(screen.queryByText('teacher.plan.upgrade')).toBeNull();
  });

  it('Given not quiet, Then the Upgrade word stays', () => {
    mockUseTeacherPro.mockReturnValue(free);
    render(<TeacherPlanBadge />);
    expect(screen.getByText('teacher.plan.upgrade')).toBeInTheDocument();
  });
});

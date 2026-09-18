import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherProNavLink } from '../TeacherProNavLink';

const mockUseTeacherPro = vi.fn();
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => mockUseTeacherPro() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

describe('TeacherProNavLink', () => {
  it('renders nothing while the entitlement is unknown', () => {
    mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: true });
    const { container } = render(<TeacherProNavLink />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for a Pro teacher', () => {
    mockUseTeacherPro.mockReturnValue({ hasPro: true, loading: false });
    const { container } = render(<TeacherProNavLink />);
    expect(container).toBeEmptyDOMElement();
  });

  it('is the always-on upgrade entry for a free teacher', () => {
    mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false });
    render(<TeacherProNavLink />);
    const link = screen.getByTestId('teacher-pro-nav');
    expect(link).toHaveAttribute('href', '/en/teacher/upgrade');
    expect(screen.getByText('teacher.plan.pro')).toBeInTheDocument();
    expect(screen.getByText('teacher.plan.upgrade')).toBeInTheDocument();
  });
});

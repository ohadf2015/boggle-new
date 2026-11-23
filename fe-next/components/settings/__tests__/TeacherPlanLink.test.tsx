import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherPlanLink } from '../TeacherPlanLink';

const auth = { profile: null as null | { user_role?: string; is_admin?: boolean } };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'de' }) }));

describe('TeacherPlanLink', () => {
  it('gives a teacher a way from Settings to their plan, card and cancel', () => {
    auth.profile = { user_role: 'teacher' };
    render(<TeacherPlanLink isDarkMode />);
    const link = screen.getByTestId('settings-teacher-plan-link');
    expect(link).toHaveAttribute('href', '/de/teacher/upgrade');
    expect(link).toHaveTextContent('settings.teacherPlan.title');
  });

  it('is not shown to students or signed-out players', () => {
    auth.profile = { user_role: 'student' };
    const { container, rerender } = render(<TeacherPlanLink isDarkMode />);
    expect(container).toBeEmptyDOMElement();
    auth.profile = null;
    rerender(<TeacherPlanLink isDarkMode />);
    expect(container).toBeEmptyDOMElement();
  });
});

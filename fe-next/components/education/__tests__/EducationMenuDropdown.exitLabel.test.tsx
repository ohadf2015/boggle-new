import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/components/teacher/TeacherProNavLink', () => ({ TeacherProNavLink: () => null }));

import { EducationMenuDropdown } from '../EducationMenuDropdown';

describe('EducationMenuDropdown — the link to the consumer app says it leaves education', () => {
  it('labels the /{locale} link "Exit Education", not an ambiguous "Back to Home"', () => {
    render(
      <EducationMenuDropdown isTeacher isOnTeacherSection={false} isOnStudentSection={false} onSignOut={vi.fn()} isAuthenticated />,
    );
    fireEvent.click(screen.getByLabelText('common.menu'));
    const exit = screen.getByText('education.header.exitEducation').closest('a');
    expect(exit).toHaveAttribute('href', '/en/education');
    expect(screen.queryByText('common.backToHome')).not.toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'he' }),
}));

import { ReportsNoClasses } from '../ReportsNoClasses';

describe('<ReportsNoClasses>', () => {
  it('Given no classes, Then it says why the page is empty and links to creating a class', () => {
    render(<ReportsNoClasses />);
    expect(screen.getByText('teacher.reports.noClassroomsFound')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /eg2Rep.report.noClasses.cta/ })).toHaveAttribute('href', '/he/teacher');
  });
});

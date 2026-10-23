import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

let pathname = '/he/education/help/create-a-class';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => `T(${k})`, language: 'he' }) }));

import { EducationBreadcrumbs } from '../../EducationBreadcrumbs';

const crumbText = () => Array.from(document.querySelectorAll('nav a, nav span')).map((n) => n.textContent ?? '');

describe('EducationBreadcrumbs labels', () => {
  it('names the help center with a translated label and never prints a raw slug', () => {
    pathname = '/he/education/help/create-a-class';
    render(<EducationBreadcrumbs />);
    expect(screen.getByText('T(eduShell.account.help)')).toBeInTheDocument();
    for (const c of crumbText()) expect(c).not.toMatch(/^(help|create-a)/);
  });

  it('keeps the help center clickable from an article', () => {
    pathname = '/he/education/help/create-a-class';
    render(<EducationBreadcrumbs />);
    expect(screen.getByText('T(eduShell.account.help)').closest('a')).toHaveAttribute('href', '/he/education/help');
  });

  it('drops any segment it has no label for instead of showing it raw', () => {
    pathname = '/he/education/some-unmapped-page';
    render(<EducationBreadcrumbs />);
    expect(crumbText().join(' ')).not.toMatch(/some-unm/);
  });

  it('every crumb link stays in the viewer locale', () => {
    pathname = '/he/education/help/create-a-class';
    render(<EducationBreadcrumbs />);
    for (const a of Array.from(document.querySelectorAll('a[href]'))) expect(a.getAttribute('href')).toMatch(/^\/he\/education/);
  });
});

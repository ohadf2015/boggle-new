/**
 * A database id is not a place, so it is not a breadcrumb.
 *
 * The trail is built from URL segments, and any segment it has no label for
 * falls through to `slice(0, 8) + '...'`. On the student's practice route that
 * segment is the lesson's UUID, so the header above the games read
 * `Education › Student › Lessons › d647f2f8…` — a raw id, on the screen a
 * twelve year old starts from, at every desktop width (r5 capture, 1440x900).
 *
 * Dropping the crumb rather than renaming it keeps this free of new copy in six
 * locales, and `Lessons` — which the student can actually click — becomes the
 * current step, which is what the trail is for.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

const { mockPathname } = vi.hoisted(() => ({ mockPathname: vi.fn() }));

vi.mock('next/navigation', () => ({ usePathname: () => mockPathname() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { EducationBreadcrumbs } from '../EducationBreadcrumbs';

describe('education breadcrumbs on an id route', () => {
  it('does not render a crumb for a lesson UUID', () => {
    mockPathname.mockReturnValue('/en/student/lessons/d647f2f8-2642-4664-a358-a4d5c52df6ac');

    const { container } = render(<EducationBreadcrumbs />);

    expect(container.textContent).not.toContain('d647f2f8');
    expect(screen.getByText('education.header.breadcrumbs.lessons')).toBeInTheDocument();
  });

  it('still names the segments it knows', () => {
    mockPathname.mockReturnValue('/en/teacher/curriculum');

    render(<EducationBreadcrumbs />);

    expect(screen.getByText('education.header.breadcrumbs.curriculum')).toBeInTheDocument();
  });
});

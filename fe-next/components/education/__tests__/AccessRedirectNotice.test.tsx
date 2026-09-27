import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    // Mirror the real `t(path, params)` closely enough to prove interpolation is wired:
    // a missing param would leave the raw `{{dest}}` token visible to the teacher.
    t: (k: string, params?: Record<string, string>) =>
      params ? `${k}|${Object.entries(params).map(([a, b]) => `${a}=${b}`).join(',')}` : k,
    language: 'en',
  }),
}));

import { AccessRedirectNotice, accessRedirectDestKey } from '../AccessRedirectNotice';

/**
 * Regression cover for a real LogRocket session (2026-08-31, es-PE teacher from
 * Google): TeacherGate wrote `?from=/es/education/classroom-game` and the access
 * page threw the parameter away, so the teacher was silently teleported onto a
 * generic "apply for access" pitch. They bounced classroom-game → access three
 * times before submitting the form that was in front of them the whole time.
 */
describe('accessRedirectDestKey', () => {
  it('maps a kebab-case education path to its existing breadcrumb key', () => {
    expect(accessRedirectDestKey('/es/education/classroom-game')).toBe(
      'education.header.breadcrumbs.classroomGame'
    );
  });

  it('picks the most specific segment, not the locale or the section', () => {
    expect(accessRedirectDestKey('/en/teacher/curriculum')).toBe(
      'education.header.breadcrumbs.curriculum'
    );
  });

  it('still resolves a bare section path', () => {
    expect(accessRedirectDestKey('/en/teacher')).toBe('education.header.breadcrumbs.teacher');
  });

  it('tolerates a query string and a trailing slash', () => {
    expect(accessRedirectDestKey('/en/education/duels/?x=1')).toBe(
      'education.header.breadcrumbs.duels'
    );
  });

  it('returns null for an unknown destination rather than inventing a key', () => {
    // A key path rendered raw to a user is its own known bug class here.
    expect(accessRedirectDestKey('/en/education/something-new')).toBeNull();
    expect(accessRedirectDestKey('')).toBeNull();
    expect(accessRedirectDestKey(null)).toBeNull();
  });
});

describe('<AccessRedirectNotice>', () => {
  it('renders nothing when the teacher navigated here directly', () => {
    const { container } = render(<AccessRedirectNotice from={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('names the destination the teacher was actually trying to reach', () => {
    render(<AccessRedirectNotice from="/es/education/classroom-game" />);
    expect(screen.getByText('education.access.redirect_title')).toBeInTheDocument();
    expect(
      screen.getByText(/education\.access\.redirect_body\|dest=education\.header\.breadcrumbs\.classroomGame/)
    ).toBeInTheDocument();
  });

  it('falls back to a generic destination phrase, never a raw key path', () => {
    render(<AccessRedirectNotice from="/en/education/something-new" />);
    expect(
      screen.getByText(/dest=education\.access\.redirect_dest_fallback/)
    ).toBeInTheDocument();
  });

  it('is announced to assistive tech', () => {
    render(<AccessRedirectNotice from="/en/teacher" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

/**
 * TeacherSetupSection — the public "how it works in your classroom" block on
 * /education.
 *
 * Why it exists: every setup explainer we shipped sat behind TeacherGate (the
 * first-run modal, and the #1099 dashboard checklist). A teacher evaluating
 * the site before signing up could not reach any of them, and none of the 8
 * landing FAQs answer "how do I set up a classroom". A real teacher emailed to
 * say exactly that before leaving.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

const lang = { current: 'en' };
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => k,
    language: lang.current,
    dir: lang.current === 'he' ? 'rtl' : 'ltr',
  }),
}));

import { TeacherSetupSection } from '../TeacherSetupSection';

describe('TeacherSetupSection', () => {
  beforeEach(() => {
    lang.current = 'en';
  });

  it('renders the setup steps without any auth gate', () => {
    render(<TeacherSetupSection />);
    for (const id of ['create', 'share', 'join', 'play', 'results']) {
      expect(screen.getByTestId(`onboarding-step-${id}`)).toBeInTheDocument();
    }
  });

  it('is linkable so nav and FAQ answers can point at it', () => {
    const { container } = render(<TeacherSetupSection />);
    expect(container.querySelector('#how-it-works')).not.toBeNull();
  });

  it('carries a heading that names the teacher task', () => {
    render(<TeacherSetupSection />);
    expect(
      screen.getByRole('heading', { name: 'education.onboarding.title' }),
    ).toBeInTheDocument();
  });

  it('offers the next step, locale-prefixed', () => {
    render(<TeacherSetupSection />);
    const cta = screen.getByTestId('setup-section-cta');
    expect(cta).toHaveAttribute('href', '/en/education/access');
  });

  it('keeps the locale prefix in Hebrew', () => {
    lang.current = 'he';
    render(<TeacherSetupSection />);
    expect(screen.getByTestId('setup-section-cta')).toHaveAttribute(
      'href',
      '/he/education/access',
    );
  });
});

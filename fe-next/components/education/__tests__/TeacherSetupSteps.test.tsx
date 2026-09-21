/**
 * TeacherSetupSteps — the 5-step "how a classroom runs" strip, extracted from
 * the first-run modal so a LOGGED-OUT teacher evaluating the site can read it.
 *
 * The modal keeps the same markup (same step testids), so this file and
 * TeacherOnboarding.infographic.test.tsx assert the same five ids.
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

import { TeacherSetupSteps, TEACHER_SETUP_STEP_IDS } from '../TeacherSetupSteps';

describe('TeacherSetupSteps', () => {
  beforeEach(() => {
    lang.current = 'en';
  });

  it('exports the five setup steps in running order', () => {
    expect(TEACHER_SETUP_STEP_IDS).toEqual(['create', 'share', 'join', 'play', 'results']);
  });

  it('renders every step with the id the modal already used', () => {
    render(<TeacherSetupSteps />);
    for (const id of TEACHER_SETUP_STEP_IDS) {
      expect(screen.getByTestId(`onboarding-step-${id}`)).toBeInTheDocument();
    }
  });

  it('renders as an ordered list so the sequence survives a screen reader', () => {
    const { container } = render(<TeacherSetupSteps />);
    const list = container.querySelector('ol');
    expect(list).not.toBeNull();
    expect(list?.querySelectorAll('li')).toHaveLength(5);
  });

  it('renders standalone — no modal backdrop, no dismiss control', () => {
    const { container } = render(<TeacherSetupSteps />);
    expect(container.querySelector('.fixed')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

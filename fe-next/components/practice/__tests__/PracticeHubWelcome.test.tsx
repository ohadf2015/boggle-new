/**
 * PracticeHubWelcome — first-time-only welcome card on the practice hub.
 *
 * Hides the moment any practice mode is completed so veterans don't get a
 * "welcome back!" loop. Hub renders this above the mode tiles only when the
 * player has zero completed modes.
 *
 * Audit ref: practice/onboarding audit 2026-05-03 §12 ("No empty-state fun").
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

vi.mock('next/image', () => ({
  default: (p: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" {...p} />;
  },
}));

import PracticeHubWelcome from '../PracticeHubWelcome';

describe('PracticeHubWelcome', () => {
  it('renders the welcome heading + body for first-timers', () => {
    render(<PracticeHubWelcome />);
    expect(screen.getByTestId('practice-hub-welcome')).toBeInTheDocument();
    expect(screen.getByTestId('practice-hub-welcome').textContent).toContain(
      'practiceHub.welcome.title'
    );
    expect(screen.getByTestId('practice-hub-welcome').textContent).toContain(
      'practiceHub.welcome.body'
    );
  });

  it('shows a "start here" hint pointing to the first practice tile', () => {
    render(<PracticeHubWelcome />);
    expect(screen.getByTestId('practice-hub-welcome-hint')).toHaveTextContent(
      'practiceHub.welcome.startHere'
    );
  });
});

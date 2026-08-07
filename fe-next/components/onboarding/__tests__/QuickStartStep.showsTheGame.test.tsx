import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: (_t, tag: string) => ({ children, whileHover, whileTap, initial, animate, transition, ...props }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement(tag, props, children as React.ReactNode),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  useMotionValue: () => ({ set: () => {}, get: () => 0 }),
  useSpring: () => ({ set: () => {}, get: () => 0 }),
  useTransform: () => 0,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    language: 'en',
    dir: 'ltr',
    setLanguage: () => {},
  }),
}));

vi.mock('@/components/Avatar', () => ({ __esModule: true, default: () => <div data-testid="avatar" /> }));
vi.mock('@/components/avatar/AvatarBuilderModal', () => ({
  __esModule: true,
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="avatar-builder" /> : null),
}));
vi.mock('@/utils/onboardingNameSuggestions', () => ({ suggestPlayerName: () => 'WordWizard' }));
// Mocked so the absence assertion below is real: if QuickStartStep still
// rendered this component, the testid WOULD be in the tree.
vi.mock('../OnboardingGoogleSignup', () => ({
  __esModule: true,
  default: () => <div data-testid="google-signup" />,
}));
vi.mock('../MiniGrid', () => ({
  __esModule: true,
  default: ({ demoWord, autoTrace }: { demoWord: string; autoTrace?: boolean }) => (
    <div data-testid="ftue-demo-grid" data-word={demoWord} data-auto-trace={String(!!autoTrace)} />
  ),
}));

import QuickStartStep from '../QuickStartStep';

const noop = () => {};

/**
 * The FTUE screen is the first moment a player sees the product, and 24 of 61
 * starters (39%) abandoned on it. A replay of the screen showed why: a
 * wordmark, an avatar, a name field, 6 flags, PLAY, two text links and an
 * account-signup block — roughly 8 interactive targets and NO gameplay. It
 * asked for an email before the player had seen a single tile.
 * See docs/onboarding/2026-08-07-onboarding-friction-audit.md.
 */
describe('QuickStartStep shows the game before it asks for anything', () => {
  const renderStep = () =>
    render(<QuickStartStep onPlay={noop} onHowToPlay={noop} onHaveAccount={noop} />);

  it('puts a real board on screen, self-playing, so the game is visible at once', () => {
    renderStep();

    const grid = screen.getByTestId('ftue-demo-grid');
    expect(grid).toBeInTheDocument();
    // It must demonstrate itself — a static board teaches nothing.
    expect(grid.getAttribute('data-auto-trace')).toBe('true');
    expect(grid.getAttribute('data-word')).toBeTruthy();
  });

  it('does NOT ask for an account before the first game', () => {
    renderStep();

    // Guests already get a signup CTA on the result screen, AFTER they have
    // seen the game deliver something. Asking here inverts value-then-ask.
    expect(screen.queryByTestId('google-signup')).toBeNull();
  });

  it('still lets the player start instantly — PLAY is present and enabled', () => {
    renderStep();

    const play = screen.getByTestId('quick-start-play');
    expect(play).toBeInTheDocument();
    expect(play).not.toBeDisabled();
  });

  it('keeps identity editable without demanding it', () => {
    renderStep();

    expect(screen.getByTestId('quick-start-name')).toHaveValue('WordWizard');
    expect(screen.getByTestId('quick-start-avatar')).toBeInTheDocument();
  });
});

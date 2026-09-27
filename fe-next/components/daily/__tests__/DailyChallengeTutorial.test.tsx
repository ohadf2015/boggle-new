/**
 * Tests for the redesigned Daily Challenge Word Hunt tutorial.
 *
 * The tutorial was compressed from 5 text steps to 3 image-led steps:
 *   1. Guess the word  (hero image + live colored-tile legend)
 *   2. Free bonus words (hero image + uses-a-try vs free comparison)
 *   3. Ready to hunt    (hero image + start)
 *
 * Each step leads with a brand illustration under /daily/tutorial/. The
 * colored-tile legend stays as live DOM (localized + crisp), so we assert it
 * renders rather than living inside a raster.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Pass-through framer-motion so steps render synchronously in jsdom.
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial: _i, animate: _a, exit: _e, whileHover: _wh, whileTap: _wt, transition: _t, variants: _v, ...domProps } = props as Record<string, unknown>;
      return <div {...domProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// t() echoes the key so we can assert against stable key strings.
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
    setLanguage: vi.fn(),
  }),
}));

vi.mock('@/hooks/useSwipeGesture', () => ({
  useSwipeGesture: () => ({}),
}));

vi.mock('@/utils/hapticFeedback', () => ({
  triggerHaptic: vi.fn(),
}));

import { DailyChallengeTutorial } from '../DailyChallengeTutorial';

const setup = () => {
  const onComplete = vi.fn();
  const onSkip = vi.fn();
  const utils = render(<DailyChallengeTutorial onComplete={onComplete} onSkip={onSkip} />);
  return { onComplete, onSkip, ...utils };
};

const next = () =>
  fireEvent.click(screen.getByRole('button', { name: /tutorial\.wordHunt/ }));

describe('DailyChallengeTutorial (3-step image redesign)', () => {
  it('opens on step 1 with the guess hero image and the goal copy', () => {
    setup();
    const hero = screen.getByRole('img', { name: 'tutorial.wordHunt.step1ImageAlt' });
    expect(hero).toBeInTheDocument();
    expect(hero.getAttribute('src')).toContain('step1-guess');
    expect(screen.getByText('tutorial.wordHunt.welcome.title')).toBeInTheDocument();
    expect(screen.getByText('tutorial.wordHunt.welcome.description')).toBeInTheDocument();
  });

  it('keeps the colored-tile legend as live DOM on step 1 (not baked into the image)', () => {
    setup();
    // Legend labels share a node with their emoji (e.g. "🟩 legendGreen"), so match loosely.
    expect(screen.getByText(/letterFeedback\.legendGreen/)).toBeInTheDocument();
    expect(screen.getByText(/letterFeedback\.legendYellow/)).toBeInTheDocument();
    expect(screen.getByText(/letterFeedback\.legendGray/)).toBeInTheDocument();
  });

  it('advances to step 2 showing the bonus-word hero and the try-vs-free contrast', () => {
    setup();
    next(); // -> step 2
    const hero = screen.getByRole('img', { name: 'tutorial.wordHunt.step2ImageAlt' });
    expect(hero).toBeInTheDocument();
    expect(hero.getAttribute('src')).toContain('step2-bonus');
    expect(screen.getByText('tutorial.wordHunt.triesRule.usesAttempt')).toBeInTheDocument();
    expect(screen.getByText('tutorial.wordHunt.triesRule.noAttempt')).toBeInTheDocument();
  });

  it('reaches the ready step after exactly two advances (3 steps total, not 5)', () => {
    const { onComplete } = setup();
    next(); // -> step 2
    next(); // -> step 3 (ready)
    const hero = screen.getByRole('img', { name: 'tutorial.wordHunt.step3ImageAlt' });
    expect(hero).toBeInTheDocument();
    expect(hero.getAttribute('src')).toContain('step3-ready');
    // The final primary button completes the tutorial.
    expect(onComplete).not.toHaveBeenCalled();
    // Start button name carries a trailing 🚀, so match loosely.
    fireEvent.click(screen.getByRole('button', { name: /complete\.start/ }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onSkip when the close button is pressed', () => {
    const { onSkip } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'common.close' }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  /**
   * Regression: the daily "ready" screen renders a persistent green
   * "play today's puzzle" CTA portaled to <body> at z-[100]. Because the portal
   * sits later in the DOM than this inline overlay, an EQUAL z-index let the
   * sticky CTA paint over the tutorial's action buttons (the reported Swedish
   * clipping bug). The full-screen tutorial is a modal dialog and must sit
   * above persistent page chrome.
   */
  it('renders the overlay above the persistent daily play CTA (z-index > z-[100])', () => {
    const { container } = setup();
    const overlay = container.firstChild as HTMLElement;
    expect(overlay.className).toContain('z-[120]');
  });

  /**
   * Layout hardening: the step actions must live in a non-scrolling footer that
   * is a sibling of (not inside) the scrollable body. This guarantees the
   * primary actions are always visible and tappable on short viewports instead
   * of being pushed below the fold or clipped.
   */
  it('pins the step actions in a footer outside the scrollable body', () => {
    setup();
    const body = screen.getByTestId('tutorial-body');
    const footer = screen.getByTestId('tutorial-footer');

    expect(body.className).toContain('overflow-y-auto');

    const primary = screen.getByRole('button', { name: /welcome\.next/ });
    expect(footer.contains(primary)).toBe(true);
    expect(body.contains(primary)).toBe(false);
  });
});

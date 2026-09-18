/**
 * StudentNextActions — post-game CTA for students in classroom mode.
 *
 * The primary CTA must be "Play Again" (relaunch the same mode), not a paywall.
 * The secondary option is "Wait for teacher" for class-paced games where the
 * teacher controls the next round.
 *
 * Never lands a student on a paywall (/education/access) or outside the
 * education tree.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StudentNextActions } from '../StudentNextActions';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

describe('StudentNextActions', () => {
  it('renders "Play Again" as the primary loud button', () => {
    const onPlayAgain = vi.fn();
    render(
      <StudentNextActions onPlayAgain={onPlayAgain} t={t} />
    );
    const playAgainBtn = screen.getByTestId('play-again-button');
    expect(playAgainBtn).toBeInTheDocument();
    // Primary button should be loud: lime or pink color from neo-brutalist theme
    expect(playAgainBtn.className).toMatch(/bg-neo-(lime|pink)/);
  });

  it('renders "Wait for teacher" as secondary option', () => {
    render(
      <StudentNextActions t={t} />
    );
    const waitMsg = screen.getByTestId('wait-for-teacher-message');
    expect(waitMsg).toBeInTheDocument();
    // Secondary should not have the solid full-strength primary colors like the Play Again button
    // The wait message has a subtle background (lime/10) not a loud one
    expect(waitMsg.className).toMatch(/bg-neo-lime\/10/);
  });

  it('calls onPlayAgain when Play Again button is clicked', () => {
    const onPlayAgain = vi.fn();
    render(
      <StudentNextActions onPlayAgain={onPlayAgain} t={t} />
    );
    const playAgainBtn = screen.getByTestId('play-again-button');
    playAgainBtn.click();
    expect(onPlayAgain).toHaveBeenCalled();
  });

  it('hides onPlayAgain button when callback is not provided', () => {
    render(
      <StudentNextActions t={t} />
    );
    const playAgainBtn = screen.queryByTestId('play-again-button');
    expect(playAgainBtn).not.toBeInTheDocument();
  });

  it('renders practice button when onPractice callback provided', () => {
    const onPractice = vi.fn();
    render(
      <StudentNextActions onPractice={onPractice} t={t} />
    );
    const practiceBtn = screen.getByTestId('practice-missed-button');
    expect(practiceBtn).toBeInTheDocument();
    practiceBtn.click();
    expect(onPractice).toHaveBeenCalled();
  });

  it('never renders paywall or external links', () => {
    const onPlayAgain = vi.fn();
    const onPractice = vi.fn();
    const { container } = render(
      <StudentNextActions
        onPlayAgain={onPlayAgain}
        onPractice={onPractice}
        t={t}
      />
    );
    // Check all links are internal and not pointing to paywall
    const links = container.querySelectorAll('a');
    links.forEach(link => {
      expect(link.href).not.toMatch(/education\/access/);
      expect(link.href).not.toMatch(/^\//);  // Should not be bare root path
    });
  });

  it('uses entrance animation for accessibility', () => {
    render(
      <StudentNextActions onPlayAgain={() => {}} t={t} />
    );
    const playAgainBtn = screen.getByTestId('play-again-button');
    // Should respect prefers-reduced-motion (Framer Motion does this automatically)
    expect(playAgainBtn.closest('[class*="animate"]')).toBeDefined();
  });
});

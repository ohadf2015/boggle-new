/**
 * Design-system color contract for WordFeedbackToast.
 * Every feedback type must use neo-* palette classes, not generic Tailwind colors.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WordFeedbackToast } from '../WordFeedbackToast';

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, className, ...rest }: React.PropsWithChildren<{ className?: string; [key: string]: unknown }>) => (
      <div className={className} data-testid={rest['data-testid'] as string | undefined}>{children}</div>
    ),
    span: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
      <span className={className}>{children}</span>
    ),
  },
  AdaptiveAnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Gets the toast container (the outer AdaptiveMotion.div with bg-neo-* class)
// Since toast structure is: AdaptiveMotion.div > div (message) > TextContent,
// we need to climb up from the text element to the motion div (which has the bg-neo-* class)
function getToastEl(message: string) {
  const textEl = screen.getByText(message);
  // Climb up: textElement → message div → motion div (has className with bg-neo-*)
  let current = textEl.parentElement;
  while (current && !current.className?.toString().includes('bg-neo-')) {
    current = current.parentElement;
  }
  return current as HTMLElement | null;
}

describe('WordFeedbackToast — design system color contract', () => {
  it('valid-word uses bg-neo-lime (not bg-green-500)', () => {
    render(<WordFeedbackToast type="valid-word" message="FOUND" />);
    const el = getToastEl('FOUND');
    expect(el?.className).toContain('bg-neo-lime');
    expect(el?.className).not.toContain('bg-green-');
  });

  it('invalid-word uses bg-neo-red (not bg-red-500)', () => {
    render(<WordFeedbackToast type="invalid-word" message="INVALID" />);
    const el = getToastEl('INVALID');
    expect(el?.className).toContain('bg-neo-red');
    expect(el?.className).not.toContain('bg-red-');
  });

  it('not-in-dictionary uses bg-neo-red', () => {
    render(<WordFeedbackToast type="not-in-dictionary" message="UNKNOWN" />);
    const el = getToastEl('UNKNOWN');
    expect(el?.className).toContain('bg-neo-red');
  });

  it('not-on-board uses bg-neo-orange (not bg-orange-500)', () => {
    render(<WordFeedbackToast type="not-on-board" message="MISSING" />);
    const el = getToastEl('MISSING');
    expect(el?.className).toContain('bg-neo-orange');
    expect(el?.className).not.toContain('bg-orange-');
  });

  it('too-short uses bg-neo-orange', () => {
    render(<WordFeedbackToast type="too-short" message="SHORT" />);
    const el = getToastEl('SHORT');
    expect(el?.className).toContain('bg-neo-orange');
  });

  it('too-long uses bg-neo-orange', () => {
    render(<WordFeedbackToast type="too-long" message="TOOLONG" />);
    const el = getToastEl('TOOLONG');
    expect(el?.className).toContain('bg-neo-orange');
  });

  it('duplicate uses bg-neo-yellow (not bg-yellow-500)', () => {
    render(<WordFeedbackToast type="duplicate" message="AGAIN" />);
    const el = getToastEl('AGAIN');
    expect(el?.className).toContain('bg-neo-yellow');
    expect(el?.className).not.toContain('bg-yellow-');
  });

  it('target-attempt uses bg-neo-cyan', () => {
    render(<WordFeedbackToast type="target-attempt" message="CLOSE" />);
    const el = getToastEl('CLOSE');
    expect(el?.className).toContain('bg-neo-cyan');
  });

  it('valid-word uses rounded-neo border style', () => {
    render(<WordFeedbackToast type="valid-word" message="STYLE" />);
    const el = getToastEl('STYLE');
    expect(el?.className).toContain('rounded-neo');
  });

  it('toast positions at top-20 on normal viewport', () => {
    render(<WordFeedbackToast type="valid-word" message="POS" />);
    const el = getToastEl('POS');
    expect(el?.className).toContain('top-20');
  });

  it('consolidated rejection group: invalid-word and not-in-dictionary render same style', () => {
    const { rerender } = render(<WordFeedbackToast type="invalid-word" message="INV" />);
    const el1 = getToastEl('INV');
    expect(el1?.className).toContain('bg-neo-red');

    rerender(<WordFeedbackToast type="not-in-dictionary" message="DICT" />);
    const el2 = getToastEl('DICT');
    expect(el2?.className).toContain('bg-neo-red');
  });

  it('board rejection group: not-on-board, too-short, too-long render orange style', () => {
    const { rerender } = render(<WordFeedbackToast type="not-on-board" message="B1" />);
    let el = getToastEl('B1');
    expect(el?.className).toContain('bg-neo-orange');

    rerender(<WordFeedbackToast type="too-short" message="B2" />);
    el = getToastEl('B2');
    expect(el?.className).toContain('bg-neo-orange');

    rerender(<WordFeedbackToast type="too-long" message="B3" />);
    el = getToastEl('B3');
    expect(el?.className).toContain('bg-neo-orange');
  });
});

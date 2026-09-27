import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CompactModeRow } from '../CompactModeRow';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    m: {
      div: ({ children, className, style, ...props }: React.ComponentProps<'div'>) => (
        <div className={className} style={style} {...props}>{children}</div>
      ),
    },
  };
});

/**
 * The hub's secondary rows used to be interchangeable: identical navy background,
 * identical lime Play chip, and a 24px icon in the mode's accent as the ONLY
 * difference between Word Wheel, Word Tower and Connections. Scanning the hub you
 * could not tell which row was which game without reading the title.
 *
 * These pin the two signals that make a row recognizable at a glance — its own
 * art and its own accent edge — on top of the accent the rows already had.
 * Test ids stay colour-keyed because accent colour is 1:1 with mode here, and
 * six other suites address the rows that way.
 */
describe('CompactModeRow — per-mode identity', () => {
  const baseProps = {
    icon: <span data-testid="icon" />,
    title: 'Word Wheel',
    color: 'yellow' as const,
    onPlay: vi.fn(),
  };

  it('renders the mode art so the row is identifiable without reading the title', () => {
    render(<CompactModeRow {...baseProps} artUrl="/daily/word-wheel-mascot.jpg" />);
    const art = screen.getByTestId('mode-row-art-yellow');
    // Rendered as a CSS background (same convention as the hero QuestCard), so
    // the URL is asserted on the element rather than on an <img src>.
    expect(art).toHaveAttribute('data-art-url', '/daily/word-wheel-mascot.jpg');
    expect(art.getAttribute('style')).toContain('/daily/word-wheel-mascot.jpg');
    // Decorative: the title beside it already names the mode.
    expect(art).toHaveAttribute('aria-hidden', 'true');
  });

  it('omits the art slot entirely when a mode has no artwork', () => {
    render(<CompactModeRow {...baseProps} />);
    expect(screen.queryByTestId('mode-row-art-yellow')).not.toBeInTheDocument();
  });

  it('carries the mode accent as a solid edge, start-anchored so RTL flips it', () => {
    const { container } = render(<CompactModeRow {...baseProps} />);
    const edge = container.querySelector('[data-testid="mode-row-edge-yellow"]');
    expect(edge).toBeInTheDocument();
    expect(edge?.className).toContain('bg-neo-yellow');
    // start-anchored, never left-anchored — the hub ships in Hebrew.
    expect(edge?.className).toContain('start-0');
    expect(edge?.className).not.toMatch(/\bleft-0\b/);
  });

  it('gives each accent its own tint rather than one shared navy', () => {
    const { container: yellow } = render(<CompactModeRow {...baseProps} color="yellow" />);
    const { container: purple } = render(<CompactModeRow {...baseProps} color="purple" />);
    const yellowBtn = yellow.querySelector('button')?.className ?? '';
    const purpleBtn = purple.querySelector('button')?.className ?? '';
    expect(yellowBtn).not.toEqual(purpleBtn);
    expect(yellowBtn).toContain('neo-yellow');
    expect(purpleBtn).toContain('neo-purple');
  });

  it('still reads as done when played', () => {
    render(<CompactModeRow {...baseProps} played artUrl="/daily/word-wheel-mascot.jpg" />);
    expect(screen.getByTestId('yellow-done-badge')).toBeInTheDocument();
  });
});

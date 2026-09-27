/**
 * The empty state must never spill outside its own dashed box.
 *
 * Caught in the browser, not in a test: on a 1280×630 laptop window — the
 * teacher's mirrored screen, which is the second half of this piece's brief —
 * the roster is the only flexible row in a `fixed inset-0 overflow-hidden`
 * column, so it absorbs every pixel the join panel and the footer do not use.
 * On a short viewport that left it about 50px tall while its two lines of copy
 * still measured ~50px, and "Type the code above" rendered ON TOP of the dashed
 * border, under the count. It read like a rendering bug on a classroom wall.
 *
 * The fix is that the box can shrink (`min-h-0`), clips rather than spills
 * (`overflow-hidden`), and its type is capped against viewport HEIGHT as well
 * as width, so a short window shrinks the words instead of the container.
 *
 * jsdom has no layout, so none of this can be measured here — these are
 * class-presence guards on the exact tokens that decide the case.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('framer-motion', () => ({
  m: {
    div: 'div', span: 'span', p: 'p', h1: 'h1', h2: 'h2', button: 'button', li: 'li', ul: 'ul',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

import ProjectorRoster from '../ProjectorRoster';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

describe('ProjectorRoster — a short laptop window', () => {
  it('lets the empty state shrink and clip instead of spilling over its own border', () => {
    render(<ProjectorRoster students={[]} t={t} />);
    const empty = screen.getByTestId('projector-roster-empty');
    expect(empty.className).toContain('min-h-0');
    expect(empty.className).toContain('overflow-hidden');
  });

  it('caps the empty-state headline against viewport height, not width alone', () => {
    render(<ProjectorRoster students={[]} t={t} />);
    const empty = screen.getByTestId('projector-roster-empty');
    const headline = empty.querySelector('[data-testid="projector-roster-empty-title"]');
    expect(headline).not.toBeNull();
    expect(headline!.className).toContain('vh');
  });

  it('caps the live count too — it is the tallest thing in the roster header', () => {
    render(<ProjectorRoster students={[{ username: 'Ada' }]} t={t} />);
    expect(screen.getByTestId('projector-count').className).toContain('vh');
  });
});

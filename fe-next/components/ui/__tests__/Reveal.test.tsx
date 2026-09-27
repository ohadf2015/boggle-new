/**
 * Tests for the Reveal primitive.
 *
 * Reveal is a CSS-based entrance animation used in place of framer-motion
 * `m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}` inside modals/popups.
 *
 * The regression it guards against: popups (especially in Hebrew, where the large
 * translation bundle can starve the main thread) rendered only the dark backdrop
 * because their content was wrapped in JS-driven framer-motion reveals that never
 * advanced past their invisible `initial` state. CSS animations run off the main
 * thread and always settle to the natural (visible) resting state, so content can
 * never get stuck invisible.
 *
 * Given-When-Then style.
 */

import { vi } from 'vitest';
// Use the REAL framer-motion in this file so the contrast test below faithfully
// reproduces the production bug (the global mock ignores `initial`).
vi.unmock('framer-motion');

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { LazyMotion, domMax, m } from 'framer-motion';
import { Reveal } from '../Reveal';

describe('Reveal', () => {
  it('renders its children (content is present)', () => {
    // Given a Reveal wrapping content
    render(<Reveal>Hello world</Reveal>);
    // Then the content is in the document
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('uses a CSS entrance animation so content always settles visible', () => {
    // Given a Reveal
    render(<Reveal data-testid="r">content</Reveal>);
    const el = screen.getByTestId('r');
    // Then it relies on tailwindcss-animate (CSS, off-main-thread), not JS opacity
    expect(el).toHaveClass('animate-in');
    expect(el).toHaveClass('fade-in-0');
  });

  it('never hides content with an inline opacity:0 (the bug being fixed)', () => {
    // Given a Reveal
    render(<Reveal data-testid="r">content</Reveal>);
    const el = screen.getByTestId('r');
    // Then there is no inline style pinning it invisible
    expect(el.style.opacity).not.toBe('0');
  });

  it('forwards a custom className alongside the entrance classes', () => {
    render(<Reveal data-testid="r" className="space-y-3 mb-4">content</Reveal>);
    const el = screen.getByTestId('r');
    expect(el).toHaveClass('space-y-3');
    expect(el).toHaveClass('mb-4');
    expect(el).toHaveClass('animate-in');
  });

  it('can render as a different element via the `as` prop', () => {
    render(
      <ul>
        <Reveal as="li" data-testid="item">list item</Reveal>
      </ul>
    );
    const el = screen.getByTestId('item');
    expect(el.tagName).toBe('LI');
    expect(el).toHaveClass('animate-in');
  });

  it('forwards arbitrary props (e.g. role, onClick) to the element', () => {
    const onClick = vi.fn();
    render(<Reveal data-testid="r" role="status" onClick={onClick}>content</Reveal>);
    const el = screen.getByTestId('r');
    expect(el).toHaveAttribute('role', 'status');
    el.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

/**
 * Regression: the empty-popup bug.
 *
 * When framer-motion's JS animation loop does not advance (which happens when the
 * main thread is starved — e.g. parsing the large Hebrew translation bundle — and
 * is simulated here by jsdom never driving the animation clock), an
 * `m.div initial={{ opacity: 0 }}` stays pinned at opacity:0. Popups built that
 * way render only the dark backdrop. Reveal (CSS) never has this failure mode.
 */
describe('Reveal — regression vs framer-motion JS reveal', () => {
  it('framer-motion m.div stays stuck at opacity:0 when the loop never runs', async () => {
    const r = render(
      <LazyMotion features={domMax}>
        <m.div
          data-testid="fm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          content
        </m.div>
      </LazyMotion>
    );
    await act(async () => { await new Promise((res) => setTimeout(res, 60)); });
    // Documents the bug: JS-driven content stays invisible while the loop is not
    // advancing (here, the delayed start never fires because jsdom does not drive
    // the animation clock — the same outcome as a starved main thread).
    expect(r.getByTestId('fm').style.opacity).toBe('0');
  });

  it('Reveal does NOT pin content invisible under the same conditions', async () => {
    const r = render(<Reveal data-testid="rv">content</Reveal>);
    await act(async () => { await new Promise((res) => setTimeout(res, 60)); });
    // The fix: CSS reveal leaves no inline opacity:0; content is visible.
    expect(r.getByTestId('rv').style.opacity).not.toBe('0');
  });
});

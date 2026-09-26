import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderHook, cleanup } from '@testing-library/react';
import { useRoundToastLane, ROUND_TOAST_LANE_CLASS } from '../useRoundToastLane';

const css = readFileSync(resolve(__dirname, '../round.module.css'), 'utf8');
const html = () => document.documentElement;

describe('useRoundToastLane — global toasts never sit over the round HUD', () => {
  afterEach(() => cleanup());

  it('Given a round view mounts, Then the page carries the round toast-lane class; unmount removes it', () => {
    expect(html().classList.contains(ROUND_TOAST_LANE_CLASS)).toBe(false);
    const { unmount } = renderHook(() => useRoundToastLane());
    expect(html().classList.contains(ROUND_TOAST_LANE_CLASS)).toBe(true);
    unmount();
    expect(html().classList.contains(ROUND_TOAST_LANE_CLASS)).toBe(false);
  });

  it('Given two round surfaces mounted (host view + a remount), When one unmounts, Then the lane stays until the last one leaves', () => {
    const a = renderHook(() => useRoundToastLane());
    const b = renderHook(() => useRoundToastLane());
    a.unmount();
    expect(html().classList.contains(ROUND_TOAST_LANE_CLASS)).toBe(true);
    b.unmount();
    expect(html().classList.contains(ROUND_TOAST_LANE_CLASS)).toBe(false);
  });

  it('the lane hides the shared achievement capsule during the round (results list the unlock; the shared toaster is untouched)', () => {
    expect(css).toMatch(
      new RegExp(`\\.${ROUND_TOAST_LANE_CLASS}\\s+:global\\(\\[data-testid='achievement-inline-toast'\\]\\)\\s*\\{[^}]*display:\\s*none`),
    );
  });

  it('the lane moves react-hot-toast off the HUD row (its inline top is overridden), phone and desktop', () => {
    const rules = css.match(new RegExp(`\\.${ROUND_TOAST_LANE_CLASS}\\s+:global\\(\\[data-rht-toaster\\]\\)\\s*\\{[^}]*\\}`, 'g')) ?? [];
    // phone rule + desktop rule
    expect(rules.length).toBeGreaterThanOrEqual(2);
    for (const r of rules) expect(r).toMatch(/top:[^;]*!important/);
    // desktop: bottom of the start rail, never centred over the board
    expect(css).toMatch(/@media \(min-width: 1024px\)[\s\S]*data-rht-toaster[\s\S]*inset-inline-end:\s*auto\s*!important/);
  });
});

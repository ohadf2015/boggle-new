/**
 * Live Vocab Quiz — the answer tiles have to READ as controls.
 *
 * User feedback on this gauntlet was that buttons blend into the background,
 * and these four tiles are the only tappable thing on a student's screen. Two
 * defects were live before this file existed, and neither was visible to any
 * behavioural test:
 *
 * 1. `animate-neo-press` is `neo-press 0.1s ease-out forwards`, and its 100%
 *    keyframe is `translate(1px,1px)` + `var(--shadow-pressed)` (1px). Applied
 *    unconditionally it fires once on mount and the `forwards` fill HOLDS —
 *    so every enabled tile settled into the pressed state and lost the hard
 *    shadow that makes it read as a raised control. The real press feedback is
 *    already on `active:`, where it belongs.
 * 2. White text on the brand fills fails WCAG AA: `#ff1493` is 3.64:1 and
 *    `#8b5cf6` is 4.24:1, both under 4.5. Worse, a revealed distractor stacked
 *    `text-neo-white/70` on `opacity-60` over a light muted fill — around
 *    1.7:1, effectively unreadable.
 *
 * Asserting on class names rather than computed colour is deliberate: jsdom
 * resolves neither Tailwind utilities nor CSS custom properties, so a computed
 * -style assertion here would pass against any value and prove nothing (the
 * vacuous-assertion trap from the project's own memory). The real colour maths
 * runs against the live page via /tmp/edu-gauntlet2/contrast-check.js.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VocabQuizAnswerGrid } from '../VocabQuizAnswerGrid';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const CHOICES = ['abandon', 'brittle', 'candid', 'dwindle'];

function setup(overrides: Partial<Parameters<typeof VocabQuizAnswerGrid>[0]> = {}) {
  render(
    <VocabQuizAnswerGrid
      choices={CHOICES}
      selectedIndex={null}
      correctIndex={null}
      disabled={false}
      onSelect={vi.fn()}
      t={t}
      {...overrides}
    />
  );
  return CHOICES.map((choice) => screen.getByRole('button', { name: new RegExp(choice) }));
}

describe('VocabQuizAnswerGrid — reads as a control', () => {
  it('leaves every enabled tile in its raised resting state', () => {
    for (const tile of setup()) {
      // `forwards` on a keyframe that ENDS pressed is a resting state, not an
      // animation — it would flatten the hard shadow on all four tiles.
      expect(tile.className).not.toContain('animate-neo-press');
      expect(tile.className).toContain('shadow-[0_6px_0_0]');
    }
  });

  it('draws one light neutral lip on every resting tile, since a black lip vanishes on the navy', () => {
    const tiles = setup();
    ['lime', 'pink', 'cyan', 'purple'].forEach((family, i) => {
      expect(tiles[i].className).toContain('shadow-neo-white/15');
      expect(tiles[i].className).not.toContain(`shadow-neo-${family}-muted`);
    });
  });

  it('keeps the press as a press — on :active, not on mount', () => {
    for (const tile of setup()) {
      expect(tile.className).toContain('active:translate-y-[6px]');
      expect(tile.className).toContain('active:shadow-none');
    }
  });

  it('tints a card under the finger, since a phone never hovers', () => {
    const tiles = setup();
    ['lime', 'pink', 'cyan', 'purple'].forEach((family, i) => {
      expect(tiles[i].className).toContain(`active:bg-neo-${family}/20`);
    });
  });

  it('puts white ink on every resting dark card', () => {
    for (const tile of setup()) {
      expect(tile.className).toContain('bg-neo-navy-elevated');
      expect(tile.className).toContain('text-neo-white');
    }
  });

  it('fills the answer card green whatever its colour family, with black ink', () => {
    const tiles = setup({ correctIndex: 3, selectedIndex: 3 });
    expect(tiles[3].className).toMatch(/(^|\s)bg-neo-lime(\s|$)/);
    expect(tiles[3].className).not.toMatch(/(^|\s)bg-neo-purple(\s|$)/);
    expect(tiles[3].className).toContain('text-neo-black');
    expect(tiles[3].className).not.toContain('text-neo-white');
  });

  it('keeps white ink on a picked card, whose 20% wash leaves the navy dark', () => {
    const tiles = setup({ selectedIndex: 3 });
    expect(tiles[3].className).not.toMatch(/(^|\s)bg-neo-purple(\s|$)/);
    expect(tiles[3].className).toContain('bg-neo-navy-elevated');
    expect(tiles[3].className).toContain('text-neo-white');
  });

  it('keeps a revealed distractor legible instead of dimming it into the navy', () => {
    const distractor = setup({ correctIndex: 0, selectedIndex: 1 })[3];
    // Stacked transparency took the old distractor text to ~1.7:1; one 70% white on the navy stays above 7:1.
    expect(distractor.className).not.toContain('opacity-60');
    expect(distractor.className).toContain('text-neo-white/70');
    expect(distractor.className).toMatch(/border-neo-white\/25/);
  });

  it('marks a wrong pick in red, not in its own family colour', () => {
    const tiles = setup({ correctIndex: 0, selectedIndex: 1 });
    expect(tiles[1].className).toContain('border-neo-red');
    expect(tiles[1].className).not.toMatch(/(^|\s)border-neo-pink(\s|$)/);
  });

  it('dims every tile but the pick once the clock runs out, before the answer is known', () => {
    const tiles = setup({ selectedIndex: 2, frozen: true, disabled: true });
    [0, 1, 3].forEach((i) => expect(tiles[i].dataset.dim).toBe('true'));
    expect(tiles[2].dataset.dim).toBeUndefined();
  });

  it('still tells the answer apart from the rest after the reveal', () => {
    const tiles = setup({ correctIndex: 0, selectedIndex: 1 });
    expect(tiles[0].className).toMatch(/(^|\s)bg-neo-lime(\s|$)/);
    expect(tiles[3].className).not.toMatch(/(^|\s)bg-neo-purple(\s|$)/);
  });
});

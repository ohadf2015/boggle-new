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
      expect(tile.className).toContain('shadow-hard');
    }
  });

  it('keeps the press as a press — on :active, not on mount', () => {
    for (const tile of setup()) {
      expect(tile.className).toContain('active:translate-y-[2px]');
      expect(tile.className).toContain('active:shadow-hard-sm');
    }
  });

  it('puts black text on every bright fill, where white would fail AA', () => {
    // #bfff00, #ff1493, #00ffff, #8b5cf6 — pink and purple are 3.64:1 and
    // 4.24:1 against white, so the whole set goes black for one readable rule.
    for (const tile of setup()) {
      expect(tile.className).toContain('text-neo-black');
      expect(tile.className).not.toContain('text-neo-white');
    }
  });

  it('keeps a revealed distractor legible instead of dimming it into the navy', () => {
    // Index 3 is neither the answer (0) nor this student's pick (1).
    const distractor = setup({ correctIndex: 0, selectedIndex: 1 })[3];
    expect(distractor.className).toContain('bg-neo-purple-muted');
    // The muted fill IS the fade. Stacking transparency on top of it is what
    // took the text to ~1.7:1 on the lighter three families.
    expect(distractor.className).not.toContain('opacity-60');
    expect(distractor.className).not.toContain('text-neo-white/70');
  });

  // The one family whose two fills want different ink. #8b5cf6 takes black at
  // 4.96:1, but its muted twin #7c4fcc drops black to 3.85:1 while lifting
  // white to 5.46:1. A single per-family text colour therefore cannot be right
  // for both states — measured in the live page, not guessed.
  //
  // Two cases, two tests, on purpose: `setup()` renders, and Testing Library
  // only tears down BETWEEN tests. Calling it twice inside one `it` left two
  // grids in the document and every `getByRole` after the second call threw
  // "found multiple elements" — a red test that was reporting nothing about
  // the component.
  it('puts black ink on the purple tile at full strength', () => {
    const [, , , basePurple] = setup();
    expect(basePurple.className).toContain('text-neo-black');
  });

  it('flips the purple tile to white ink when it dims, because black stops clearing AA', () => {
    const dimPurple = setup({ correctIndex: 0, selectedIndex: 1 })[3];
    expect(dimPurple.className).toContain('text-neo-white');
    expect(dimPurple.className).not.toContain('text-neo-black');
  });

  it('still tells the answer apart from the rest after the reveal', () => {
    const tiles = setup({ correctIndex: 0, selectedIndex: 1 });
    // Fill, not just a glyph: the answer keeps its full-strength colour while
    // every non-answer drops to the muted one.
    expect(tiles[0].className).toContain('bg-neo-lime');
    expect(tiles[0].className).not.toContain('bg-neo-lime-muted');
    expect(tiles[3].className).toContain('bg-neo-purple-muted');
  });
});

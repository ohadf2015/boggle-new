/**
 * @vitest-environment jsdom
 *
 * RED first — the SPELL round has to fill the phone the way the meaning round
 * now does.
 *
 * Measured live at 390x844 (2026-09-12, mirror :3011, screenshot
 * `/tmp/hw-r6/flow-03c-round-spell-390.png`): the slots-plus-tiles block is a
 * content-sized `flex flex-col gap-3` centred inside the round's `flex-1`
 * region, so a five-letter word rendered ~230px of empty navy above the slots
 * and ~230px more under the letter tiles — roughly 55% of the play area was
 * bare. The meaning round next to it fills the same screen with four fat
 * tiles, so the two halves of the same loop do not read as the same game.
 *
 * The fix is the same mechanism the meaning round uses: claim the leftover
 * height instead of hugging the content, and push the letter tiles to the
 * BOTTOM of that space where a thumb already is, with the slots held at the
 * top under the word. jsdom has no layout engine, so this pins the mechanism
 * (the flex contract and the tile size), not the pixel count.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MissGapRoundView } from '../MissGapRoundView';
import type { MissGapRound } from '@/lib/education/missGapQuiz';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (key: string) => key }),
}));

const spellRound: MissGapRound = {
  id: 's1',
  kind: 'spell',
  word: 'gleam',
  hint: 'to shine with a soft light',
  seconds: 25,
  tiles: ['U', 'G', 'M', 'A', 'Y', 'E', 'L', 'W'],
  choices: [],
};

function renderSpell() {
  return render(
    <MissGapRoundView
      round={spellRound}
      secondsLeft={25}
      outcome={null}
      pickedLabel={null}
      onAnswer={vi.fn()}
      onTapFeedback={vi.fn()}
    />,
  );
}

describe('MissGapRoundView — the spell round fills the play area', () => {
  it('claims the leftover height instead of floating its two rows mid-screen', () => {
    renderSpell();
    const block = screen.getByTestId('miss-gap-spell-block');
    expect(block.className).toContain('flex-1');
    expect(block.className).toContain('min-h-0');
    // Slots stay under the word, tiles drop to the thumb — not both centred.
    expect(block.className).toContain('justify-between');
  });

  it('gives the letter tiles a thumb-sized face', () => {
    renderSpell();
    const tiles = screen.getAllByTestId('miss-gap-letter-tile');
    expect(tiles).toHaveLength(8);
    for (const tile of tiles) {
      expect(tile.className).toContain('h-14');
      expect(tile.className).toContain('w-14');
    }
  });

  it('keeps one slot per letter of the answer', () => {
    renderSpell();
    const slots = screen.getByTestId('miss-gap-spell-slots');
    expect(slots.children).toHaveLength('gleam'.length);
  });
});

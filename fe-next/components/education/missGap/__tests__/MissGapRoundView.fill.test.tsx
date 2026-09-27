/**
 * @vitest-environment jsdom
 *
 * RED first — the answer stack has to CLAIM the leftover height.
 *
 * Measured live at 390x844 (2026-09-12, :3011): the four answer tiles were
 * `py-3.5` intrinsic-height boxes centred inside a `flex-1` region, so a real
 * phone round rendered ~200px of empty navy between the word and the first tile
 * and ~180px more under the last one. Blooket's four fat rectangles fill the
 * screen; ours floated in the middle of it, which is the one place our loop
 * looked less finished than the bar.
 *
 * jsdom has no layout, so what this pins is the mechanism rather than the pixel
 * count: the list is a flex column that takes the leftover space and every
 * answer is a flex item that shares it, with a floor so a one-line answer on a
 * short screen never collapses below a thumb target.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MissGapRoundView } from '../MissGapRoundView';
import type { MissGapRound } from '@/lib/education/missGapQuiz';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (key: string) => key }),
}));

const round: MissGapRound = {
  id: 'r1',
  kind: 'meaning',
  word: 'neutron',
  hint: '',
  seconds: 20,
  tiles: [],
  choices: [
    { id: 'c1', label: 'a particle with no charge', correct: true },
    { id: 'c2', label: 'a building block of protons', correct: false },
    { id: 'c3', label: 'a particle of light', correct: false },
    { id: 'c4', label: 'a light particle like an electron', correct: false },
  ],
};

function renderRound() {
  return render(
    <MissGapRoundView
      round={round}
      secondsLeft={20}
      outcome={null}
      pickedLabel={null}
      onAnswer={vi.fn()}
      onTapFeedback={vi.fn()}
    />,
  );
}

describe('MissGapRoundView — the answers fill the round', () => {
  it('lets the answer list take the leftover height instead of hugging its text', () => {
    const { container } = renderRound();
    const list = container.querySelector('ul');
    expect(list).toBeTruthy();
    expect(list!.className).toContain('flex-1');
    expect(list!.className).toContain('min-h-0');
  });

  it('shares that height between the answers, with a thumb-sized floor', () => {
    const { container } = renderRound();
    const items = [...container.querySelectorAll('li')];
    expect(items).toHaveLength(4);
    for (const li of items) {
      expect(li.className).toContain('flex-1');
      expect(li.className).toContain('min-h-[3.25rem]');
    }
  });

  it('stretches each tile to its share rather than leaving a gap under it', () => {
    renderRound();
    for (const button of screen.getAllByTestId('miss-gap-choice')) {
      expect(button.className).toContain('h-full');
    }
  });

  it('stretches the desktop columns too, so 1440 is not four tiles floating mid-screen', () => {
    renderRound();
    // `lg:items-center` sized the answers column to its content, so the same
    // gap the phone just lost reappeared at 1440x900 — measured there with the
    // tiles occupying 240px of a 790px body. Stretch the row; centre the WORD
    // inside its own half instead.
    const body = screen.getByTestId('miss-gap-round-body');
    expect(body.className).toContain('lg:items-stretch');
    expect(body.className).not.toContain('lg:items-center');
    expect(screen.getByTestId('miss-gap-round-prompt').parentElement!.className).toContain(
      'lg:justify-center',
    );
  });
});

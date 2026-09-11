/**
 * Live Vocab Quiz — every border the quiz draws must actually have a WIDTH.
 *
 * The repo's `cn()` is `twMerge(clsx(...))`, and tailwind-merge files the
 * shorthand width utility `border-neo` in the same class group as the colour
 * utility `border-neo-black`. So inside a `cn()` call the two collide and the
 * LAST one wins:
 *
 *   twMerge('rounded-neo border-neo border-neo-black') === 'rounded-neo border-neo-black'
 *
 * `border-neo-black` sets `border-color` only, and Tailwind's preflight has
 * already set `border-width: 0` — so the control renders with no border at all.
 * That is the verified root cause behind "buttons and options blend into the
 * background" on this gauntlet: the four answer tiles, the timer bar, the
 * reveal strip and the projector's option bars all lost their hard edge against
 * the navy without a single test noticing.
 *
 * The invariant asserted here is deliberately not "this file uses
 * `border-[2px]`" — that is a spelling, and spellings get refactored. It is:
 * anything that asks for a border COLOUR must also carry a border WIDTH in its
 * final, post-merge class list. That holds whether the width is written as the
 * shorthand (safe outside `cn()`), as an arbitrary value, or as a Tailwind
 * numeric — and it fails the moment a merge eats one.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { VocabQuizAnswerGrid } from '../VocabQuizAnswerGrid';
import { VocabQuizChoiceBars } from '../VocabQuizChoiceBars';
import { VocabQuizRevealBanner } from '../VocabQuizRevealBanner';
import { VocabQuizNextUp } from '../VocabQuizNextUp';
import { VocabQuizScoreCounter } from '../VocabQuizScoreCounter';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const CHOICES = ['abandon', 'brittle', 'candid', 'dwindle'];

/** Any class that gives an element a real border-width. */
const WIDTH = /^border(-neo(-thick)?|-\[[^\]]+\]|-\d+|-[xytrbles]-\d+)?$/;
/** `border-neo-<colour>` — colour only, zero width of its own. */
const COLOUR = /^border-neo-(black|white|cream|navy|lime|pink|cyan|purple|yellow|orange|red|gray)(-.*)?$/;

function borderlessColourClasses(container: HTMLElement): string[] {
  const offenders: string[] = [];
  for (const el of Array.from(container.querySelectorAll<HTMLElement>('*'))) {
    const classes = Array.from(el.classList);
    if (!classes.some((c) => COLOUR.test(c))) continue;
    if (classes.some((c) => WIDTH.test(c))) continue;
    offenders.push(`<${el.tagName.toLowerCase()} class="${el.className}">`);
  }
  return offenders;
}

describe('Vocab Quiz borders survive the cn() merge', () => {
  it('gives every answer tile a border width, not just a border colour', () => {
    const { container } = render(
      <VocabQuizAnswerGrid
        choices={CHOICES}
        selectedIndex={null}
        correctIndex={null}
        disabled={false}
        onSelect={vi.fn()}
        t={t}
      />
    );
    expect(borderlessColourClasses(container)).toEqual([]);
  });

  it('keeps the projector option bars edged against the navy', () => {
    const { container } = render(
      <VocabQuizChoiceBars
        choices={CHOICES}
        distribution={[3, 1, 0, 0]}
        totalPlayers={4}
        answerIndex={0}
        sweep
        t={t}
      />
    );
    expect(borderlessColourClasses(container)).toEqual([]);
  });

  it('keeps the student reveal strip edged', () => {
    const { container } = render(
      <VocabQuizRevealBanner correct={false} answer="candid" word="candid" definition="frank" sweep t={t} />
    );
    expect(borderlessColourClasses(container)).toEqual([]);
  });

  it('keeps the between-questions countdown edged', () => {
    const { container } = render(
      <VocabQuizNextUp secondsLeft={3} hint={{ letter: 'B', length: 7 }} isLast={false} t={t} />
    );
    expect(borderlessColourClasses(container)).toEqual([]);
  });

  it('keeps the flying +points chip edged', () => {
    const { container } = render(
      <VocabQuizScoreCounter score={430} pop={{ points: 130, key: 2 }} t={t} />
    );
    expect(borderlessColourClasses(container)).toEqual([]);
  });
});

/**
 * Live Vocab Quiz — the projector's two payoff surfaces (RED first).
 *
 * `VocabQuizChoiceBars` is the thing the back of the room watches: bars that
 * fill AS students lock in, then settle into the answer. `VocabQuizNextUp` is
 * the beat between questions — a 3-2-1 that teases the next word instead of
 * three dead seconds of standings.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VocabQuizChoiceBars } from '../VocabQuizChoiceBars';
import { VocabQuizNextUp } from '../VocabQuizNextUp';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const CHOICES = ['to leave behind', 'hard but breakable', 'honest and direct', 'to shrink'];

const width = (testId: string) =>
  (screen.getByTestId(testId) as HTMLElement).style.width;

describe('VocabQuizChoiceBars — filling in live', () => {
  it('centres each option inside the height the wall gives it', () => {
    // The bars stretch to fill the projector (`auto-rows-fr`), so a row whose
    // content is not full-height pins its word to the top-left of a 180px
    // block. Measured at 1440x900: four words floating above four empty
    // rectangles. The row owns the bar's height so the word sits in it.
    const { container } = render(
      <VocabQuizChoiceBars choices={CHOICES} distribution={[0, 0, 0, 0]} totalPlayers={4} answerIndex={null} sweep={false} t={t} />
    );
    const rows = container.querySelectorAll('li > div.relative.flex');
    expect(rows.length).toBe(4);
    for (const row of Array.from(rows)) expect(row.className).toContain('h-full');
  });


  it('colour-codes every option before a single vote lands', () => {
    // Captured at 1440x900 on a room that had not answered yet: four near-black
    // rectangles with a 40px chip in the corner, while the same four options on
    // the phone are full-bleed lime/pink/cyan/purple. The bar has to carry its
    // option's colour at zero votes too — that colour is how a student matches
    // the wall to the tile under their thumb.
    render(
      <VocabQuizChoiceBars choices={CHOICES} distribution={[0, 0, 0, 0]} totalPlayers={4} answerIndex={null} sweep={false} t={t} />
    );
    expect(screen.getByTestId('vocab-quiz-rail-0').className).toContain('bg-neo-lime');
    expect(screen.getByTestId('vocab-quiz-rail-1').className).toContain('bg-neo-pink');
    expect(screen.getByTestId('vocab-quiz-rail-2').className).toContain('bg-neo-cyan');
    expect(screen.getByTestId('vocab-quiz-rail-3').className).toContain('bg-neo-purple');
  });

  it('shows empty bars before anyone has committed', () => {
    render(
      <VocabQuizChoiceBars choices={CHOICES} distribution={[0, 0, 0, 0]} totalPlayers={4} answerIndex={null} sweep={false} t={t} />
    );
    expect(width('vocab-quiz-bar-0')).toBe('0%');
    expect(width('vocab-quiz-bar-1')).toBe('0%');
  });

  it('fills each bar against the WHOLE class while the clock runs', () => {
    // Against the class, not against the votes cast: a first vote must not
    // slam one bar to 100% and then shrink as the rest of the room answers.
    render(
      <VocabQuizChoiceBars choices={CHOICES} distribution={[1, 0, 0, 0]} totalPlayers={4} answerIndex={null} sweep={false} t={t} />
    );
    expect(width('vocab-quiz-bar-0')).toBe('25%');
  });

  it('never reveals which choice is right while the clock runs', () => {
    render(
      <VocabQuizChoiceBars choices={CHOICES} distribution={[1, 2, 0, 0]} totalPlayers={4} answerIndex={null} sweep={false} t={t} />
    );
    expect(screen.queryByTestId('vocab-quiz-bar-correct')).toBeNull();
  });

  it('marks the answer and rescales to the votes actually cast at the reveal', () => {
    render(
      <VocabQuizChoiceBars choices={CHOICES} distribution={[1, 3, 0, 0]} totalPlayers={4} answerIndex={1} sweep={false} t={t} />
    );
    expect(screen.getByTestId('vocab-quiz-bar-correct')).toBeInTheDocument();
    expect(width('vocab-quiz-bar-1')).toBe('75%');
  });

  it('calls the sweep out loud when the whole class got it', () => {
    render(
      <VocabQuizChoiceBars choices={CHOICES} distribution={[0, 4, 0, 0]} totalPlayers={4} answerIndex={1} sweep t={t} />
    );
    expect(screen.getByText('vocabQuiz.sweep.title')).toBeInTheDocument();
  });


  it('paints the answer green even when nobody picked it', () => {
    // Captured live at 1440x900 (room XJ5UQN, question 2): every student
    // missed it, so the correct bar was 0% wide and the right answer sat on
    // the wall as a dark navy box distinguishable only by a thin ring. The
    // vote bar must stay honest — zero votes is zero width — so the answer
    // gets its own full-width wash underneath it. The bar states the share;
    // the wash states which one was right.
    render(
      <VocabQuizChoiceBars choices={CHOICES} distribution={[2, 0, 0, 0]} totalPlayers={2} answerIndex={1} sweep={false} t={t} />
    );
    expect(width('vocab-quiz-bar-1')).toBe('0%');
    const wash = screen.getByTestId('vocab-quiz-answer-wash');
    expect(wash.className).toContain('bg-neo-lime');
  });

  it('washes only the answer, never a distractor that swept the room', () => {
    render(
      <VocabQuizChoiceBars choices={CHOICES} distribution={[2, 0, 0, 0]} totalPlayers={2} answerIndex={1} sweep={false} t={t} />
    );
    expect(screen.getAllByTestId('vocab-quiz-answer-wash')).toHaveLength(1);
  });

  it('has no answer wash while the clock is still running', () => {
    render(
      <VocabQuizChoiceBars choices={CHOICES} distribution={[1, 0, 0, 0]} totalPlayers={4} answerIndex={null} sweep={false} t={t} />
    );
    expect(screen.queryByTestId('vocab-quiz-answer-wash')).toBeNull();
  });

  it('has no sweep banner on an ordinary reveal', () => {
    render(
      <VocabQuizChoiceBars choices={CHOICES} distribution={[1, 3, 0, 0]} totalPlayers={4} answerIndex={1} sweep={false} t={t} />
    );
    expect(screen.queryByText('vocabQuiz.sweep.title')).toBeNull();
  });
});

describe('VocabQuizNextUp — the 3-2-1', () => {
  it('counts the seconds the class is actually waiting', () => {
    render(<VocabQuizNextUp secondsLeft={2} hint={{ letter: 'B', length: 7 }} isLast={false} t={t} />);
    expect(screen.getByTestId('vocab-quiz-next-count')).toHaveTextContent('2');
  });

  it('teases the next word: its initial and how long it runs', () => {
    render(<VocabQuizNextUp secondsLeft={3} hint={{ letter: 'B', length: 7 }} isLast={false} t={t} />);
    const tease = screen.getByTestId('vocab-quiz-next-tease');
    expect(tease).toHaveTextContent('B');
    // Six blanks after the initial — the class can count the letters.
    expect(tease.querySelectorAll('[data-blank]')).toHaveLength(6);
  });

  it('promises final scores instead of a word on the last question', () => {
    render(<VocabQuizNextUp secondsLeft={2} hint={null} isLast t={t} />);
    expect(screen.getByText('vocabQuiz.nextUp.finalScores')).toBeInTheDocument();
    expect(screen.queryByTestId('vocab-quiz-next-tease')).toBeNull();
  });

  it('renders nothing once the countdown is spent', () => {
    const { container } = render(
      <VocabQuizNextUp secondsLeft={0} hint={{ letter: 'B', length: 7 }} isLast={false} t={t} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});

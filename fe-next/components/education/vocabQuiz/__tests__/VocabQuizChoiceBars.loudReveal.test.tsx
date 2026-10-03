import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VocabQuizChoiceBars } from '../VocabQuizChoiceBars';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const CHOICES = ['abandon', 'brittle', 'candid', 'dwindle'];

function reveal(distribution = [1, 3, 0, 1], totalPlayers = 5) {
  render(
    <VocabQuizChoiceBars choices={CHOICES} distribution={distribution} totalPlayers={totalPlayers} answerIndex={1} sweep={false} t={t} />
  );
}

describe('VocabQuizChoiceBars — the answer lands loud on the projector', () => {
  it('floods the right answer in solid lime, not a 25% tint', () => {
    reveal();
    const wash = screen.getByTestId('vocab-quiz-answer-wash');
    expect(wash.className).toContain('bg-neo-lime');
    expect(wash.className).not.toMatch(/\bopacity-\d+/);
  });

  it('inks the right answer black so it reads on the lime', () => {
    reveal();
    expect(screen.getByText('brittle').className).toContain('text-neo-black');
  });

  it('calls out how much of the class got it', () => {
    reveal();
    expect(screen.getByTestId('vocab-quiz-class-verdict')).toHaveTextContent('eg2Modes.reveal.classGotIt:3,5');
  });

  it('says nothing about the class while the clock runs', () => {
    render(
      <VocabQuizChoiceBars choices={CHOICES} distribution={[1, 0, 0, 0]} totalPlayers={5} answerIndex={null} sweep={false} t={t} />
    );
    expect(screen.queryByTestId('vocab-quiz-class-verdict')).toBeNull();
  });
});

describe('VocabQuizChoiceBars — one headline at a time', () => {
  it('lets CLEAN SWEEP speak alone instead of stacking a class count under it', () => {
    render(
      <VocabQuizChoiceBars choices={CHOICES} distribution={[0, 4, 0, 0]} totalPlayers={4} answerIndex={1} sweep t={t} />
    );
    expect(screen.getByText('vocabQuiz.sweep.title')).toBeInTheDocument();
    expect(screen.queryByTestId('vocab-quiz-class-verdict')).toBeNull();
  });
});

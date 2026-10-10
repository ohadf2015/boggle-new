import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HuntPlayfield } from '../HuntPlayfield';
import { initialHuntStage, type HuntStageState } from '../huntStage';
import type { LetterGrid } from '@/types';

const grid = [['C', 'A'], ['T', 'S']] as unknown as LetterGrid;
const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }];

function field(stage: HuntStageState, extra: Partial<React.ComponentProps<typeof HuntPlayfield>> = {}) {
  return render(
    <HuntPlayfield
      grid={grid}
      isGameOver={false}
      eliminatedLetters={new Set()}
      onWordSubmit={() => {}}
      onWordChange={() => {}}
      stage={stage}
      onLive={() => {}}
      onRelease={() => {}}
      typedWord=""
      feedbackType={null}
      feedbackMessage=""
      discoveredWords={[]}
      calm={false}
      t={(k: string) => k}
      {...extra}
    />,
  );
}

describe('HuntPlayfield', () => {
  it('pays the life won by the released word on the stage and the board', () => {
    field(
      { phase: 'verdict', verdict: 'good', word: 'CAT', path, releaseSeq: 0 },
      { feedbackType: 'valid-word', discoveredWords: [{ word: 'CAT', lifeGained: 12, tokensGained: 0, timestamp: 1 }] },
    );
    expect(screen.getByTestId('hunt-stage-points').textContent).toContain('+12');
    expect(screen.getByTestId('hunt-board-bubble').textContent).toBe('+12');
  });

  it('pays the coins won by the released word next to the life', () => {
    field(
      { phase: 'verdict', verdict: 'good', word: 'CAT', path, releaseSeq: 0 },
      { feedbackType: 'valid-word', discoveredWords: [{ word: 'CAT', lifeGained: 12, tokensGained: 4, timestamp: 1 }] },
    );
    expect(screen.getByTestId('hunt-stage-coins').textContent).toContain('+4');
  });

  it('leaves the coin chip out when the word paid no coins', () => {
    field(
      { phase: 'verdict', verdict: 'good', word: 'CAT', path, releaseSeq: 0 },
      { feedbackType: 'valid-word', discoveredWords: [{ word: 'CAT', lifeGained: 12, tokensGained: 0, timestamp: 1 }] },
    );
    expect(screen.queryByTestId('hunt-stage-coins')).toBeNull();
  });

  it('shows the life penalty for a non-word', () => {
    field(
      { phase: 'verdict', verdict: 'bad', word: 'CTA', path, releaseSeq: 0 },
      { feedbackType: 'not-in-dictionary', feedbackMessage: 'Not a word -4' },
    );
    expect(screen.getByTestId('hunt-board-bubble').textContent).toBe('−4');
    expect(screen.getByText('Not a word -4')).toBeTruthy();
  });

  it('spells a typed word on the stage', () => {
    field(initialHuntStage, { typedWord: 'CATS' });
    expect(screen.getByTestId('hunt-live-word').textContent).toBe('CATS');
  });
});

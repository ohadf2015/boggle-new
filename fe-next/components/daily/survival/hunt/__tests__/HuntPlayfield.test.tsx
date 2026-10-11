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
      feedbackMessage=""
      discoveredWords={[]}
      calm={false}
      t={(k: string) => k}
      {...extra}
    />,
  );
}

describe('HuntPlayfield', () => {
  it('pays the life won by the released word once, on the stage only', () => {
    field(
      { phase: 'verdict', verdict: 'good', word: 'CAT', path, releaseSeq: 0 },
      { discoveredWords: [{ word: 'CAT', lifeGained: 12, tokensGained: 0, timestamp: 1 }] },
    );
    expect(screen.getByTestId('hunt-stage-points').textContent).toContain('+12');
    expect(screen.queryByTestId('hunt-board-bubble')).toBeNull();
  });

  it('pays the coins won by the released word next to the life', () => {
    field(
      { phase: 'verdict', verdict: 'good', word: 'CAT', path, releaseSeq: 0 },
      { discoveredWords: [{ word: 'CAT', lifeGained: 12, tokensGained: 4, timestamp: 1 }] },
    );
    expect(screen.getByTestId('hunt-stage-coins').textContent).toContain('+4');
  });

  it('leaves the coin chip out when the word paid no coins', () => {
    field(
      { phase: 'verdict', verdict: 'good', word: 'CAT', path, releaseSeq: 0 },
      { discoveredWords: [{ word: 'CAT', lifeGained: 12, tokensGained: 0, timestamp: 1 }] },
    );
    expect(screen.queryByTestId('hunt-stage-coins')).toBeNull();
  });

  it('shows the life penalty for a non-word', () => {
    field(
      { phase: 'verdict', verdict: 'bad', word: 'CTA', path, releaseSeq: 0 },
      { feedbackMessage: 'Not a word -4' },
    );
    expect(screen.queryByTestId('hunt-board-bubble')).toBeNull();
    expect(screen.getByText('Not a word -4')).toBeTruthy();
  });

  it('spells a typed word on the stage', () => {
    field(initialHuntStage, { typedWord: 'CATS' });
    expect(screen.getByTestId('hunt-live-word').textContent).toBe('CATS');
  });

  it('typing a new word takes over a word still waiting on its verdict', () => {
    field({ phase: 'pending', verdict: null, word: 'CAT', path, releaseSeq: 0 }, { typedWord: 'TA' });
    expect(screen.getByTestId('hunt-live-word').textContent).toBe('TA');
    expect(screen.getByTestId('hunt-stage').getAttribute('data-phase')).toBe('live');
  });
});

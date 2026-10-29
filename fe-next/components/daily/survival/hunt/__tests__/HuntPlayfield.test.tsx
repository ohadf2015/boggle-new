import React from 'react';
import * as boardSelection from '@/components/board/useBoardSelection';
import { describe, it, expect, vi } from 'vitest';
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
  it('Given the game screen re-renders with the same board props (the once-a-second life drain), Then the board does not render again', () => {
    const spy = vi.spyOn(boardSelection, 'useBoardSelection');
    const props = {
      grid, isGameOver: false, eliminatedLetters: new Set<string>(), onWordSubmit: () => {}, stage: initialHuntStage,
      onLive: () => {}, onRelease: () => {}, typedWord: '', feedbackMessage: '', discoveredWords: [], calm: false,
      t: (k: string) => k,
    };
    const Screen = ({ life }: { life: number }) => (
      <div data-life={life}>
        <HuntPlayfield {...props} />
      </div>
    );
    const { rerender } = render(<Screen life={100} />);
    const before = spy.mock.calls.length;
    rerender(<Screen life={99} />);
    rerender(<Screen life={98} />);
    expect(spy.mock.calls.length).toBe(before);
    spy.mockRestore();
  });

  it('squares the board in the room the stage leaves, sizing both from one stage height, and centres them as a block', () => {
    field(initialHuntStage);
    const root = screen.getByTestId('hunt-playfield');
    expect(root.className).toContain('[container-type:size]');
    expect(root.className).toContain('justify-center');
    const box = screen.getByTestId('hunt-board-box');
    expect(box.contains(screen.getByRole('grid'))).toBe(true);
    expect(box.contains(screen.getByTestId('hunt-stage'))).toBe(false);
    expect(box.className).toContain('w-[min(100cqw,calc(100cqh-var(--hunt-stage-h)))]');
  });

  it('keeps the reward burst anchored on the stage wherever the stage lands', () => {
    field(initialHuntStage, { stageOverlay: <span data-testid="anchor" /> });
    expect(screen.getByTestId('anchor').parentElement!.contains(screen.getByTestId('hunt-stage'))).toBe(true);
  });

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

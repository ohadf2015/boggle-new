import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { stubBoardLayout, drag, release } from '@/components/board/__tests__/boardTestUtils';

vi.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({ checkWord: (w: string) => w === 'cat', isLoaded: true }),
}));
vi.mock('@/hooks/fastValidateWord', () => ({ tryValidateOffline: vi.fn(async () => false) }));
vi.mock('@/components/tutorial/ModeCoach', () => ({ ModeCoach: () => null }));

import { PartyPlay } from '../PartyPlay';
import type { PartyState } from '@/lib/party';

const BOARD = [
  ['c', 'a', 't'],
  ['d', 'o', 'g'],
  ['s', 'u', 'n'],
];

function partyState(): PartyState {
  return {
    setup: { language: 'en', timerSeconds: 60, roundCount: 1, players: [{ name: 'Ann', color: '#f0f', emoji: 'A' }] },
    playerIndex: 0,
    roundIndex: 0,
    board: BOARD,
    currentFound: [],
    currentScore: 0,
  } as unknown as PartyState;
}

let restore: () => void;
beforeEach(() => {
  restore = stubBoardLayout();
});
afterEach(() => restore());

describe('PartyPlay board', () => {
  it('given a party turn, then it plays on the shared letter board', () => {
    const { container } = render(<PartyPlay t={(k) => k} state={partyState()} onSubmitWord={vi.fn()} onTimesUp={vi.fn()} />);
    expect(container.querySelector('[data-board]')).not.toBeNull();
    expect(container.querySelector('[data-party-cell]')).toBeNull();
  });

  it('given a drag across a real word, when released, then the word is submitted as valid', async () => {
    const onSubmitWord = vi.fn();
    const { container } = render(<PartyPlay t={(k) => k} state={partyState()} onSubmitWord={onSubmitWord} onTimesUp={vi.fn()} />);
    drag(container, [[0, 0], [0, 1], [0, 2]]);
    release(container);
    await waitFor(() => expect(onSubmitWord).toHaveBeenCalledWith('cat', true));
  });
});

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';

vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playTileSelectSound: vi.fn(), playStreakMilestoneSound: vi.fn() }) }));
vi.mock('@/hooks/useReducedEffects', () => ({ useReducedEffects: () => [false, vi.fn()] }));
vi.mock('@/lib/education/liveHaptics', () => ({ pulseLive: vi.fn() }));

import { WaitingWarmUp } from '../WaitingWarmUp';
import { useStudyDeck } from '@/lib/education/studyDeckStore';

const t = (k: string) => k;

describe('WaitingWarmUp between rounds: the room deck feeds the spelling tiles', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useStudyDeck.setState({ gameCode: null, cards: [], studied: false, kept: null });
  });

  it('Given the live room sent its word deck, When no words are passed, Then the warm-up spells those words', () => {
    useStudyDeck.getState().setDeck('ROOM1', [{ word: 'cat' }, { word: 'dog' }]);
    render(<WaitingWarmUp username="Maya" t={t} />);
    expect(screen.getByTestId('waiting-warmup')).toHaveAttribute('data-kind', 'spell');
  });

  it('Given the student joined a new room (deck cleared, only an older room kept), Then no old words leak in: it is the name tap game', () => {
    useStudyDeck.getState().setDeck('OLD', [{ word: 'cat' }]);
    act(() => useStudyDeck.getState().clear());
    render(<WaitingWarmUp username="Maya" t={t} />);
    expect(screen.getByTestId('waiting-warmup')).toHaveAttribute('data-kind', 'tap');
  });

  it('Given a deck of kanji-only words, Then it falls back to the name tap game', () => {
    useStudyDeck.getState().setDeck('ROOM2', [{ word: '学校' }, { word: '先生' }]);
    render(<WaitingWarmUp username="Maya" t={t} />);
    expect(screen.getByTestId('waiting-warmup')).toHaveAttribute('data-kind', 'tap');
  });

  it('Given words passed explicitly, Then they win over the room deck', () => {
    useStudyDeck.getState().setDeck('ROOM3', [{ word: 'cat' }]);
    render(<WaitingWarmUp username="Maya" words={['学校']} t={t} />);
    expect(screen.getByTestId('waiting-warmup')).toHaveAttribute('data-kind', 'tap');
  });
});

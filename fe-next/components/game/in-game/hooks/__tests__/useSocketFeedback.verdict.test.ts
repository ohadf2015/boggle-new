// @vitest-environment happy-dom
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';

const { announceWordResult, hapticError, tap } = vi.hoisted(() => ({ announceWordResult: vi.fn(), hapticError: vi.fn(), tap: vi.fn() }));
vi.mock('@/components/GameAnnouncer', () => ({ useAnnouncer: () => ({ announceWordResult }) }));
vi.mock('@/utils/haptics', () => ({ hapticError, hapticWordAccepted: vi.fn(), hapticForWordScore: tap }));

import { useSocketFeedback } from '../useSocketFeedback';

type Handler = (data: unknown) => void;
function setup() {
  const handlers: Record<string, Handler> = {};
  const socket = { on: (e: string, h: Handler) => { handlers[e] = h; }, off: vi.fn(), emit: vi.fn() };
  const setCurrentFeedback = vi.fn();
  const playWordRejectedSound = vi.fn();
  const t = (k: string, p?: Record<string, string | number>) => `${k}${p ? JSON.stringify(p) : ''}`;
  const hook = renderHook(({ isPlaying }) => useSocketFeedback({
    socket: socket as never, isPlaying, t: t as never, setCurrentFeedback, setLastWordFoundTime: vi.fn(),
    playWordAcceptedSound: vi.fn(), playWordRejectedSound,
  }), { initialProps: { isPlaying: true } });
  const last = () => setCurrentFeedback.mock.calls.at(-1)?.[0];
  return { handlers, last, playWordRejectedSound, setCurrentFeedback, rerender: hook.rerender };
}

describe('useSocketFeedback — shared word verdicts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps each server reason onto one verdict message and announces it', () => {
    const { handlers, last } = setup();
    handlers.wordRejected({ word: 'ANUAL', reason: 'not_in_dictionary' });
    expect(last()).toMatchObject({ type: 'rejected', message: 'wordVerdict.notAWord', durationMs: 1600, announced: true });
    expect(announceWordResult).toHaveBeenCalledWith('ANUAL', false, undefined, 'wordVerdict.notAWord');
    handlers.wordRejected({ word: 'ANUAL', reason: 'invalid_shape' });
    expect(last().message).toBe('wordVerdict.notAWordAgain');
    handlers.wordNotOnBoard({ word: 'QZX' });
    expect(last().message).toBe('wordVerdict.notOnBoard');
  });

  it('names the minimum length the server enforces', () => {
    const { handlers, last } = setup();
    handlers.wordTooShort({ word: 'AT', minLength: 4 });
    expect(last().message).toBe('wordVerdict.tooShort{"min":4}');
  });

  it('keeps the buzz for a duplicate, and the pill type each event used before', () => {
    const { handlers, last, playWordRejectedSound } = setup();
    handlers.wordRejected({ word: 'CAT', reason: 'duplicate' });
    expect(last()).toMatchObject({ type: 'rejected', message: 'wordVerdict.alreadyFound' });
    expect(playWordRejectedSound).toHaveBeenCalledTimes(1);
    expect(hapticError).toHaveBeenCalledTimes(1);
    handlers.wordAlreadyFound({ word: 'DOG' });
    expect(last()).toMatchObject({ type: 'duplicate', message: 'wordVerdict.alreadyFound' });
  });

  it('never calls a server problem "not in our dictionary"', () => {
    const { handlers, last, setCurrentFeedback, playWordRejectedSound } = setup();
    handlers.wordRejected({ word: 'CAT', reason: 'error' });
    expect(last().message).toBe('wordVerdict.cantCheck');
    handlers.wordRejected({ word: 'CAT', reason: 'inappropriate' });
    expect(last().message).toBe('wordVerdict.inappropriate');
    handlers.wordRejected({ word: 'CAT', reason: 'frozen' });
    expect(last().message).toBe('classroomBoss.frozenRejected');
    playWordRejectedSound.mockClear();
    handlers.wordRejected({ word: 'CAT', reason: 'rate_limited' });
    expect(last()).toMatchObject({ type: 'duplicate', message: 'playerView.slowDown' });
    expect(playWordRejectedSound).not.toHaveBeenCalled();
    const calls = setCurrentFeedback.mock.calls.length;
    handlers.wordRejected({ word: 'CAT', reason: 'paused' });
    expect(setCurrentFeedback.mock.calls.length).toBe(calls);
  });

  it('starts the repeat streak over in a new round', () => {
    const { handlers, last, rerender } = setup();
    handlers.wordRejected({ word: 'ANUAL', reason: 'not_in_dictionary' });
    rerender({ isPlaying: false });
    rerender({ isPlaying: true });
    handlers.wordRejected({ word: 'ANUAL', reason: 'not_in_dictionary' });
    expect(last().message).toBe('wordVerdict.notAWord');
  });

  it('keeps a classroom-boss freeze as its own message', () => {
    const { handlers, last } = setup();
    handlers.wordRejected({ word: 'CAT', reason: 'boss_frozen' });
    expect(last().message).toBe('classroomBoss.frozenRejected');
    expect(hapticError).toHaveBeenCalled();
  });
});

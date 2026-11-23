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
  renderHook(() => useSocketFeedback({
    socket: socket as never, isPlaying: true, t: t as never, setCurrentFeedback, setLastWordFoundTime: vi.fn(),
    playWordAcceptedSound: vi.fn(), playWordRejectedSound,
  }));
  const last = () => setCurrentFeedback.mock.calls.at(-1)?.[0];
  return { handlers, last, playWordRejectedSound };
}

describe('useSocketFeedback — shared word verdicts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps each server reason onto one verdict message and announces it', () => {
    const { handlers, last } = setup();
    handlers.wordRejected({ word: 'ANUAL', reason: 'not_in_dictionary' });
    expect(last()).toMatchObject({ type: 'rejected', message: 'wordVerdict.notAWord', durationMs: 1600 });
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

  it('treats an already-found word as soft: no buzzer, light tap', () => {
    const { handlers, last, playWordRejectedSound } = setup();
    handlers.wordAlreadyFound({ word: 'CAT' });
    expect(last()).toMatchObject({ type: 'duplicate', message: 'wordVerdict.alreadyFound' });
    expect(playWordRejectedSound).not.toHaveBeenCalled();
    expect(tap).toHaveBeenCalled();
  });

  it('keeps a classroom-boss freeze as its own message', () => {
    const { handlers, last } = setup();
    handlers.wordRejected({ word: 'CAT', reason: 'boss_frozen' });
    expect(last().message).toBe('classroomBoss.frozenRejected');
  });
});

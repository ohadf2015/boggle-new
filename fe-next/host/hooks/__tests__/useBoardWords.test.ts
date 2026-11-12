import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Socket } from 'socket.io-client';

const fetchWithAuth = vi.hoisted(() => vi.fn());
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth }));

import { useBoardWords } from '../useBoardWords';

const okCards = (words: string[]) =>
  ({ ok: true, status: 200, json: async () => ({ cards: words.map((word) => ({ word })) }) }) as unknown as Response;

function setup(opts: { lessonWords?: string[]; isClassroomMode: boolean; roomLanguage?: string }) {
  const socket = { emit: vi.fn() } as unknown as Socket & { emit: ReturnType<typeof vi.fn> };
  const setWordsForBoard = vi.fn();
  const hook = renderHook(() =>
    useBoardWords({
      socket,
      gameCode: 'CLS123',
      roomLanguage: (opts.roomLanguage ?? 'en') as never,
      difficulty: 'MEDIUM' as never,
      lessonWords: opts.lessonWords,
      isClassroomMode: opts.isClassroomMode,
      setWordsForBoard,
    }),
  );
  return { socket, setWordsForBoard, hook };
}

describe('useBoardWords — the board embeds the lesson, never random words, for a classroom', () => {
  beforeEach(() => fetchWithAuth.mockReset());

  it('Given local lesson data, Then the board uses it and nothing is fetched or requested', () => {
    const { socket, setWordsForBoard, hook } = setup({ lessonWords: ['cat', 'dog'], isClassroomMode: true });
    expect(setWordsForBoard).toHaveBeenCalledWith(['CAT', 'DOG']);
    expect(socket.emit).not.toHaveBeenCalled();
    expect(fetchWithAuth).not.toHaveBeenCalled();
    expect(hook.result.current.blocksStart).toBe(false);
  });

  it('Given a classroom host with no local lesson data and the room record available, Then the board request carries the lesson words', async () => {
    fetchWithAuth.mockResolvedValue(okCards(['apple', 'pear']));
    const { socket, setWordsForBoard, hook } = setup({ isClassroomMode: true });
    expect(hook.result.current.blocksStart).toBe(true);
    await waitFor(() => expect(setWordsForBoard).toHaveBeenCalledWith(['APPLE', 'PEAR']));
    expect(fetchWithAuth.mock.calls[0][0]).toContain('/api/education/classroom/live-game/cards?code=CLS123');
    expect(socket.emit).not.toHaveBeenCalledWith('getWordsForBoard', expect.anything());
    expect(hook.result.current.blocksStart).toBe(false);
  });

  it('Given the room record cannot be loaded, Then Start is blocked with an error and no random words are requested', async () => {
    fetchWithAuth.mockResolvedValue({ ok: false, status: 500 } as Response);
    const { socket, setWordsForBoard, hook } = setup({ isClassroomMode: true });
    await waitFor(() => expect(hook.result.current.lessonWordsStatus).toBe('error'));
    expect(hook.result.current.blocksStart).toBe(true);
    expect(socket.emit).not.toHaveBeenCalled();
    expect(setWordsForBoard).not.toHaveBeenCalled();
  });

  it('Given the load failed, When the teacher retries and the record answers, Then the lesson words arrive and Start unblocks', async () => {
    fetchWithAuth.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(okCards(['sun']));
    const { setWordsForBoard, hook } = setup({ isClassroomMode: true });
    await waitFor(() => expect(hook.result.current.lessonWordsStatus).toBe('error'));
    act(() => hook.result.current.retryLessonWords());
    await waitFor(() => expect(setWordsForBoard).toHaveBeenCalledWith(['SUN']));
    expect(hook.result.current.blocksStart).toBe(false);
  });

  it('Given a classroom lesson with no words on record, Then the board falls back to themed words exactly like a word-less local lesson', async () => {
    fetchWithAuth.mockResolvedValue(okCards([]));
    const { socket, hook } = setup({ isClassroomMode: true });
    await waitFor(() => expect(socket.emit).toHaveBeenCalledWith('getWordsForBoard', expect.objectContaining({ language: 'en' })));
    expect(hook.result.current.blocksStart).toBe(false);
  });

  it('Given an arcade room, Then themed words are requested as before', () => {
    const { socket, hook } = setup({ isClassroomMode: false });
    expect(socket.emit).toHaveBeenCalledWith('getWordsForBoard', expect.objectContaining({ language: 'en' }));
    expect(fetchWithAuth).not.toHaveBeenCalled();
    expect(hook.result.current.blocksStart).toBe(false);
  });
});

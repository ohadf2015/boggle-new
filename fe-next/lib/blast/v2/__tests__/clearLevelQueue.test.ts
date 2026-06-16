import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  enqueueClear,
  readClearQueue,
  clearClearQueue,
  flushClearQueue,
  type QueuedClear,
} from '../clearLevelQueue';

function makeItem(id: string): QueuedClear {
  return {
    submission: {
      submissionId: id,
      levelNumber: 1,
      locale: 'en',
      wordsFound: ['CAT'],
      timeSeconds: 30,
      cascadesTriggered: 0,
      wrongAttempts: 0,
      hintsUsed: 0,
    } as QueuedClear['submission'],
    earnedCoins: 10,
    earnedGems: 0,
  };
}

describe('clearLevelQueue', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('enqueues and reads back submissions in order', () => {
    enqueueClear(makeItem('a'));
    enqueueClear(makeItem('b'));
    const q = readClearQueue();
    expect(q.map((i) => i.submission.submissionId)).toEqual(['a', 'b']);
  });

  it('clearClearQueue empties the queue', () => {
    enqueueClear(makeItem('a'));
    clearClearQueue();
    expect(readClearQueue()).toEqual([]);
  });

  it('caps the queue so it cannot grow unbounded', () => {
    for (let i = 0; i < 80; i++) enqueueClear(makeItem(`x${i}`));
    expect(readClearQueue().length).toBeLessThanOrEqual(50);
    // keeps the most recent entries
    expect(readClearQueue().at(-1)!.submission.submissionId).toBe('x79');
  });

  it('flush POSTs each queued clear and empties the queue on success', async () => {
    enqueueClear(makeItem('a'));
    enqueueClear(makeItem('b'));
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const flushed = await flushClearQueue(fetchMock as unknown as typeof fetch);
    expect(flushed).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/blast/clear-level');
    expect(JSON.parse(init.body).submissionId).toBe('a');
    expect(readClearQueue()).toEqual([]);
  });

  it('keeps the queue from the first failure onward when still offline', async () => {
    enqueueClear(makeItem('a'));
    enqueueClear(makeItem('b'));
    enqueueClear(makeItem('c'));
    // a succeeds, b throws (network down) → b and c are retained.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockRejectedValueOnce(new Error('offline'));
    const flushed = await flushClearQueue(fetchMock as unknown as typeof fetch);
    expect(flushed).toBe(1);
    expect(readClearQueue().map((i) => i.submission.submissionId)).toEqual(['b', 'c']);
  });

  it('drops a permanently-rejected (4xx) clear instead of retrying forever', async () => {
    enqueueClear(makeItem('a'));
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 400 });
    const flushed = await flushClearQueue(fetchMock as unknown as typeof fetch);
    expect(flushed).toBe(1);
    expect(readClearQueue()).toEqual([]);
  });

  it('retains the item on a transient 5xx so it retries later', async () => {
    enqueueClear(makeItem('a'));
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    const flushed = await flushClearQueue(fetchMock as unknown as typeof fetch);
    expect(flushed).toBe(0);
    expect(readClearQueue().map((i) => i.submission.submissionId)).toEqual(['a']);
  });

  it('flush is a no-op with an empty queue', async () => {
    const fetchMock = vi.fn();
    const flushed = await flushClearQueue(fetchMock as unknown as typeof fetch);
    expect(flushed).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

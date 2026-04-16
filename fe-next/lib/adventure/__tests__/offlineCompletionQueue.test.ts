/**
 * S6-4 — Offline completion queue: localStorage-backed queue for
 * level completions that fail to sync to the server.
 * TDD RED phase.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Will be created next
import {
  enqueueCompletion,
  dequeueCompletion,
  peekQueue,
  queueSize,
  clearQueue,
  type QueuedCompletion,
} from '../offlineCompletionQueue';

const STORAGE_KEY = 'adventure_offline_completions';

describe('offlineCompletionQueue (S6-4)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const completion: QueuedCompletion = {
    world: 1,
    level: 3,
    stars: 2,
    score: 450,
    words: 8,
    goldEarned: 25,
    queuedAt: Date.now(),
  };

  it('enqueue stores completion in localStorage', () => {
    enqueueCompletion(completion);
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].world).toBe(1);
    expect(parsed[0].level).toBe(3);
  });

  it('enqueue appends multiple completions', () => {
    enqueueCompletion(completion);
    enqueueCompletion({ ...completion, level: 4, stars: 3 });
    expect(queueSize()).toBe(2);
  });

  it('peekQueue returns all items without removing', () => {
    enqueueCompletion(completion);
    const items = peekQueue();
    expect(items).toHaveLength(1);
    expect(queueSize()).toBe(1);
  });

  it('dequeueCompletion returns first item and removes it', () => {
    enqueueCompletion(completion);
    enqueueCompletion({ ...completion, level: 5 });
    const first = dequeueCompletion();
    expect(first?.level).toBe(3);
    expect(queueSize()).toBe(1);
  });

  it('dequeueCompletion returns null when empty', () => {
    expect(dequeueCompletion()).toBeNull();
  });

  it('clearQueue empties storage', () => {
    enqueueCompletion(completion);
    enqueueCompletion(completion);
    clearQueue();
    expect(queueSize()).toBe(0);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('queueSize returns 0 for empty/missing storage', () => {
    expect(queueSize()).toBe(0);
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');
    expect(queueSize()).toBe(0);
    expect(peekQueue()).toEqual([]);
    expect(dequeueCompletion()).toBeNull();
  });

  it('caps queue at 50 entries to prevent storage bloat', () => {
    for (let i = 0; i < 55; i++) {
      enqueueCompletion({ ...completion, level: i });
    }
    expect(queueSize()).toBe(50);
  });
});

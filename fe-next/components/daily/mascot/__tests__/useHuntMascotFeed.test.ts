import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { _resetMascotBus, subscribeMascotEvents } from '@/lib/blast/mascotBus';
import type { MascotEvent } from '@/lib/blast/mascotState';
import type { FeedbackType } from '../../survival/types';
import { useHuntMascotFeed } from '../useHuntMascotFeed';

type Feed = { feedbackSeq: number; feedbackType: FeedbackType | null; feedbackWord: string | null };

describe('useHuntMascotFeed', () => {
  let events: MascotEvent[];
  beforeEach(() => {
    _resetMascotBus();
    events = [];
    subscribeMascotEvents((e) => events.push(e));
  });

  it('emits once per new verdict, never for the verdict already on screen at mount', () => {
    const { rerender, result } = renderHook((p: Feed) => useHuntMascotFeed(p), {
      initialProps: { feedbackSeq: 4, feedbackType: 'valid-word', feedbackWord: 'OLD' },
    });
    expect(events).toEqual([]);

    rerender({ feedbackSeq: 5, feedbackType: 'valid-word', feedbackWord: 'TRAIN' });
    rerender({ feedbackSeq: 5, feedbackType: 'valid-word', feedbackWord: 'TRAIN' });
    rerender({ feedbackSeq: 6, feedbackType: 'valid-word', feedbackWord: 'RAIN' });
    expect(events.map((e) => e.kind)).toEqual(['word-submitted', 'word-submitted']);
    expect(result.current).toBe(2);

    rerender({ feedbackSeq: 7, feedbackType: 'not-on-board', feedbackWord: 'QQQ' });
    expect(events[2]).toEqual({ kind: 'word-rejected' });
    expect(result.current).toBe(0);
  });
});

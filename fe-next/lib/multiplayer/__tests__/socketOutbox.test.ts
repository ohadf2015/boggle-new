import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createSocketOutbox,
  type OutboxEntry,
  type SocketOutbox,
} from '../socketOutbox';

function makeEmit() {
  return vi.fn();
}

function makeWord(word = 'HELLO', overrides: Partial<OutboxEntry['payload']> = {}): OutboxEntry['payload'] {
  return {
    word,
    path: [[0, 0], [0, 1]],
    gameCode: 'TEST',
    comboType: null,
    inputMethod: 'touch',
    ...overrides,
  };
}

describe('socketOutbox', () => {
  let outbox: SocketOutbox;

  beforeEach(() => {
    outbox = createSocketOutbox();
  });

  it('starts empty', () => {
    expect(outbox.size()).toBe(0);
  });

  it('enqueue adds entries and assigns monotonic clientSeq', () => {
    outbox.enqueue(makeWord('CAT'));
    outbox.enqueue(makeWord('DOG'));
    outbox.enqueue(makeWord('FOX'));
    expect(outbox.size()).toBe(3);
    const entries = outbox.peek();
    expect(entries[0].clientSeq).toBe(1);
    expect(entries[1].clientSeq).toBe(2);
    expect(entries[2].clientSeq).toBe(3);
  });

  it('flush emits each entry via socket in FIFO order with clientSeq', () => {
    outbox.enqueue(makeWord('CAT'));
    outbox.enqueue(makeWord('DOG'));
    const emit = makeEmit();
    outbox.flush(emit);
    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit.mock.calls[0][0]).toBe('submitWord');
    expect(emit.mock.calls[0][1]).toMatchObject({ word: 'CAT', clientSeq: 1 });
    expect(emit.mock.calls[1][1]).toMatchObject({ word: 'DOG', clientSeq: 2 });
  });

  it('flush clears the queue', () => {
    outbox.enqueue(makeWord('CAT'));
    outbox.flush(makeEmit());
    expect(outbox.size()).toBe(0);
  });

  it('flush on empty outbox is a no-op', () => {
    const emit = makeEmit();
    outbox.flush(emit);
    expect(emit).not.toHaveBeenCalled();
  });

  it('caps at 30 — 31st enqueue is dropped and returns overflow=true', () => {
    for (let i = 0; i < 30; i++) {
      const result = outbox.enqueue(makeWord(`W${i}`));
      expect(result.overflow).toBe(false);
    }
    const result = outbox.enqueue(makeWord('OVERFLOW'));
    expect(result.overflow).toBe(true);
    expect(outbox.size()).toBe(30);
  });

  it('clear empties the queue without flushing', () => {
    outbox.enqueue(makeWord('CAT'));
    outbox.enqueue(makeWord('DOG'));
    outbox.clear();
    expect(outbox.size()).toBe(0);
  });

  it('clientSeq continues from last value after partial flush', () => {
    outbox.enqueue(makeWord('ONE'));
    outbox.enqueue(makeWord('TWO'));
    outbox.flush(makeEmit());
    outbox.enqueue(makeWord('THREE'));
    const entries = outbox.peek();
    expect(entries[0].clientSeq).toBe(3);
  });

  it('flush preserves payload fields on each emitted entry', () => {
    const payload = makeWord('HELLO', { gameCode: 'XYZZY', comboType: 'fire' });
    outbox.enqueue(payload);
    const emit = makeEmit();
    outbox.flush(emit);
    const emitted = emit.mock.calls[0][1] as Record<string, unknown>;
    expect(emitted.gameCode).toBe('XYZZY');
    expect(emitted.comboType).toBe('fire');
  });
});

const MAX_OUTBOX_SIZE = 30;

export interface OutboxEntry {
  clientSeq: number;
  payload: {
    word: string;
    path: number[][];
    gameCode: string;
    comboType: string | null;
    inputMethod: string;
    [key: string]: unknown;
  };
}

export interface EnqueueResult {
  overflow: boolean;
}

export type EmitFn = (event: string, payload: Record<string, unknown>) => void;

export interface SocketOutbox {
  enqueue(payload: OutboxEntry['payload']): EnqueueResult;
  flush(emit: EmitFn): void;
  clear(): void;
  size(): number;
  peek(): OutboxEntry[];
}

export function createSocketOutbox(): SocketOutbox {
  const queue: OutboxEntry[] = [];
  let seq = 0;

  return {
    enqueue(payload) {
      if (queue.length >= MAX_OUTBOX_SIZE) {
        return { overflow: true };
      }
      seq += 1;
      queue.push({ clientSeq: seq, payload });
      return { overflow: false };
    },

    flush(emit) {
      for (const entry of queue) {
        emit('submitWord', { ...entry.payload, clientSeq: entry.clientSeq });
      }
      queue.length = 0;
    },

    clear() {
      queue.length = 0;
    },

    size() {
      return queue.length;
    },

    peek() {
      return [...queue];
    },
  };
}

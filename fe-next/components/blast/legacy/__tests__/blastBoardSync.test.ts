/**
 * Test: Blast board sync queuing during cascade.
 * Verifies that rapid board updates during cascade don't drop intermediate states,
 * and that only the LAST queued update is applied when cascade ends.
 */

describe('Blast board sync queue logic', () => {
  // Simulate the queue-based board sync pattern
  type BoardSnapshot = { grid: string[][]; tileStates: number[][] };

  function createBoardSyncQueue() {
    const queue: BoardSnapshot[] = [];
    const applied: BoardSnapshot[] = [];
    let isCascading = false;

    return {
      get isCascading() { return isCascading; },
      setCascading(v: boolean) { isCascading = v; },
      pushUpdate(snapshot: BoardSnapshot) {
        if (isCascading) {
          queue.push(snapshot);
        } else {
          applied.push(snapshot);
        }
      },
      flushQueue() {
        if (!isCascading && queue.length > 0) {
          // Only apply the last snapshot (each is a full board state)
          applied.push(queue[queue.length - 1]);
          queue.length = 0;
        }
      },
      get queueLength() { return queue.length; },
      get applied() { return [...applied]; },
    };
  }

  it('applies update immediately when not cascading', () => {
    const sync = createBoardSyncQueue();
    const board = { grid: [['A']], tileStates: [[0]] };

    sync.pushUpdate(board);

    expect(sync.applied).toHaveLength(1);
    expect(sync.applied[0]).toBe(board);
    expect(sync.queueLength).toBe(0);
  });

  it('queues updates during cascade', () => {
    const sync = createBoardSyncQueue();
    sync.setCascading(true);

    sync.pushUpdate({ grid: [['A']], tileStates: [[0]] });
    sync.pushUpdate({ grid: [['B']], tileStates: [[1]] });

    expect(sync.applied).toHaveLength(0);
    expect(sync.queueLength).toBe(2);
  });

  it('applies only the LAST queued update when cascade ends', () => {
    const sync = createBoardSyncQueue();
    sync.setCascading(true);

    const first = { grid: [['A']], tileStates: [[0]] };
    const second = { grid: [['B']], tileStates: [[1]] };
    const third = { grid: [['C']], tileStates: [[2]] };
    sync.pushUpdate(first);
    sync.pushUpdate(second);
    sync.pushUpdate(third);

    sync.setCascading(false);
    sync.flushQueue();

    expect(sync.applied).toHaveLength(1);
    expect(sync.applied[0]).toBe(third);
    expect(sync.queueLength).toBe(0);
  });

  it('does not flush if still cascading', () => {
    const sync = createBoardSyncQueue();
    sync.setCascading(true);

    sync.pushUpdate({ grid: [['A']], tileStates: [[0]] });
    sync.flushQueue(); // should no-op since still cascading

    expect(sync.applied).toHaveLength(0);
    expect(sync.queueLength).toBe(1);
  });

  it('handles rapid 5-update burst during cascade', () => {
    const sync = createBoardSyncQueue();
    sync.setCascading(true);

    for (let i = 0; i < 5; i++) {
      sync.pushUpdate({ grid: [[String.fromCharCode(65 + i)]], tileStates: [[i]] });
    }

    expect(sync.queueLength).toBe(5);

    sync.setCascading(false);
    sync.flushQueue();

    // Only the last (E / 4) should be applied
    expect(sync.applied).toHaveLength(1);
    expect(sync.applied[0].grid[0][0]).toBe('E');
    expect(sync.applied[0].tileStates[0][0]).toBe(4);
  });
});

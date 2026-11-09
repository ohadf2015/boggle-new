import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  _resetGemCollectBus,
  emitGemLanded,
  emitGemsCollected,
  gemEventsFrom,
  subscribeGemLanded,
  subscribeGemsCollected,
} from '../gemCollectBus';

const tile = (type: string, gem?: 'emerald' | 'ruby', isCleared = false) => ({ type, gem, isCleared });

describe('gemCollectBus', () => {
  afterEach(() => _resetGemCollectBus());

  it('picks only live gem tiles out of a clear, with their color', () => {
    const before = [[tile('diamond', 'ruby'), tile('standard'), tile('diamond', undefined, true)], [tile('diamond')]];
    const events = gemEventsFrom(
      [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }],
      before,
    );
    expect(events).toEqual([
      { row: 0, col: 0, gem: 'ruby' },
      { row: 1, col: 0, gem: 'sapphire' },
    ]);
  });

  it('delivers collected hauls and landings to subscribers until they unsubscribe', () => {
    const onHaul = vi.fn();
    const onLand = vi.fn();
    const offHaul = subscribeGemsCollected(onHaul);
    subscribeGemLanded(onLand);
    emitGemsCollected([{ row: 1, col: 2, gem: 'emerald' }]);
    emitGemLanded('emerald');
    expect(onHaul).toHaveBeenCalledWith([{ row: 1, col: 2, gem: 'emerald' }]);
    expect(onLand).toHaveBeenCalledWith('emerald');
    offHaul();
    emitGemsCollected([{ row: 0, col: 0, gem: 'ruby' }]);
    expect(onHaul).toHaveBeenCalledTimes(1);
  });

  it('stays silent for an empty haul', () => {
    const onHaul = vi.fn();
    subscribeGemsCollected(onHaul);
    emitGemsCollected([]);
    expect(onHaul).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { saveFlySource, takeFlySource, flyKeyframes, FLY_TTL_MS } from '../dailyFly';

const rect = { left: 20, top: 700, width: 56, height: 56 } as DOMRect;

describe('dailyFly', () => {
  beforeEach(() => sessionStorage.clear());

  it('hands the saved source over exactly once', () => {
    saveFlySource(rect, 1000);
    expect(takeFlySource(1500)).toEqual({ cx: 48, cy: 728, size: 56 });
    expect(takeFlySource(1500)).toBeNull();
  });

  it('drops a source older than the TTL', () => {
    saveFlySource(rect, 1000);
    expect(takeFlySource(1000 + FLY_TTL_MS + 1)).toBeNull();
  });

  it('returns null when nothing was saved or storage is junk', () => {
    expect(takeFlySource()).toBeNull();
    sessionStorage.setItem('lc:daily-fly', 'not json');
    expect(takeFlySource()).toBeNull();
  });

  it('builds a FLIP from the source centre and size to rest', () => {
    const rest = { left: 100, top: 300, width: 112, height: 112 } as DOMRect;
    const [from, to] = flyKeyframes({ cx: 48, cy: 728, size: 56 }, rest);
    expect(to.transform).toBe('translate(0px, 0px) scale(1)');
    expect(from.transform).toBe('translate(-108px, 372px) scale(0.5)');
  });
});

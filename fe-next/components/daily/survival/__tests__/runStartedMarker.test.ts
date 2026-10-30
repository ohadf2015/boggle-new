import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/utils/dailyChallenge', () => ({
  markWordHuntForfeitToday: vi.fn(),
}));

import { markWordHuntForfeitToday } from '@/utils/dailyChallenge';
import { markWordHuntRunStarted, clearWordHuntRunStarted, consumeUnfinishedWordHuntRun } from '../runStartedMarker';

describe('Word Hunt run-started marker', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

  it('given a run started and the page reloaded, when the puzzle loads, then it is treated as a forfeit once', () => {
    markWordHuntRunStarted('en', '2026-10-30');
    expect(consumeUnfinishedWordHuntRun('en', '2026-10-30')).toBe(true);
    expect(markWordHuntForfeitToday).toHaveBeenCalledWith('en');
    expect(consumeUnfinishedWordHuntRun('en', '2026-10-30')).toBe(false);
  });

  it('given the run finished, when the puzzle loads, then nothing is forfeited', () => {
    markWordHuntRunStarted('en', '2026-10-30');
    clearWordHuntRunStarted('en');
    expect(consumeUnfinishedWordHuntRun('en', '2026-10-30')).toBe(false);
    expect(markWordHuntForfeitToday).not.toHaveBeenCalled();
  });

  it("given yesterday's run was left open, when today's puzzle loads, then today is not forfeited", () => {
    markWordHuntRunStarted('en', '2026-10-29');
    expect(consumeUnfinishedWordHuntRun('en', '2026-10-30')).toBe(false);
  });

  it('given a run in another language, when this language loads, then it is not forfeited', () => {
    markWordHuntRunStarted('he', '2026-10-30');
    expect(consumeUnfinishedWordHuntRun('en', '2026-10-30')).toBe(false);
  });

  it('given storage throws, when used, then nothing breaks', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(consumeUnfinishedWordHuntRun('en', '2026-10-30')).toBe(false);
    spy.mockRestore();
  });
});

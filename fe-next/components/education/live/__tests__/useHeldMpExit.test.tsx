import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MP_EXIT_REASONS, shouldHoldMpExit } from '@/lib/multiplayer/exitDestination';
import type { ClassroomContext } from '@/lib/education/classroomRoomGone';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en' }) }));

import { MP_EXIT_HOLD_CAP_MS, useHeldMpExit } from '@/hooks/useMpExit';

describe('shouldHoldMpExit', () => {
  it('holds every exit while an arcade-route room is still being looked up', () => {
    for (const reason of MP_EXIT_REASONS) {
      expect(shouldHoldMpExit('pending', '/en/multiplayer'), reason).toBe(true);
    }
  });

  it('never holds once the room is known, or on the classroom live route', () => {
    expect(shouldHoldMpExit('classroom', '/en/multiplayer')).toBe(false);
    expect(shouldHoldMpExit('arcade', '/en/multiplayer')).toBe(false);
    expect(shouldHoldMpExit('pending', '/he/education/live')).toBe(false);
  });
});

describe('useHeldMpExit', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const setup = (initial: ClassroomContext) => {
    const run = vi.fn();
    const hook = renderHook(({ context }) => useHeldMpExit(context, '/en/multiplayer', run), {
      initialProps: { context: initial },
    });
    return { run, hook };
  };

  it('given a known room, when the player exits, then it runs at once', () => {
    const { run, hook } = setup('arcade');
    act(() => hook.result.current('continue-solo'));
    expect(run).toHaveBeenCalledWith('continue-solo');
  });

  it('given a pending room that turns out to be a class, when the player exits, then the exit waits and runs after the record lands', () => {
    const { run, hook } = setup('pending');
    act(() => hook.result.current('continue-solo'));
    expect(run).not.toHaveBeenCalled();
    hook.rerender({ context: 'classroom' });
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith('continue-solo');
  });

  it('given a lookup that never answers, when the cap passes, then the exit still runs once', () => {
    const { run, hook } = setup('pending');
    act(() => hook.result.current('back-from-entry'));
    act(() => { vi.advanceTimersByTime(MP_EXIT_HOLD_CAP_MS - 1); });
    expect(run).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(run).toHaveBeenCalledTimes(1);
    hook.rerender({ context: 'arcade' });
    expect(run).toHaveBeenCalledTimes(1);
  });
});

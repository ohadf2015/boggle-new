/**
 * PostHog inbox 01a0ed1f-f749: the in-page Quick Start button created the
 * room with `options.quickPlay`, but the lobby read Quick Play only from
 * `?quickPlay=true`, so button hosts got the slow public-room path (15s alone
 * timer + 20s countdown) and some left before a game started.
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useQuickPlayIntent } from '../useQuickPlayIntent';
import type { HandleJoinFn } from '../useMultiplayerJoin';

const setup = (urlQuickPlay: boolean) => {
  const join = vi.fn(async () => undefined) as unknown as HandleJoinFn & ReturnType<typeof vi.fn>;
  const hook = renderHook(({ q }) => useQuickPlayIntent(join, q), { initialProps: { q: urlQuickPlay } });
  return { join, hook };
};

describe('useQuickPlayIntent', () => {
  it('passes the URL param through', () => {
    expect(setup(true).hook.result.current.quickPlay).toBe(true);
    expect(setup(false).hook.result.current.quickPlay).toBe(false);
  });

  it('turns Quick Play on when the button hosts a quick-play room', async () => {
    const { join, hook } = setup(false);
    await act(() => hook.result.current.handleJoin(true, 'en', 'ABC123', 'Room', 'Me', { quickPlay: true }));
    expect(hook.result.current.quickPlay).toBe(true);
    expect(join).toHaveBeenCalledWith(true, 'en', 'ABC123', 'Room', 'Me', { quickPlay: true });
  });

  it('leaves it off for a normal hosted room, and clears it on the next normal create', async () => {
    const { hook } = setup(false);
    await act(() => hook.result.current.handleJoin(true, 'en', 'ABC123', 'Room', 'Me', { quickPlay: true }));
    await act(() => hook.result.current.handleJoin(true, 'en', 'XYZ789', 'Room', 'Me'));
    expect(hook.result.current.quickPlay).toBe(false);
  });

  it('does not flip on for a guest joining an existing room', async () => {
    const { hook } = setup(false);
    await act(() => hook.result.current.handleJoin(false, null, 'ABC123', undefined, 'Me', { quickPlay: true }));
    expect(hook.result.current.quickPlay).toBe(false);
  });
});

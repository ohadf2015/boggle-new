import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuickReactions } from '../useQuickReactions';
import { REACTIONS } from '@/components/game/QuickReactions';

// Mock socket
const mockEmit = vi.fn();
const mockOn = vi.fn();
const mockOff = vi.fn();
const mockSocket = { emit: mockEmit, on: mockOn, off: mockOff } as any;

describe('useQuickReactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register quickReaction listener on mount', () => {
    renderHook(() => useQuickReactions({ socket: mockSocket, username: 'me' }));
    expect(mockOn).toHaveBeenCalledWith('quickReaction', expect.any(Function));
  });

  it('should unregister listener on unmount', () => {
    const { unmount } = renderHook(() => useQuickReactions({ socket: mockSocket, username: 'me' }));
    unmount();
    expect(mockOff).toHaveBeenCalledWith('quickReaction', expect.any(Function));
  });

  it('should emit quickReaction event when sendReaction is called', () => {
    const { result } = renderHook(() => useQuickReactions({ socket: mockSocket, username: 'me' }));
    act(() => { result.current.sendReaction('fire'); });
    expect(mockEmit).toHaveBeenCalledWith('quickReaction', { reactionId: 'fire', username: 'me' });
  });

  it('should add floating reaction when receiving event from others', () => {
    const { result } = renderHook(() => useQuickReactions({ socket: mockSocket, username: 'me' }));

    // Get the registered handler
    const handler = mockOn.mock.calls.find((c: any) => c[0] === 'quickReaction')?.[1];
    expect(handler).toBeDefined();

    // Simulate receiving a reaction from another player
    act(() => { handler({ reactionId: 'fire', username: 'other' }); });
    expect(result.current.floatingReactions.length).toBe(1);
    expect(result.current.floatingReactions[0].emoji).toBe(REACTIONS[0].emoji);
    expect(result.current.floatingReactions[0].username).toBe('other');
  });

  it('should also show own reactions as floating', () => {
    const { result } = renderHook(() => useQuickReactions({ socket: mockSocket, username: 'me' }));

    act(() => { result.current.sendReaction('clap'); });

    // Own reaction gets broadcast back via socket, but we also add it locally
    expect(result.current.floatingReactions.length).toBe(1);
    expect(result.current.floatingReactions[0].username).toBe('me');
  });

  it('should remove floating reaction via dismissReaction', () => {
    const { result } = renderHook(() => useQuickReactions({ socket: mockSocket, username: 'me' }));

    act(() => { result.current.sendReaction('fire'); });
    const id = result.current.floatingReactions[0].id;

    act(() => { result.current.dismissReaction(id); });
    expect(result.current.floatingReactions.length).toBe(0);
  });

  it('should not emit if socket is null', () => {
    const { result } = renderHook(() => useQuickReactions({ socket: null, username: 'me' }));
    act(() => { result.current.sendReaction('fire'); });
    expect(mockEmit).not.toHaveBeenCalled();
  });
});

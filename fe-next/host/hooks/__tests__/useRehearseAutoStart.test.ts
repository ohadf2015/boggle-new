import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { writeRehearseIntent, peekRehearseIntent } from '@/lib/education/rehearsal';
import { useRehearseAutoStart } from '../useRehearseAutoStart';

describe('useRehearseAutoStart', () => {
  beforeEach(() => sessionStorage.clear());

  it('Given a Rehearse tap from HQ, When the host is seated in the room, Then the practice round starts once and the intent is spent', () => {
    writeRehearseIntent({ source: 'hq', classExists: false });
    const start = vi.fn();
    const { rerender } = renderHook((p: { hostSeated: boolean }) => useRehearseAutoStart({ enabled: true, hostSeated: p.hostSeated, botsAllowed: true, start }), {
      initialProps: { hostSeated: false },
    });
    expect(start).not.toHaveBeenCalled();

    rerender({ hostSeated: true });
    rerender({ hostSeated: true });
    expect(start).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledWith({ source: 'hq', classExists: false });
    expect(peekRehearseIntent()).toBeNull();
  });

  it('Given no Rehearse tap, Then opening the lobby never starts bots', () => {
    const start = vi.fn();
    renderHook(() => useRehearseAutoStart({ enabled: true, hostSeated: true, botsAllowed: true, start }));
    expect(start).not.toHaveBeenCalled();
  });

  it('Given a lobby that cannot run practice rounds, Then the intent is left alone', () => {
    writeRehearseIntent({ source: 'class', classExists: true });
    const start = vi.fn();
    renderHook(() => useRehearseAutoStart({ enabled: false, hostSeated: true, botsAllowed: true, start }));
    expect(start).not.toHaveBeenCalled();
  });

  it('Given the classroom flag resolves after mount, Then the HQ tap still starts the round once', () => {
    writeRehearseIntent({ source: 'hq', classExists: true });
    const start = vi.fn();
    const { rerender } = renderHook((p: { enabled: boolean }) => useRehearseAutoStart({ enabled: p.enabled, hostSeated: true, botsAllowed: true, start }), {
      initialProps: { enabled: false },
    });
    rerender({ enabled: true });
    rerender({ enabled: true });
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('Given the room ended up in a mode bots cannot play, Then no dead bot round starts and the intent is dropped', () => {
    writeRehearseIntent({ source: 'hq', classExists: true });
    const start = vi.fn();
    renderHook(() => useRehearseAutoStart({ enabled: true, hostSeated: true, botsAllowed: false, start }));
    expect(start).not.toHaveBeenCalled();
    expect(peekRehearseIntent()).toBeNull();
  });
});

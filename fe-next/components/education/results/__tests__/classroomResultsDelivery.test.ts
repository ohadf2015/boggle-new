/**
 * The rule that decides whether a phone waits for the projector.
 *
 * Pinned separately from the socket hook because this one boolean is what made
 * three live classroom runs produce zero student results screens.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shouldWaitForTvReveal, createTvRevealGate } from '../classroomResultsDelivery';

describe('shouldWaitForTvReveal', () => {
  it('waits in an arcade TV room — the reveal on the wall IS the show', () => {
    expect(shouldWaitForTvReveal({ tvMode: true })).toBe(true);
  });

  it('does not wait in a classroom, where every room is tvMode by construction', () => {
    expect(shouldWaitForTvReveal({ tvMode: true, classroomSummary: { totalWords: 4 } })).toBe(false);
  });

  it('never waits when the host is not broadcasting at all', () => {
    expect(shouldWaitForTvReveal({})).toBe(false);
    expect(shouldWaitForTvReveal({ tvMode: false })).toBe(false);
  });
});

/**
 * The gate itself, lifted out of the 1000-line player socket hook.
 *
 * The deferral used to live in effect-local variables. A socket reconnect
 * re-runs that effect, the cleanup cleared the pending payload and its 25s
 * ceiling, and the server's resend was then thrown away as a duplicate — the
 * student sat on the pre-game screen forever. That is the shape capture r2 hit
 * three times out of three.
 */
describe('createTvRevealGate', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  const arcade = { tvMode: true, scores: [] };

  it('holds an arcade TV payload until the host reveals', () => {
    const onShow = vi.fn();
    const onHold = vi.fn();
    const gate = createTvRevealGate({ onShow, onHold });

    gate.receive(arcade);
    expect(onShow).not.toHaveBeenCalled();
    expect(onHold).toHaveBeenCalledTimes(1);

    gate.revealed();
    expect(onShow).toHaveBeenCalledWith(arcade);
  });

  it('shows a classroom payload at once — the phone never waits for the wall', () => {
    const onShow = vi.fn();
    const gate = createTvRevealGate({ onShow, onHold: vi.fn() });
    const payload = { tvMode: true, classroomSummary: { totalWords: 4 } };

    gate.receive(payload);
    expect(onShow).toHaveBeenCalledWith(payload);
  });

  it('releases a held payload on its own after the ceiling if no reveal arrives', () => {
    const onShow = vi.fn();
    const gate = createTvRevealGate({ onShow, onHold: vi.fn(), timeoutMs: 25000 });

    gate.receive(arcade);
    vi.advanceTimersByTime(24999);
    expect(onShow).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(onShow).toHaveBeenCalledWith(arcade);
  });

  it('shows immediately when the reveal beat the scores to the client', () => {
    const onShow = vi.fn();
    const gate = createTvRevealGate({ onShow, onHold: vi.fn() });

    gate.revealed();
    gate.receive(arcade);
    expect(onShow).toHaveBeenCalledWith(arcade);
  });

  it('reports whether results were ever actually shown, so a resend is not mistaken for a duplicate', () => {
    const gate = createTvRevealGate({ onShow: vi.fn(), onHold: vi.fn() });
    expect(gate.hasShown()).toBe(false);
    gate.receive(arcade);
    expect(gate.hasShown()).toBe(false);
    gate.revealed();
    expect(gate.hasShown()).toBe(true);
  });

  it('drops its pending payload and its timer on dispose — nothing fires after teardown', () => {
    const onShow = vi.fn();
    const gate = createTvRevealGate({ onShow, onHold: vi.fn() });

    gate.receive(arcade);
    gate.dispose();
    vi.advanceTimersByTime(60000);
    gate.revealed();
    expect(onShow).not.toHaveBeenCalled();
  });
});

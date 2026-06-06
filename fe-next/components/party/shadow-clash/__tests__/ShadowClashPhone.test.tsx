import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import ShadowClashPhone from '../ShadowClashPhone';

/**
 * Integration: the phone wiring around shadowPhaseReducer.
 *
 * The marquee bug (F2): a player eliminated mid-game would get their dead
 * screen overwritten by the room-wide discussionStart / voteStart broadcasts,
 * handing them a live "Call Vote" button and ballot. These tests drive the real
 * socket events through the component and assert the dead stay dead.
 */

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr' }),
}));
vi.mock('@/hooks/usePartySounds', () => ({
  usePartySounds: () => new Proxy({}, { get: () => () => {} }),
}));
vi.mock('worker-timers', () => ({
  setInterval: (fn: () => void, ms: number) => globalThis.setInterval(fn, ms),
  clearInterval: (id: number) => globalThis.clearInterval(id),
}));

/** Minimal socket double that records handlers and lets the test emit events. */
function makeSocket() {
  const handlers: Record<string, (data?: unknown) => void> = {};
  return {
    on: (event: string, cb: (data?: unknown) => void) => { handlers[event] = cb; },
    off: (event: string) => { delete handlers[event]; },
    emit: vi.fn(),
    fire: (event: string, data?: unknown) => act(() => handlers[event]?.(data)),
  };
}

describe('ShadowClashPhone — eliminated lockout (F2)', () => {
  let socket: ReturnType<typeof makeSocket>;
  beforeEach(() => {
    socket = makeSocket();
    render(<ShadowClashPhone socket={socket as never} onSendInput={vi.fn()} />);
    socket.fire('party:shadow:roleAssigned', { role: 'citizen', team: 'good' });
  });

  it('shows the eliminated screen after youWereEliminated', () => {
    socket.fire('party:shadow:youWereEliminated', {});
    expect(screen.getByText('party.youWereEliminated')).toBeInTheDocument();
  });

  it('does NOT revive a dead player when discussion starts', () => {
    socket.fire('party:shadow:youWereEliminated', {});
    socket.fire('party:shadow:discussionStart', { timeSeconds: 30 });
    // Dead player must still see the eliminated screen, not the Call Vote button.
    expect(screen.getByText('party.youWereEliminated')).toBeInTheDocument();
    expect(screen.queryByText('party.callVote')).not.toBeInTheDocument();
  });

  it('does NOT hand a dead player a ballot when voting starts', () => {
    socket.fire('party:shadow:youWereEliminated', {});
    socket.fire('party:shadow:voteStart', { targets: ['Alice', 'Bob'], timeSeconds: 20 });
    expect(screen.getByText('party.youWereEliminated')).toBeInTheDocument();
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('still advances a dead player to the post-game watching screen', () => {
    socket.fire('party:shadow:youWereEliminated', {});
    socket.fire('party:shadow:gameOver', {});
    expect(screen.getByText('party.watchTheTv')).toBeInTheDocument();
  });

  it('translates the eliminated role label (no raw enum, no hardcoded "You were:")', () => {
    socket.fire('party:shadow:youWereEliminated', {});
    // role name comes from the translation key, not the raw "citizen" enum
    expect(screen.getByText(/party\.roleCitizen/)).toBeInTheDocument();
    expect(screen.queryByText(/You were:/)).not.toBeInTheDocument();
  });
});

describe('ShadowClashPhone — living player still plays', () => {
  it('lets a living player reach the Call Vote button in discussion', () => {
    const socket = makeSocket();
    render(<ShadowClashPhone socket={socket as never} onSendInput={vi.fn()} />);
    socket.fire('party:shadow:roleAssigned', { role: 'citizen', team: 'good' });
    socket.fire('party:shadow:discussionStart', { timeSeconds: 30 });
    expect(screen.getByText('party.callVote')).toBeInTheDocument();
  });

  it('emits a single vote even on rapid double-tap (double-submit guard)', () => {
    const onSendInput = vi.fn();
    const socket = makeSocket();
    render(<ShadowClashPhone socket={socket as never} onSendInput={onSendInput} />);
    socket.fire('party:shadow:roleAssigned', { role: 'citizen', team: 'good' });
    socket.fire('party:shadow:voteStart', { targets: ['Alice', 'Bob'], timeSeconds: 20 });
    const alice = screen.getByText('Alice');
    act(() => { alice.click(); alice.click(); });
    const voteCalls = onSendInput.mock.calls.filter(([c]) => c.action === 'vote');
    expect(voteCalls).toHaveLength(1);
  });
});

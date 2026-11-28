import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const sock = vi.hoisted(() => {
  const listeners: Record<string, ((d: unknown) => void)[]> = {};
  const emitted: { event: string; data: unknown }[] = [];
  const acks: Record<string, unknown> = {};
  return {
    listeners,
    emitted,
    acks,
    socket: {
      on: (e: string, fn: (d: unknown) => void) => (listeners[e] ??= []).push(fn),
      off: (e: string, fn: (d: unknown) => void) => (listeners[e] = (listeners[e] ?? []).filter((f) => f !== fn)),
      emit: (event: string, data: unknown, cb?: (r: unknown) => void) => {
        emitted.push({ event, data });
        if (cb && acks[event]) cb(acks[event]);
      },
    },
  };
});
const fire = (e: string, d: unknown) => act(() => (sock.listeners[e] ?? []).forEach((fn) => fn(d)));

vi.mock('@/utils/SocketContext', () => ({ useSocket: () => ({ socket: sock.socket, isConnected: true }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/hooks/usePrefersReducedMotion', () => ({ usePrefersReducedMotion: () => true }));
vi.mock('../../kit/useKitSfx', () => ({ useKitSfx: () => ({ play: vi.fn(), combo: vi.fn() }) }));
vi.mock('../../kit/PixiStage', () => ({ default: () => <div data-testid="stage" /> }));
vi.mock('@/components/daily/holiday/holidayBurst', () => ({ spawnBurst: vi.fn() }));
vi.mock('../../useArcadeGate', () => ({ useArcadeGate: () => ({ holiday: 'christmas', resolved: true, region: 'world' }) }));

import PartyPhone from '../PartyPhone';
import PartyTv from '../PartyTv';

beforeEach(() => {
  sessionStorage.clear();
  sock.emitted.length = 0;
  for (const k of Object.keys(sock.listeners)) delete sock.listeners[k];
});

describe('big screen party', () => {
  it('Given a phone opens the join link, when it enters a name, then it joins that room and waits for the big screen', () => {
    sock.acks['party:join'] = { ok: true, code: 'ABCD', game: 'dash', phase: 'lobby', player: { id: 'p1', name: 'Ana', color: 'neo-lime' }, token: 't1' };
    render(<PartyPhone code="ABCD" />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Ana' } });
    fireEvent.submit(screen.getByTestId('party-join'));
    expect(sock.emitted.find((e) => e.event === 'party:join')?.data).toMatchObject({ code: 'ABCD', name: 'Ana' });
    expect(screen.getByTestId('party-waiting')).toBeInTheDocument();
  });

  it('Given the round starts on a sleigh phone, then holding the big button flies and letting go glides', () => {
    sessionStorage.setItem('party-seat:ABCD', JSON.stringify({ playerId: 'p1', token: 't1', name: 'Ana', color: 'neo-lime', game: 'dash' }));
    sock.acks['party:join'] = { ok: true, code: 'ABCD', game: 'dash', phase: 'lobby', player: { id: 'p1', name: 'Ana', color: 'neo-lime' }, token: 't1' };
    render(<PartyPhone code="ABCD" />);
    expect(sock.emitted.find((e) => e.event === 'party:join')?.data).toMatchObject({ playerId: 'p1', token: 't1' });
    fire('party:go', { players: [] });
    fireEvent.pointerDown(screen.getByTestId('party-hold'));
    fireEvent.pointerUp(screen.getByTestId('party-hold'));
    expect(sock.emitted.filter((e) => e.event === 'party:input').map((e) => e.data)).toEqual([{ hold: true }, { hold: false }]);
  });

  it('Given the round ends, then the phone shows its place and can start the next round', () => {
    sessionStorage.setItem('party-seat:ABCD', JSON.stringify({ playerId: 'p1', token: 't1', name: 'Ana', color: 'neo-lime', game: 'catch' }));
    render(<PartyPhone code="ABCD" />);
    fire('party:end', { podium: [{ id: 'p1', name: 'Ana', color: 'neo-lime', score: 90, place: 2 }] });
    expect(screen.getByText('#2')).toBeInTheDocument();
    const again = screen.getByTestId('party-again');
    fireEvent.click(again);
    expect(sock.emitted.at(-1)?.event).not.toBe('party:start');
    const now = vi.spyOn(performance, 'now').mockReturnValue(performance.now() + 5000);
    fireEvent.pointerDown(again);
    fireEvent.click(again);
    now.mockRestore();
    expect(sock.emitted.at(-1)?.event).toBe('party:start');
  });

  it('Given the big screen opens, then it shows the room code and roster and starts with its host token', () => {
    sock.acks['party:host'] = { ok: true, code: 'WXYZ', hostToken: 'secret', phase: 'lobby', players: [] };
    render(<PartyTv game="catch" holiday="hanukkah" onExit={vi.fn()} />);
    expect(screen.getByTestId('party-code')).toHaveTextContent('WXYZ');
    expect(screen.queryByTestId('party-start')).toBeNull();
    expect(screen.getByTestId('party-start-wait')).toBeInTheDocument();
    fire('party:roster', { phase: 'lobby', players: [{ id: 'p1', name: 'Ana', color: 'neo-pink', connected: true }] });
    expect(screen.getByTestId('party-roster')).toHaveTextContent('Ana');
    fireEvent.click(screen.getByTestId('party-start'));
    expect(sock.emitted.at(-1)).toEqual({ event: 'party:start', data: { hostToken: 'secret' } });
    fire('party:go', { players: [{ id: 'p1', name: 'Ana', color: 'neo-pink', connected: true }] });
    expect(screen.getByTestId('stage')).toBeInTheDocument();
    expect(screen.getByTestId('party-board')).toHaveTextContent('Ana');
  });

  it('Given the round ends, then the big screen celebrates with a podium, the winner, the others below and one big play-again', () => {
    sock.acks['party:host'] = { ok: true, code: 'WXYZ', hostToken: 'secret', phase: 'lobby', players: [] };
    render(<PartyTv game="splat" holiday="christmas" onExit={vi.fn()} />);
    const rows = ['Ana', 'Ben', 'Cy', 'Dee'].map((name, i) => ({ id: `p${i}`, name, color: 'neo-lime', score: 400 - i * 100, place: i + 1 }));
    fire('party:end', { podium: rows });
    const podium = screen.getByTestId('party-podium');
    expect(podium).toHaveTextContent('holiday.arcade.party.winner');
    expect(podium).toHaveTextContent('Dee');
    expect(screen.getAllByTestId('party-start')).toHaveLength(1);
    expect(document.querySelectorAll('svg[role="img"], canvas').length).toBe(0);
  });

  it('Given everyone ends on the same score, then the podium calls a tie instead of crowning one player', () => {
    sock.acks['party:host'] = { ok: true, code: 'WXYZ', hostToken: 'secret', phase: 'lobby', players: [] };
    render(<PartyTv game="dash" holiday="christmas" onExit={vi.fn()} />);
    fire('party:end', { podium: ['Ana', 'Ben'].map((name, i) => ({ id: `p${i}`, name, color: 'neo-lime', score: 0, place: 1 })) });
    expect(screen.getByTestId('party-podium')).toHaveTextContent('holiday.arcade.party.tie');
  });
});

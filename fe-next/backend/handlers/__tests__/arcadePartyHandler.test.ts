import { vi } from 'vitest';
import { registerArcadePartyHandlers } from '../arcadePartyHandler';

vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: vi.fn().mockReturnValue(true) }));
vi.mock('../shared', () => ({ isSocketMigrating: vi.fn().mockReturnValue(false) }));

type Handler = (...a: unknown[]) => void;

function makeIo() {
  const sent: { room: string; event: string; data: unknown }[] = [];
  const io = { to: (room: string) => ({ emit: (event: string, data: unknown) => sent.push({ room, event, data }) }) };
  return { io: io as never, sent };
}

function makeSocket(id: string, io: never) {
  const handlers: Record<string, Handler> = {};
  const socket = { id, on: (e: string, h: Handler) => (handlers[e] = h), join: vi.fn(), emit: vi.fn() };
  registerArcadePartyHandlers(io, socket as never);
  const call = <T,>(event: string, data?: unknown) => new Promise<T>((resolve) => handlers[event](data, resolve));
  return { socket, handlers, call };
}

describe('arcade party socket handlers', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('Given a TV hosts and two phones join, then the round runs on the server, the TV gets snapshots, and every screen gets the podium', async () => {
    const { io, sent } = makeIo();
    const tv = makeSocket('tv', io);
    const host = await tv.call<{ ok: boolean; code: string; hostToken: string }>('party:host', { game: 'catch' });
    expect(host.ok).toBe(true);
    const ana = makeSocket('p1', io);
    const ben = makeSocket('p2', io);
    const a = await ana.call<{ ok: boolean; player: { id: string } }>('party:join', { code: host.code.toLowerCase(), name: 'Ana' });
    const b = await ben.call<{ ok: boolean }>('party:join', { code: host.code, name: 'Ben' });
    expect(a.ok && b.ok).toBe(true);
    expect(sent.filter((s) => s.event === 'party:roster').at(-1)!.data).toMatchObject({ players: [{ name: 'Ana' }, { name: 'Ben' }] });

    ana.handlers['party:start']({});
    expect(sent.some((s) => s.event === 'party:go')).toBe(false);
    tv.handlers['party:start']({ hostToken: host.hostToken });
    expect(sent.some((s) => s.event === 'party:go')).toBe(true);
    ana.handlers['party:input']({ x: 0.9 });
    vi.advanceTimersByTime(1000);
    const states = sent.filter((s) => s.event === 'party:state');
    expect(states.length).toBeGreaterThanOrEqual(19);
    expect(states.every((s) => s.room.endsWith(':tv'))).toBe(true);
    vi.advanceTimersByTime(61_000);
    const end = sent.find((s) => s.event === 'party:end');
    expect(end?.data).toMatchObject({ podium: expect.arrayContaining([expect.objectContaining({ name: 'Ana' })]) });

    ana.handlers['party:start']({});
    expect(sent.filter((s) => s.event === 'party:go')).toHaveLength(1);
    vi.advanceTimersByTime(3500);
    ana.handlers['party:start']({});
    expect(sent.filter((s) => s.event === 'party:go')).toHaveLength(2);
    vi.advanceTimersByTime(61_000);
  });

  it('Given a wrong code or an unknown game, then the join or host is refused', async () => {
    const { io } = makeIo();
    const phone = makeSocket('p9', io);
    expect(await phone.call('party:join', { code: 'ZZZZ', name: 'x' })).toEqual({ ok: false, reason: 'missing' });
    expect(await phone.call('party:host', { game: 'oil' })).toEqual({ ok: false, reason: 'game' });
  });

  it('Given a TV reloads with its host token, then it takes back the same room', async () => {
    const { io } = makeIo();
    const tv = makeSocket('tv1', io);
    const first = await tv.call<{ code: string; hostToken: string }>('party:host', { game: 'dash' });
    const tv2 = makeSocket('tv2', io);
    const again = await tv2.call<{ code: string }>('party:host', { game: 'dash', code: first.code, hostToken: first.hostToken });
    expect(again.code).toBe(first.code);
    const stranger = await makeSocket('tv3', io).call<{ code: string }>('party:host', { game: 'dash', code: first.code, hostToken: 'nope' });
    expect(stranger.code).not.toBe(first.code);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchIncomingPings, pingErrorKey, reportRival, sendRivalPing } from '../pingClient';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
const respond = (status: number, body: unknown) => fetchMock.mockResolvedValueOnce({ ok: status < 400, status, json: async () => body });

describe('sendRivalPing', () => {
  it('posts the canned ping and reports success', async () => {
    respond(200, { ok: true });
    expect(await sendRivalPing('t', 'gg', 'daily')).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/rivals/ping');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ targetUserId: 't', pingId: 'gg', context: 'daily' });
  });

  it('returns the server error code', async () => {
    respond(429, { error: 'target_cooldown' });
    expect(await sendRivalPing('t', 'gg', 'daily')).toEqual({ ok: false, code: 'target_cooldown' });
  });

  it('maps a 401 without a body to sign_in_required and a network failure to unavailable', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401, json: async () => { throw new Error('no body'); } });
    expect(await sendRivalPing('t', 'gg', 'daily')).toEqual({ ok: false, code: 'sign_in_required' });
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await sendRivalPing('t', 'gg', 'daily')).toEqual({ ok: false, code: 'unavailable' });
  });
});

describe('fetchIncomingPings', () => {
  it('returns the list, or an empty list on any failure', async () => {
    respond(200, { pings: [{ id: 'n1' }] });
    expect(await fetchIncomingPings()).toEqual([{ id: 'n1' }]);
    respond(503, { error: 'unavailable' });
    expect(await fetchIncomingPings()).toEqual([]);
    fetchMock.mockRejectedValueOnce(new Error('x'));
    expect(await fetchIncomingPings()).toEqual([]);
  });
});

describe('reportRival', () => {
  it('posts the report and says whether it landed', async () => {
    respond(200, { ok: true });
    expect(await reportRival('t')).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/rivals/report');
    respond(503, {});
    expect(await reportRival('t')).toBe(false);
  });
});

describe('pingErrorKey', () => {
  it('maps every code to a rivalPings.error key', () => {
    expect(pingErrorKey('daily_limit')).toBe('rivalPings.error.daily_limit');
    expect(pingErrorKey('self')).toBe('rivalPings.error.not_allowed');
    expect(pingErrorKey('invalid_request')).toBe('rivalPings.error.unavailable');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalP2PTransport } from '../transport';
import type { NativeP2PBridge, BridgeEvent } from '../types';
import { serialize, submitWord, parseMessage, PROTOCOL_VERSION } from '../protocol';

/** In-memory fake of the Capacitor plugin bridge. */
function fakeBridge() {
  const listeners: Partial<Record<BridgeEvent, (p: unknown) => void>> = {};
  const sent: Array<{ endpointId: string; data: string }> = [];
  const bridge: NativeP2PBridge = {
    startAdvertising: vi.fn(() => Promise.resolve()),
    startDiscovery: vi.fn(() => Promise.resolve()),
    connect: vi.fn(() => Promise.resolve()),
    sendMessage: vi.fn((endpointId: string, data: string) => {
      sent.push({ endpointId, data });
      return Promise.resolve();
    }),
    stop: vi.fn(() => Promise.resolve()),
    addListener: (event, cb) => {
      listeners[event] = cb as (p: unknown) => void;
    },
  };
  const fire = (event: BridgeEvent, payload: unknown) => listeners[event]?.(payload);
  return { bridge, sent, fire };
}

describe('LocalP2PTransport', () => {
  let f: ReturnType<typeof fakeBridge>;
  let t: LocalP2PTransport;

  beforeEach(() => {
    f = fakeBridge();
    t = new LocalP2PTransport(f.bridge);
  });

  it('tracks connected peers from bridge "connected" events', () => {
    f.fire('connected', { endpointId: 'e1', playerId: 'p1' });
    f.fire('connected', { endpointId: 'e2', playerId: 'p2' });
    expect(t.getConnectedPlayers().sort()).toEqual(['p1', 'p2']);
  });

  it('drops a peer on "endpointLost"', () => {
    f.fire('connected', { endpointId: 'e1', playerId: 'p1' });
    f.fire('connected', { endpointId: 'e2', playerId: 'p2' });
    f.fire('endpointLost', { endpointId: 'e1' });
    expect(t.getConnectedPlayers()).toEqual(['p2']);
  });

  it('emit() to a specific endpoint serializes and sends once', async () => {
    await t.emit('submitWord', { word: 'hi', playerId: 'p1' }, 'e2');
    expect(f.sent).toHaveLength(1);
    expect(f.sent[0].endpointId).toBe('e2');
    // Must stamp the version so the receiver's parseMessage accepts it.
    expect(JSON.parse(f.sent[0].data)).toMatchObject({ v: PROTOCOL_VERSION, t: 'submitWord', word: 'hi' });
    expect(parseMessage(f.sent[0].data)).not.toBeNull();
  });

  it('emit() with no endpoint broadcasts to all connected peers', async () => {
    f.fire('connected', { endpointId: 'e1', playerId: 'p1' });
    f.fire('connected', { endpointId: 'e2', playerId: 'p2' });
    await t.emit('heartbeat', { version: 1 });
    expect(f.sent.map((s) => s.endpointId).sort()).toEqual(['e1', 'e2']);
  });

  it('on() dispatches parsed inbound messages by type', () => {
    const handler = vi.fn();
    t.on('submitWord', handler);
    f.fire('message', { endpointId: 'e1', data: serialize(submitWord({ word: 'go', playerId: 'p1' })) });
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ word: 'go', playerId: 'p1' }),
      'e1',
    );
  });

  it('off() removes a handler', () => {
    const handler = vi.fn();
    t.on('heartbeat', handler);
    t.off('heartbeat', handler);
    f.fire('message', { endpointId: 'e1', data: serialize({ v: 1, t: 'heartbeat', version: 2 } as never) });
    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores malformed inbound messages without throwing', () => {
    const handler = vi.fn();
    t.on('submitWord', handler);
    expect(() => f.fire('message', { endpointId: 'e1', data: 'garbage{' })).not.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });
});

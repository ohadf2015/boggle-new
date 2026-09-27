/**
 * Versioned wire protocol for local-mesh MP. Every message carries `v` (version)
 * and `t` (type). `parseMessage` is total — it returns null on malformed JSON,
 * a version mismatch, an unknown type, or a missing required field, and NEVER
 * throws, so a lossy/garbled link can't crash a peer.
 *
 * Keep payloads small (Nearby byte limit is 32KB; game state is < 2KB JSON).
 */

export const PROTOCOL_VERSION = 1;

// Client → host
export interface SubmitWordMsg {
  v: number;
  t: 'submitWord';
  word: string;
  playerId: string;
  seq?: number;
}
export interface JoinMsg {
  v: number;
  t: 'join';
  playerId: string;
  displayName: string;
}
export interface ResyncRequestMsg {
  v: number;
  t: 'resyncRequest';
  playerId: string;
}

// Host → all
export interface StateMsg {
  v: number;
  t: 'state';
  version: number;
  state: unknown;
}
export interface HeartbeatMsg {
  v: number;
  t: 'heartbeat';
  version: number;
}
export interface HostChangedMsg {
  v: number;
  t: 'hostChanged';
  hostPlayerId: string;
}

export type LocalMpMessage =
  | SubmitWordMsg
  | JoinMsg
  | ResyncRequestMsg
  | StateMsg
  | HeartbeatMsg
  | HostChangedMsg;

export type LocalMpMessageType = LocalMpMessage['t'];

// ── Builders (stamp the version) ────────────────────────────────────────────

export function submitWord(p: { word: string; playerId: string; seq?: number }): SubmitWordMsg {
  return { v: PROTOCOL_VERSION, t: 'submitWord', word: p.word, playerId: p.playerId, ...(p.seq !== undefined ? { seq: p.seq } : {}) };
}
export function join(p: { playerId: string; displayName: string }): JoinMsg {
  return { v: PROTOCOL_VERSION, t: 'join', playerId: p.playerId, displayName: p.displayName };
}
export function resyncRequest(p: { playerId: string }): ResyncRequestMsg {
  return { v: PROTOCOL_VERSION, t: 'resyncRequest', playerId: p.playerId };
}
export function stateSnapshot(p: { version: number; state: unknown }): StateMsg {
  return { v: PROTOCOL_VERSION, t: 'state', version: p.version, state: p.state };
}
export function heartbeat(p: { version: number }): HeartbeatMsg {
  return { v: PROTOCOL_VERSION, t: 'heartbeat', version: p.version };
}
export function hostChanged(p: { hostPlayerId: string }): HostChangedMsg {
  return { v: PROTOCOL_VERSION, t: 'hostChanged', hostPlayerId: p.hostPlayerId };
}

export function serialize(msg: LocalMpMessage): string {
  return JSON.stringify(msg);
}

const isStr = (x: unknown): x is string => typeof x === 'string';
const isNum = (x: unknown): x is number => typeof x === 'number';

/** Total parser: typed message or null. Never throws. */
export function parseMessage(raw: string): LocalMpMessage | null {
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== 'object') return null;
  if (obj.v !== PROTOCOL_VERSION) return null;

  switch (obj.t) {
    case 'submitWord':
      if (!isStr(obj.word) || !isStr(obj.playerId)) return null;
      if (obj.seq !== undefined && !isNum(obj.seq)) return null;
      return obj as unknown as SubmitWordMsg;
    case 'join':
      if (!isStr(obj.playerId) || !isStr(obj.displayName)) return null;
      return obj as unknown as JoinMsg;
    case 'resyncRequest':
      if (!isStr(obj.playerId)) return null;
      return obj as unknown as ResyncRequestMsg;
    case 'state':
      if (!isNum(obj.version) || !('state' in obj)) return null;
      return obj as unknown as StateMsg;
    case 'heartbeat':
      if (!isNum(obj.version)) return null;
      return obj as unknown as HeartbeatMsg;
    case 'hostChanged':
      if (!isStr(obj.hostPlayerId)) return null;
      return obj as unknown as HostChangedMsg;
    default:
      return null;
  }
}

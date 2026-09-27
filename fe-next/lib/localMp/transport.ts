/**
 * LocalP2PTransport — a Socket.IO-shaped facade over the native P2P bridge.
 *
 * The rest of the app already speaks emit/on; this lets the local-mesh path
 * reuse that surface unchanged. It is switched in only at "Create/Join Local
 * Game" — the online Express+Socket.IO path is untouched.
 *
 * Responsibilities (all pure-TS, transport-agnostic):
 *  - map transient endpoint IDs ↔ stable player IDs
 *  - serialize outbound emits and broadcast to all connected peers (or one)
 *  - parse inbound bridge messages and dispatch to type-keyed handlers
 *  - never throw on a garbled inbound message (lossy link safety)
 */
import type { NativeP2PBridge, BridgeEventPayload, ConnectedPayload, MessagePayload, EndpointLostPayload } from './types';
import {
  PROTOCOL_VERSION,
  parseMessage,
  serialize,
  type LocalMpMessage,
  type LocalMpMessageType,
} from './protocol';

type Handler = (msg: LocalMpMessage, fromEndpointId: string) => void;

export class LocalP2PTransport {
  private readonly bridge: NativeP2PBridge;
  /** endpointId → stable playerId */
  private readonly peers = new Map<string, string>();
  private readonly handlers = new Map<LocalMpMessageType, Set<Handler>>();
  private host = false;

  constructor(bridge: NativeP2PBridge) {
    this.bridge = bridge;
    this.bridge.addListener('connected', (p) => this.onConnected(p as ConnectedPayload));
    this.bridge.addListener('endpointLost', (p) => this.onLost(p as EndpointLostPayload));
    this.bridge.addListener('message', (p) => this.onMessage(p as MessagePayload));
  }

  setHost(isHost: boolean): void {
    this.host = isHost;
  }
  isHost(): boolean {
    return this.host;
  }

  getConnectedPlayers(): string[] {
    return [...this.peers.values()];
  }

  getConnectedEndpoints(): string[] {
    return [...this.peers.keys()];
  }

  /**
   * Send a message. With `toEndpointId` → unicast; without → broadcast to every
   * connected peer. `payload` is merged with `{v,t}` by the protocol builder
   * upstream; here we accept an already-built LocalMpMessage-shaped object.
   */
  async emit(
    type: LocalMpMessageType,
    payload: Record<string, unknown>,
    toEndpointId?: string,
  ): Promise<void> {
    // Stamp the protocol version so receivers' parseMessage accepts it.
    const data = serialize({ v: PROTOCOL_VERSION, t: type, ...payload } as unknown as LocalMpMessage);
    if (toEndpointId) {
      await this.bridge.sendMessage(toEndpointId, data);
      return;
    }
    await Promise.all(
      this.getConnectedEndpoints().map((endpointId) => this.bridge.sendMessage(endpointId, data)),
    );
  }

  on(type: LocalMpMessageType, handler: Handler): void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler);
  }

  off(type: LocalMpMessageType, handler: Handler): void {
    this.handlers.get(type)?.delete(handler);
  }

  private onConnected(p: ConnectedPayload): void {
    this.peers.set(p.endpointId, p.playerId);
  }

  private onLost(p: EndpointLostPayload): void {
    this.peers.delete(p.endpointId);
  }

  private onMessage(p: MessagePayload): void {
    const msg = parseMessage(p.data); // null on garbage — ignore, never throw
    if (!msg) return;
    const set = this.handlers.get(msg.t);
    if (!set) return;
    for (const handler of set) handler(msg, p.endpointId);
  }
}

export type { BridgeEventPayload };

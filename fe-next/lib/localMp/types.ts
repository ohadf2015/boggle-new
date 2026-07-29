/**
 * Contract between the WebView JS local-MP layer and the native Capacitor
 * plugin (Android Nearby Connections / iOS MultipeerConnectivity). The plugin
 * implements NativeP2PBridge; everything above it (transport, protocol,
 * election, host loop) is pure TS and unit-testable with a fake bridge.
 *
 * Mirrors @squareetlabs/capacitor-nearby-multipeer's surface so an off-the-shelf
 * plugin can satisfy it with a thin adapter.
 */

export type BridgeEvent = 'endpointFound' | 'connected' | 'message' | 'endpointLost';

export interface EndpointFoundPayload {
  endpointId: string;
  displayName?: string;
}
export interface ConnectedPayload {
  endpointId: string;
  /** Stable, app-level player ID (NOT the transient endpoint ID). */
  playerId: string;
}
export interface MessagePayload {
  endpointId: string;
  /** Serialized protocol message (see protocol.ts). */
  data: string;
}
export interface EndpointLostPayload {
  endpointId: string;
}

export type BridgeEventPayload =
  | EndpointFoundPayload
  | ConnectedPayload
  | MessagePayload
  | EndpointLostPayload;

export interface NativeP2PBridge {
  startAdvertising(opts: { displayName: string; serviceId: string }): Promise<void>;
  startDiscovery(opts: { serviceId: string }): Promise<void>;
  connect(endpointId: string): Promise<void>;
  sendMessage(endpointId: string, data: string): Promise<void>;
  stop(): Promise<void>;
  addListener(event: BridgeEvent, cb: (payload: BridgeEventPayload) => void): void;
}

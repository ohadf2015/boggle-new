# Local-Mesh MP — Implementation Spec (Prototype)

**Date:** 2026-06-05
**Parent:** `docs/2026-06-05-offline-and-mesh-spec.md` (Section B, council-validated).
**Goal:** no-internet local multiplayer — Android Nearby Connections `P2P_STAR` + iOS MultipeerConnectivity, **authoritative host running the existing pure game loop in WebView JS**, thin clients over a Socket.IO-shaped facade.

## Slices

| Slice | What | Where it runs | Testable here? |
|---|---|---|---|
| **1. NativeP2PBridge interface** | The contract the Capacitor plugin implements (advertise/discover/connect/send + events). | TS type | n/a |
| **2. LocalP2PTransport facade** | Socket.IO-shaped `emit/on/off/broadcast/getConnectedPlayers/isHost` over an injected bridge. | WebView JS | ✅ TDD (fake bridge) |
| **3. Protocol** | Versioned messages: client→host (`submitWord`, `join`), host→all (`state`, `heartbeat`, `hostChanged`, `resyncRequest`). Pure serialize/parse + guards. | WebView JS | ✅ TDD |
| **4. Host election** | Deterministic: highest stable player ID among connected peers. Same input → same output on every peer. | WebView JS | ✅ TDD |
| **5. Snapshot/resync** | Host broadcasts full serializable game-state snapshots (versioned) + heartbeats; new host re-inits from last snapshot. | WebView JS | ✅ TDD (pure) |
| **6. Host loop adapter** | Run existing pure validation/scoring/timer/bots on the elected host, fed by the transport instead of Socket.IO. | WebView JS | ⚠️ integration |
| **7. Capacitor plugin** | Kotlin (Nearby Connections) + Swift (MultipeerConnectivity) implementing NativeP2PBridge. Prefer `@squareetlabs/capacitor-nearby-multipeer`; thin-wrap if gaps. | Native | ❌ device lab |
| **8. UI flows** | Create/Join Local Game, nearby list, hosting/waiting/error states. `t()` ×5 + RTL. | WebView JS | ✅ |

**This session = slices 1–4** (the pure TS foundation everything plugs into), TDD. Slices 5–8 follow once a device confirms the plugin (council's step 1).

## Design

### NativeP2PBridge (slice 1)
```ts
interface NativeP2PBridge {
  startAdvertising(opts: { displayName: string; serviceId: string }): Promise<void>;
  startDiscovery(opts: { serviceId: string }): Promise<void>;
  connect(endpointId: string): Promise<void>;
  sendMessage(endpointId: string, data: string): Promise<void>;
  stop(): Promise<void>;
  addListener(event: BridgeEvent, cb: (payload: BridgeEventPayload) => void): void;
}
```
Events: `endpointFound`, `connected`, `message`, `endpointLost`. Mirrors `@squareetlabs/capacitor-nearby-multipeer`.

### LocalP2PTransport (slice 2)
Wraps the bridge; the rest of the app keeps using a Socket.IO-shaped surface:
- `emit(type, payload, toEndpoint?)` → `bridge.sendMessage` (broadcast to all connected when `toEndpoint` omitted), payload = `JSON.stringify(envelope(type, payload))`.
- `on(type, handler)` / `off(type, handler)` — bridge `message` → parse → dispatch by type.
- `getConnectedPlayers()`, `isHost()`.
- Tracks connected endpoint↔player map; drops malformed messages without throwing.

### Protocol (slice 3)
`{ v: PROTOCOL_VERSION, t: type, ...fields }`. `parseMessage` returns a typed union or `null` (never throws) on malformed/version-mismatch — caller ignores nulls. Keeps payloads < 2KB (Nearby byte limit 32KB).

### Host election (slice 4)
`electHost(connectedPlayerIds: string[]): string` → lexicographically max stable ID. Empty → throws (caller guards). Pure, deterministic, run identically on every peer after `endpointLost`.

## Rules
TDD RED-first per behavior. Files < 500 lines, components < 300. All new UI text via `t()` ×5 + Hebrew RTL. `npm run lint && test && build` per phase. The online Socket.IO path stays untouched — the facade is switched in only at "Create/Join Local Game".

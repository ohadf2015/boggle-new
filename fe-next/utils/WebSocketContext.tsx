/**
 * WebSocket Context - Legacy Compatibility Layer
 * This file re-exports from SocketContext for backwards compatibility.
 * All new code should use SocketContext directly.
 */

export {
  SocketContext as WebSocketContext,
  SocketProvider,
  useSocket,
  useSocketOptional,
  useSocketEvent,
  useSocketEmit,
  useGameSocket,
  useWebSocket,
  useWebSocketOptional,
} from './SocketContext';

export type {
  SocketContextValue,
  GameSocketOperations,
} from './SocketContext';

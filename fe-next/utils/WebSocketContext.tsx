/**
 * WebSocket Context - Legacy Compatibility Layer
 *
 * @deprecated This file is deprecated and will be removed in v2.0.
 * Import directly from './SocketContext' instead.
 *
 * Migration guide:
 *   Before: import { WebSocketContext, useWebSocket } from '@/utils/WebSocketContext'
 *   After:  import { SocketContext, useSocket } from '@/utils/SocketContext'
 *
 * The 'useWebSocket' hook is an alias for 'useSocket'.
 */

// Log deprecation warning in development (only on first import)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.warn(
    '[DEPRECATION] WebSocketContext.tsx is deprecated. ' +
    'Import from SocketContext.tsx directly: ' +
    "import { SocketContext, useSocket } from '@/utils/SocketContext'"
  );
}

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

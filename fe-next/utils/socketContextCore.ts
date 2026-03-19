'use client';

/**
 * Socket Context Core — lightweight definitions without socket.io-client dependency.
 *
 * This file exists so that components that only CONSUME the socket context
 * (like useLiveRoomStats on the landing page) don't force Turbopack to compile
 * the entire socket.io-client library on cold page loads.
 *
 * The full SocketContext.tsx re-exports everything from here and adds the
 * provider + connection logic that requires socket.io-client.
 */

import { createContext, useContext } from 'react';
import type { Socket } from 'socket.io-client';

export interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  isReconnecting: boolean;
  connectionError: string | null;
  reconnectAttempt: number;
  maxReconnectAttempts: number;
  manualReconnect: () => void;
}

export const SocketContext = createContext<SocketContextValue | null>(null);

/**
 * Optional hook — returns null when no SocketProvider is present.
 * Safe to use on pages without game providers (e.g. landing page).
 */
export function useSocketOptional(): SocketContextValue | null {
  return useContext(SocketContext);
}

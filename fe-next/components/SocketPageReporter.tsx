'use client';

/**
 * SocketPageReporter
 *
 * Reports the client's current route over the (already-open) game socket so the
 * admin live monitor can break the raw socket connection count down by page.
 * Mounted inside the SocketProvider tree, so it only runs where a socket exists
 * (game/realtime routes) — exactly the connections the admin sees counted.
 *
 * Fires on first connect, on reconnect (isConnected flips true), and on every
 * route change. The server stashes the normalized path on socket.data.page.
 */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSocketOptional } from '@/utils/SocketContext';

export default function SocketPageReporter() {
  const pathname = usePathname();
  const ctx = useSocketOptional();
  const socket = ctx?.socket ?? null;
  const isConnected = ctx?.isConnected ?? false;

  useEffect(() => {
    if (!socket || !isConnected || !pathname) return;
    socket.emit('pageView', { path: pathname });
  }, [socket, isConnected, pathname]);

  return null;
}

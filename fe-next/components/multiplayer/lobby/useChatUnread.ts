'use client';

import { useEffect, useRef, useState } from 'react';

interface ChatSocket {
  on: (event: string, fn: (data: { username?: string }) => void) => unknown;
  off: (event: string, fn: (data: { username?: string }) => void) => unknown;
}

/**
 * Unread badge for the lobby's chat icon. Chat lives in a sheet on phones, so
 * RoomChat is unmounted while closed — this listens to the same `chatMessage`
 * broadcast on its own and counts other people's lines until the sheet opens.
 */
export function useChatUnread({ socket, username, open }: { socket: ChatSocket | null | undefined; username: string; open: boolean }): number {
  const [unread, setUnread] = useState(0);
  const live = useRef({ open, username });
  live.current = { open, username };

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  useEffect(() => {
    if (!socket) return undefined;
    const onMessage = (data: { username?: string }) => {
      if (live.current.open || data?.username === live.current.username) return;
      setUnread((n) => n + 1);
    };
    socket.on('chatMessage', onMessage);
    return () => {
      socket.off('chatMessage', onMessage);
    };
  }, [socket]);

  return open ? 0 : unread;
}

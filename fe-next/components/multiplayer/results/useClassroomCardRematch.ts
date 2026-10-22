'use client';

import { useCallback, useState } from 'react';

interface Input {
  socket: unknown;
  /** The screen's own host start; the server deals the board from the room record. */
  start: () => void | Promise<void>;
}

export function useClassroomCardRematch({ socket, start }: Input) {
  const [offline, setOffline] = useState(false);
  const rematch = useCallback(() => {
    if (!socket) {
      setOffline(true);
      return;
    }
    setOffline(false);
    void start();
  }, [socket, start]);
  return { rematch, offline };
}

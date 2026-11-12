import { useEffect } from 'react';
import toast from 'react-hot-toast';
import type { Socket } from 'socket.io-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { arcadeAutoFillToastKey } from '@/components/education/lobby/practiceBotsRefusal';

/** The lobby's bot fill is answered by `autoFillRefused` alone; this is its one visible signal. */
export function useArcadeAutoFillRefusal(socket: Pick<Socket, 'on' | 'off'> | null | undefined): void {
  const { t } = useLanguage();
  useEffect(() => {
    if (!socket) return;
    const onRefused = (payload: { reason?: unknown } | undefined) => {
      const key = arcadeAutoFillToastKey(payload?.reason);
      if (key) toast.error(t(key), { duration: 4000 });
    };
    socket.on('autoFillRefused', onRefused);
    return () => {
      socket.off('autoFillRefused', onRefused);
    };
  }, [socket, t]);
}

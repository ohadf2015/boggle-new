'use client';

import { useEffect, useRef, useState } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSharedSocketIfExists } from '@/utils/SocketContext';
import { PRESS, type Translate } from '@/components/education/live/eduLiveStyles';
import { LOBBY_LOCK_EVENTS, LOBBY_LOCK_FAILED, type LobbyLockChange } from '@/shared/types/classroomLobbyLock';

const K = 'education.projectorLobby.lock';
const ACK_TIMEOUT_MS = 5000;

export function useProjectorLobbyLock(gameCode: string) {
  const [socket] = useState(getSharedSocketIfExists);
  const [locked, setLocked] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const ackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => socket.emit(LOBBY_LOCK_EVENTS.get, { gameCode });
    const settle = () => {
      if (ackTimer.current) clearTimeout(ackTimer.current);
      ackTimer.current = null;
      setPending(false);
    };
    const onChanged = (data: LobbyLockChange) => {
      if (data?.gameCode !== gameCode) return;
      settle();
      setLocked(data.locked);
      setFailed(false);
    };
    const onError = (data: { code?: string; gameCode?: string }) => {
      if (data?.code !== LOBBY_LOCK_FAILED || (data.gameCode && data.gameCode !== gameCode)) return;
      settle();
      setFailed(true);
    };
    socket.on(LOBBY_LOCK_EVENTS.changed, onChanged);
    socket.on('classroomGameError', onError);
    socket.on('rateLimited', settle);
    socket.on('connect', refresh);
    refresh();
    return () => {
      settle();
      socket.off(LOBBY_LOCK_EVENTS.changed, onChanged);
      socket.off('classroomGameError', onError);
      socket.off('rateLimited', settle);
      socket.off('connect', refresh);
    };
  }, [socket, gameCode]);

  const toggle = () => {
    if (!socket || pending) return;
    setPending(true);
    setFailed(false);
    socket.emit(LOBBY_LOCK_EVENTS.set, { gameCode, locked: !locked });
    ackTimer.current = setTimeout(() => {
      ackTimer.current = null;
      setPending(false);
      socket.emit(LOBBY_LOCK_EVENTS.get, { gameCode });
    }, ACK_TIMEOUT_MS);
  };

  return { available: !!socket, locked, pending, failed, toggle };
}

export function ProjectorLobbyLock({ gameCode, t, className }: { gameCode: string; t: Translate; className?: string }) {
  const { available, locked, pending, failed, toggle } = useProjectorLobbyLock(gameCode);
  if (!available) return null;
  const Icon = locked ? Lock : LockOpen;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <button
        type="button"
        data-testid="projector-lobby-lock"
        aria-pressed={locked}
        aria-busy={pending || undefined}
        onClick={toggle}
        title={t(locked ? `${K}.lockedHint` : `${K}.ctaHint`)}
        className={cn(
          'inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-neo border-2 bg-neo-navy px-4 py-2 font-neo-display font-bold text-neo-cream text-[clamp(1rem,min(1.4cqw,2.6cqh),2rem)]',
          PRESS,
          locked ? 'border-neo-lime ring-2 ring-neo-lime' : 'border-neo-cream/60',
          pending && 'opacity-70'
        )}
      >
        <Icon className="size-[1em] shrink-0" strokeWidth={2.75} aria-hidden="true" />
        <span className="@max-5xl:sr-only">{t(locked ? `${K}.locked` : `${K}.cta`)}</span>
      </button>
      {failed && (
        <p role="alert" className="font-neo-body text-sm font-bold text-neo-pink">
          {t(`${K}.failed`)}
        </p>
      )}
    </div>
  );
}

export default ProjectorLobbyLock;

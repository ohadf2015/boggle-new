'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Lock, LockOpen } from 'lucide-react';
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

/** The rarer lobby controls, collapsed: Start stays the one obvious action. A lock that is on still shows on the row. */
export function ProjectorLobbyLock({ gameCode, t, className }: { gameCode: string; t: Translate; className?: string }) {
  const { available, locked, pending, failed, toggle } = useProjectorLobbyLock(gameCode);
  const [open, setOpen] = useState(false);
  if (!available) return null;
  const Icon = locked ? Lock : LockOpen;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <button
        type="button"
        data-testid="projector-more"
        aria-expanded={open}
        aria-controls="projector-more-panel"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex min-h-11 w-full items-center justify-between gap-2 whitespace-nowrap rounded-neo border-[3px] border-dashed border-neo-cream/50 px-3 py-2 font-neo-body font-bold text-neo-cream/85 hover:border-neo-cream/80 hover:text-neo-cream text-[clamp(0.9375rem,min(1.1cqw,2cqh),1.5rem)]',
          PRESS
        )}
      >
        <span>{t('eduShell.host.moreOptions')}</span>
        {locked && !open && (
          <span data-testid="projector-more-locked" className="inline-flex items-center gap-1 rounded-neo border-[3px] border-neo-black bg-neo-cream px-2 font-neo-display text-[0.85em] font-black text-neo-black">
            <Lock className="size-[1em]" strokeWidth={2.75} aria-hidden="true" />
            {t(`${K}.locked`)}
          </span>
        )}
        <ChevronDown className={cn('size-[1em] shrink-0 transition-transform motion-reduce:transition-none', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && (
        <div id="projector-more-panel" className="flex flex-col gap-1.5">
          <button
            type="button"
            data-testid="projector-lobby-lock"
            aria-pressed={locked}
            aria-busy={pending || undefined}
            onClick={toggle}
            className={cn(
              'inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-neo border-[3px] px-4 py-2 font-neo-display font-black shadow-hard text-[clamp(1rem,min(1.3cqw,2.4cqh),1.75rem)]',
              PRESS,
              locked ? 'border-neo-black bg-neo-cream text-neo-black' : 'border-neo-cream/50 bg-neo-navy-elevated text-neo-cream',
              pending && 'opacity-70'
            )}
          >
            <Icon className="size-[1em] shrink-0" strokeWidth={2.75} aria-hidden="true" />
            {t(locked ? `${K}.locked` : `${K}.cta`)}
          </button>
          <p className="font-neo-body text-neo-cream/80 text-[clamp(0.8125rem,min(1cqw,1.9cqh),1.25rem)]">{t(locked ? `${K}.lockedHint` : `${K}.ctaHint`)}</p>
        </div>
      )}
      {failed && (
        <p role="alert" className="font-neo-body text-sm font-bold text-neo-pink">
          {t(`${K}.failed`)}
        </p>
      )}
    </div>
  );
}

export default ProjectorLobbyLock;

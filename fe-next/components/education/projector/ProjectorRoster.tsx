'use client';

import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Check, Loader2, Users, X } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { Avatar as AvatarType } from '@/shared/types/game';
import type { KickStatus } from '@/hooks/useKickStudent';
import { cn } from '@/lib/utils';
import { EDU_MASCOT } from '@/lib/education/mascotArt';
import { PRESS, tiltOf, type Translate } from '@/components/education/live/eduLiveStyles';
import { arrivalsSince, chipAccent, isArrivalBurst, recordArrivals, rosterTier } from './projectorLobbyModel';

export interface ProjectorStudent {
  username: string;
  isBot?: boolean;
  /** Stored avatar when the room carries it; absent = a face seeded from the name. */
  avatar?: AvatarType | null;
}

interface ProjectorRosterProps {
  /** Already filtered: the host is the screen, never a name on the wall. */
  students: ProjectorStudent[];
  readyUsernames?: string[];
  t: Translate;
  /** Host-only. Absent = read-only, no edit control. */
  onRemove?: (username: string) => void;
  removeStatusOf?: (username: string) => KickStatus;
}

interface ArrivalLog {
  key: string | null;
  names: string[] | null;
  /** Chips that landed during a burst stay still for good, so a later render never replays their pop. */
  still: ReadonlySet<string>;
  arrived: number;
}

const RECENT_WINDOW_MS = 1000;

function useArrivals(names: string[], onArrive?: () => void): ArrivalLog {
  const log = useRef<ArrivalLog>({ key: null, names: null, still: new Set(), arrived: 0 });
  const recent = useRef<number[]>([]);
  const key = names.join('\u0000');
  if (log.current.key !== key) {
    const arrived = arrivalsSince(log.current.names, names);
    const still = new Set([...log.current.still].filter((name) => names.includes(name)));
    if (isArrivalBurst(recent.current.length, arrived.length)) arrived.forEach((name) => still.add(name));
    log.current = { key, names, still, arrived: arrived.length };
  }
  const current = log.current;
  const announce = useRef(onArrive);
  useEffect(() => {
    announce.current = onArrive;
  }, [onArrive]);

  useEffect(() => {
    if (current.arrived === 0) return;
    recent.current = recordArrivals(recent.current, current.arrived, Date.now());
    announce.current?.();
    const expire = setTimeout(() => {
      recent.current = recordArrivals(recent.current, 0, Date.now());
    }, RECENT_WINDOW_MS);
    return () => clearTimeout(expire);
  }, [current]);

  return current;
}

export const ProjectorRoster = memo<ProjectorRosterProps>(function ProjectorRoster({ students, readyUsernames = [], t, onRemove, removeStatusOf }) {
  const { playPlayerJoinedSound } = useSoundEffects();
  const ready = useMemo(() => new Set(readyUsernames), [readyUsernames]);
  const readyCount = students.filter((s) => ready.has(s.username)).length;
  const tier = rosterTier(students.length);
  const names = useMemo(() => students.map((s) => s.username), [students]);
  const arrivals = useArrivals(names, playPlayerJoinedSound);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const canEdit = !!onRemove && students.length > 0;

  return (
    <section
      data-testid="projector-roster"
      className="@container flex min-h-0 flex-1 flex-col gap-[clamp(0.5rem,1.2cqw,1rem)] rounded-neo-lg border-4 border-neo-cream bg-neo-navy/95 p-[clamp(0.75rem,1.4cqw,1.5rem)] shadow-hard-lg"
    >
      <header className="flex flex-wrap items-center gap-x-[clamp(0.5rem,1.5cqw,1.5rem)] gap-y-2">
        <h2 data-testid="projector-count" className="inline-flex items-center gap-[0.3em] font-neo-display font-black leading-none text-neo-cream text-[clamp(1.25rem,min(3.6cqw,4cqh),3.25rem)]">
          <Users className="size-[1em] shrink-0 text-neo-lime" aria-hidden="true" />
          <span key={students.length} className="inline-block tabular-nums motion-safe:animate-[edu-live-tick_260ms_cubic-bezier(0.23,1,0.32,1)]">
            {t('eduLiveRoom.lobby.joined', { count: students.length })}
          </span>
        </h2>
        {students.length > 0 && (
          <div
            data-testid="projector-ready-count"
            role="progressbar"
            aria-valuenow={readyCount}
            aria-valuemin={0}
            aria-valuemax={students.length}
            aria-label={t('eduLiveRoom.lobby.readyCount', { ready: readyCount, total: students.length })}
            className="flex min-w-[min(100%,12rem)] flex-1 items-center gap-[0.6em] font-neo-body font-bold text-neo-cream/85 text-[clamp(0.875rem,min(1.8cqw,2.2cqh),1.75rem)]"
          >
            <span className="shrink-0 tabular-nums">{t('eduLiveRoom.lobby.readyCount', { ready: readyCount, total: students.length })}</span>
            <span className="relative h-[0.7em] min-w-0 flex-1 overflow-hidden rounded-full border-2 border-neo-cream/60 bg-neo-navy">
              <span
                className="absolute inset-y-0 start-0 rounded-full bg-neo-lime transition-[width] duration-500 ease-out motion-reduce:transition-none"
                style={{ width: `${Math.round((readyCount / students.length) * 100)}%` }}
              />
            </span>
          </div>
        )}
        {canEdit && (
          <button
            type="button"
            data-testid="projector-edit-roster"
            aria-pressed={editing}
            onClick={() => setEditing((v) => !v)}
            className={cn(
              'ms-auto inline-flex min-h-11 items-center gap-1.5 rounded-neo border-2 px-3 font-neo-body text-sm font-bold',
              editing ? 'border-neo-lime bg-neo-lime/10 text-neo-lime' : 'border-neo-cream/60 bg-neo-navy-light text-neo-cream',
              PRESS
            )}
          >
            {editing && <Check className="size-4" aria-hidden="true" />}
            {t(editing ? 'eduLiveRoom.lobby.doneEditing' : 'eduLiveRoom.lobby.editRoster')}
          </button>
        )}
      </header>

      {students.length === 0 ? (
        <div data-testid="projector-roster-empty" className="grid min-h-0 flex-1 place-items-center p-4 text-center">
          <div className="flex flex-col items-center gap-[clamp(0.5rem,1cqh,1rem)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- mascot art map path, decorative */}
            <img
              src={EDU_MASCOT.scanJoin}
              alt=""
              aria-hidden="true"
              className="pointer-events-none size-[clamp(6rem,min(24cqw,28cqh),22rem)] select-none motion-safe:animate-[edu-live-bob_2.4s_ease-in-out_infinite]"
            />
            <p className="font-neo-display font-black text-neo-cream text-[clamp(1.25rem,min(3.6cqw,4cqh),3rem)]">{t('eduLiveRoom.lobby.waitingTitle')}</p>
            <p className="max-w-[34ch] font-neo-body font-bold text-neo-cream/75 text-[clamp(0.875rem,min(1.9cqw,2.4cqh),1.75rem)]">{t('eduLiveRoom.lobby.waitingHint')}</p>
          </div>
        </div>
      ) : (
        <ul
          data-testid="projector-roster-list"
          data-burst={arrivals.still.size > 0 ? 'true' : 'false'}
          className={cn('grid min-h-0 flex-1 auto-rows-min content-start pe-1 pt-1', tier.grid, tier.scrolls ? 'overflow-y-auto' : 'overflow-visible')}
        >
          {students.map((student, index) => {
            const status = removeStatusOf?.(student.username) ?? 'idle';
            const isReady = ready.has(student.username);
            return (
              <li
                key={student.username}
                data-testid="projector-student"
                data-ready={isReady ? 'true' : 'false'}
                data-dim={readyCount > 0 && !isReady ? 'true' : 'false'}
                style={{ '--tilt': tiltOf(student.username) } as CSSProperties}
                className={cn(
                  'relative flex min-w-0 items-center gap-[0.35em] rounded-full py-[0.15em] pe-[0.6em] ps-[0.15em] font-neo-display font-black leading-none',
                  isReady ? 'shadow-[0_0_0_3px_var(--neo-lime),4px_4px_0_rgb(var(--neo-black))]' : 'shadow-hard-sm',
                  readyCount > 0 && !isReady && 'brightness-[0.65] saturate-[0.6]',
                  !arrivals.still.has(student.username) && 'motion-safe:animate-[edu-live-pop_260ms_cubic-bezier(0.23,1,0.32,1)_backwards]',
                  tier.chip,
                  chipAccent(student.username, index)
                )}
              >
                <span aria-hidden="true" className="inline-flex size-[1.5em] shrink-0 overflow-hidden rounded-full border-[3px] border-neo-black bg-neo-cream">
                  <Avatar userId={student.username} customAvatar={student.avatar?.customAvatar ?? undefined} size="xl" disableEffects className="!h-full !w-full" />
                </span>
                <span dir="auto" title={student.username} className="min-w-0 flex-1 truncate">
                  {student.username}
                </span>
                {editing && !student.isBot && status === 'failed' && (
                  <span data-testid="projector-remove-failed" role="status" className="shrink-0 rounded-full bg-neo-navy px-1.5 font-neo-body text-[0.6em] font-bold text-neo-pink">
                    {t('eduLiveRoom.lobby.removeFailed')}
                  </span>
                )}
                {editing && !student.isBot && (
                  <button
                    type="button"
                    data-testid="projector-remove"
                    disabled={status === 'removing'}
                    aria-busy={status === 'removing'}
                    aria-label={t('eduLiveRoom.lobby.removeStudent', { name: student.username })}
                    title={t('eduLiveRoom.lobby.removeStudent', { name: student.username })}
                    onClick={() => setPending(student.username)}
                    className={cn('grid size-[1.4em] min-h-11 min-w-11 shrink-0 place-items-center rounded-full border-2 border-neo-black bg-neo-cream text-neo-black', PRESS)}
                  >
                    {status === 'removing' ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <X className="size-4" strokeWidth={3} aria-hidden="true" />}
                  </button>
                )}
                {!editing && isReady && (
                  <span data-testid="projector-ready-check" aria-hidden="true" className="absolute -end-1 -top-1 grid size-[0.8em] min-h-4 min-w-4 place-items-center rounded-full border-2 border-neo-black bg-neo-white text-neo-black">
                    <Check className="size-[0.55em] min-h-2.5 min-w-2.5" strokeWidth={4} />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {onRemove && (
        <ConfirmationDialog
          open={pending !== null}
          onOpenChange={(open) => !open && setPending(null)}
          title={pending ? t('eduLiveRoom.lobby.removeConfirmTitle', { name: pending }) : undefined}
          description={t('eduLiveRoom.lobby.removeConfirmBody')}
          confirmText={t('eduLiveRoom.lobby.removeConfirm')}
          cancelText={t('common.cancel')}
          variant="danger"
          analyticsId="edu_lobby_remove_student"
          onConfirm={() => {
            if (pending) onRemove(pending);
            setPending(null);
          }}
        />
      )}
    </section>
  );
});

export default ProjectorRoster;

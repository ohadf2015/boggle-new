'use client';

import { useState, type CSSProperties } from 'react';
import { Check, Loader2, UserMinus, Users, X } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { cn } from '@/lib/utils';
import { chipAccent } from '@/components/education/projector/projectorLobbyModel';
import type { ProjectorStudent } from '@/components/education/projector/ProjectorRoster';
import type { KickStatus } from '@/hooks/useKickStudent';
import { EDU_MASCOT } from '@/lib/education/mascotArt';
import { lobbyRosterLayout } from './eduLobbyRosterModel';
import { PRESS, tiltOf, type Translate } from './eduLiveStyles';

interface EduLobbyRosterProps {
  students: ProjectorStudent[];
  readyUsernames: string[];
  t: Translate;
  /** Host-only. Absent = the roster is read-only and shows no edit control. */
  onRemove?: (username: string) => void;
  removeStatusOf?: (username: string) => KickStatus;
}

export function EduLobbyRoster({ students, readyUsernames, t, onRemove, removeStatusOf }: EduLobbyRosterProps) {
  const ready = new Set(readyUsernames);
  const layout = lobbyRosterLayout(students.length);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const canEdit = !!onRemove && students.length > 0;

  return (
    <section
      data-testid="edu-lobby-roster"
      className="flex min-h-0 flex-1 flex-col gap-3 max-md:flex-none rounded-neo-lg border-4 border-neo-cream bg-neo-navy/95 p-3 shadow-hard-lg md:gap-[0.8vw] md:p-[1vw]"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 data-testid="edu-lobby-count" className="inline-flex items-center gap-2 font-neo-display text-2xl font-black text-neo-cream md:text-[2vw]">
          <Users className="size-7 text-neo-lime md:size-[2vw]" aria-hidden="true" />
          <span key={students.length} className="inline-block motion-safe:animate-[edu-live-tick_260ms_cubic-bezier(0.23,1,0.32,1)]">
            {t('eduLiveRoom.lobby.joined', { count: students.length })}
          </span>
        </h2>
        <div className="flex items-center gap-2">
          {ready.size > 0 && (
            <span className="rounded-full border-2 border-neo-cream/50 px-3 py-0.5 font-neo-body text-sm font-bold text-neo-cream/85 md:text-[0.95vw]">
              {t('eduLiveRoom.lobby.readyCount', { ready: students.filter((s) => ready.has(s.username)).length, total: students.length })}
            </span>
          )}
          {canEdit && (
            <button
              type="button"
              data-testid="edu-lobby-edit-roster"
              aria-pressed={editing}
              onClick={() => setEditing((v) => !v)}
              className={cn(
                'inline-flex min-h-10 items-center gap-1.5 rounded-neo border-2 px-3 font-neo-body text-sm font-bold md:text-[0.9vw]',
                editing ? 'border-neo-lime bg-neo-lime/10 text-neo-lime' : 'border-neo-cream/60 bg-neo-navy-light text-neo-cream',
                PRESS
              )}
            >
              {editing ? <Check className="size-4" aria-hidden="true" /> : <UserMinus className="size-4" aria-hidden="true" />}
              {t(editing ? 'eduLiveRoom.lobby.doneEditing' : 'eduLiveRoom.lobby.editRoster')}
            </button>
          )}
        </div>
      </header>

      {students.length === 0 ? (
        <div data-testid="edu-lobby-empty" className="grid min-h-0 flex-1 place-items-center p-4 text-center">
          <div className="flex flex-col items-center gap-2 md:gap-[0.6vw]">
            {/* eslint-disable-next-line @next/next/no-img-element -- mascot art map path, decorative */}
            <img src={EDU_MASCOT.scanJoin} alt="" aria-hidden="true" className="pointer-events-none size-32 select-none motion-safe:animate-[edu-live-bob_2.4s_ease-in-out_infinite] md:size-[min(14vw,30vh)]" />
            <p className="font-neo-display text-2xl font-black text-neo-cream md:text-[2vw]">{t('eduLiveRoom.lobby.waitingTitle')}</p>
            <p className="max-w-[34ch] font-neo-body text-base font-bold text-neo-cream/75 md:text-[1.1vw]">{t('eduLiveRoom.lobby.waitingHint')}</p>
          </div>
        </div>
      ) : (
        <ul
          data-testid="edu-lobby-roster-list"
          className={cn('grid min-h-0 flex-1 auto-rows-min content-start pe-1 pt-1 max-md:flex-none', layout.grid, layout.scrolls ? 'md:overflow-y-auto' : 'md:overflow-hidden')}
        >
          {students.map((student, index) => {
            const status = removeStatusOf?.(student.username) ?? 'idle';
            return (
              <li
                key={student.username}
                data-testid="edu-lobby-student"
                style={{ '--tilt': tiltOf(student.username) } as CSSProperties}
                className={cn(
                  'relative flex min-w-0 items-center gap-2 rounded-full shadow-hard-sm motion-safe:animate-[edu-live-pop_340ms_cubic-bezier(0.34,1.56,0.64,1)_both]',
                  'font-neo-display font-black',
                  layout.chip,
                  chipAccent(student.username, index)
                )}
              >
                <span aria-hidden="true" className={cn('inline-flex shrink-0 overflow-hidden rounded-full border-[3px] border-neo-black bg-neo-cream', layout.avatar)}>
                  <Avatar userId={student.username} customAvatar={student.avatar?.customAvatar ?? undefined} size="xl" disableEffects className="!h-full !w-full" />
                </span>
                <span dir="auto" title={student.username} className="min-w-0 flex-1 truncate">
                  {student.username}
                </span>
                {editing && !student.isBot && status === 'failed' && (
                  <span data-testid="edu-lobby-remove-failed" role="status" className="shrink-0 rounded-full bg-neo-navy px-1.5 font-neo-body text-[0.7em] font-bold text-neo-pink">
                    {t('eduLiveRoom.lobby.removeFailed')}
                  </span>
                )}
                {editing && !student.isBot && (
                  <button
                    type="button"
                    data-testid="edu-lobby-remove"
                    disabled={status === 'removing'}
                    aria-busy={status === 'removing'}
                    aria-label={t('eduLiveRoom.lobby.removeStudent', { name: student.username })}
                    title={t('eduLiveRoom.lobby.removeStudent', { name: student.username })}
                    onClick={() => setPending(student.username)}
                    className={cn('grid size-7 shrink-0 place-items-center rounded-full border-2 border-neo-black bg-neo-cream text-neo-black md:size-[max(1.6vw,1.75rem)]', PRESS)}
                  >
                    {status === 'removing' ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <X className="size-4" strokeWidth={3} aria-hidden="true" />}
                  </button>
                )}
                {!editing && ready.has(student.username) && (
                  <span aria-hidden="true" className="absolute -end-1 -top-1 grid size-5 place-items-center rounded-full border-2 border-neo-black bg-neo-white text-neo-black">
                    <Check className="size-3" strokeWidth={4} />
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
}

export default EduLobbyRoster;

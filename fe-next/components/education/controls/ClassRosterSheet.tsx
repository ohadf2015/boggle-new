'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, RotateCcw, UserMinus, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RosterRow } from './classActivityModel';
import type { KickStatus } from '@/hooks/useKickStudent';

/** An armed "remove" disarms itself, same as the end-round confirm. */
const DISARM_MS = 6_000;

interface ClassRosterSheetProps {
  rows: RosterRow[];
  statusOf: (username: string) => KickStatus;
  onRemove: (username: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * The class list, opened from the pulse chip on the control strip.
 *
 * Stuck students float to the top so the teacher never scrolls to find them.
 * Removal is two-tap and states, in words, that the student cannot rejoin —
 * the server adds them to `game.kickedPlayers` for the rest of the session,
 * which is a heavy thing to do to a child by mis-tap.
 */
export function ClassRosterSheet({ rows, statusOf, onRemove, t }: ClassRosterSheetProps) {
  const [armed, setArmed] = useState<string | null>(null);
  const disarmRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDisarm = useCallback(() => {
    if (disarmRef.current) {
      clearTimeout(disarmRef.current);
      disarmRef.current = null;
    }
  }, []);

  useEffect(() => clearDisarm, [clearDisarm]);

  const arm = useCallback(
    (username: string) => {
      setArmed(username);
      clearDisarm();
      disarmRef.current = setTimeout(() => {
        setArmed(null);
        disarmRef.current = null;
      }, DISARM_MS);
    },
    [clearDisarm],
  );

  const confirm = useCallback(
    (username: string) => {
      clearDisarm();
      setArmed(null);
      onRemove(username);
    },
    [clearDisarm, onRemove],
  );

  return (
    <div
      data-testid="teacher-class-roster"
      className={cn(
        // Same width as the bar it hangs off, so the sheet and the strip read as
        // one object on the projector.
        'pointer-events-auto mx-auto mb-2 w-full max-w-6xl tv:max-w-[100rem]',
        'rounded-neo border-3 tv:border-4 border-neo-black bg-neo-cream shadow-hard-lg',
        'max-h-[46vh] overflow-y-auto p-2 tv:p-4',
      )}
    >
      <h2 className="px-1 pb-2 font-neo-display text-sm lg:text-lg xl:text-xl tv:text-2xl font-black uppercase tracking-widest text-neo-black/60">
        {t('education.liveControls.rosterTitle')}
      </h2>

      {rows.length === 0 ? (
        <p className="px-1 pb-2 font-neo-body text-base lg:text-xl xl:text-2xl font-bold text-neo-black/70">
          {t('education.liveControls.rosterEmpty')}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => {
            const status = statusOf(row.username);
            const isArmed = armed === row.username;
            return (
              <li
                key={row.username}
                data-testid={`teacher-roster-row-${row.username}`}
                data-status={status}
                data-idle={row.isIdle ? 'true' : 'false'}
                className={cn(
                  'flex flex-wrap items-center gap-2 tv:gap-4 rounded-neo border-3 border-neo-black p-2 tv:p-3',
                  row.isIdle ? 'bg-neo-yellow' : 'bg-neo-white',
                  status === 'removing' && 'opacity-60',
                )}
              >
                <span className="min-w-0 flex-1 truncate font-neo-display text-lg lg:text-2xl xl:text-3xl tv:text-4xl font-black text-neo-black">
                  {row.username}
                </span>

                {row.isIdle ? (
                  <span className="inline-flex items-center gap-1 rounded-md border-2 border-neo-black bg-neo-pink px-2 py-1 font-neo-display text-xs lg:text-base xl:text-lg tv:text-xl font-black uppercase text-neo-white">
                    <Zap className="h-3 w-3 tv:h-5 tv:w-5" aria-hidden="true" />
                    {t('education.liveControls.idleBadge')}
                  </span>
                ) : (
                  <span
                    aria-label={t('education.liveControls.wordsFound', { count: row.wordsFound })}
                    className="rounded-md border-2 border-neo-black bg-neo-lime px-2 py-1 font-neo-display text-xs lg:text-base xl:text-lg tv:text-xl font-black uppercase tabular-nums text-neo-black"
                  >
                    {row.wordsFound}
                  </span>
                )}

                {isArmed ? (
                  <span className="flex flex-1 basis-full flex-wrap items-center justify-end gap-2">
                    <span
                      data-testid={`teacher-remove-warning-${row.username}`}
                      className="inline-flex items-center gap-1 font-neo-body text-xs lg:text-base xl:text-lg tv:text-xl font-bold text-neo-black/80"
                    >
                      <AlertTriangle className="h-4 w-4 tv:h-6 tv:w-6" aria-hidden="true" />
                      {t('education.liveControls.removeWarning')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setArmed(null)}
                      className="min-h-[56px] rounded-neo border-3 border-neo-black bg-neo-white px-3 font-neo-display text-sm lg:text-lg xl:text-xl tv:text-2xl font-black uppercase text-neo-black shadow-hard"
                    >
                      {t('education.liveControls.removeCancel')}
                    </button>
                    <button
                      type="button"
                      data-testid={`teacher-remove-confirm-${row.username}`}
                      onClick={() => confirm(row.username)}
                      className="min-h-[56px] rounded-neo border-3 border-neo-black bg-neo-red px-3 font-neo-display text-sm lg:text-lg xl:text-xl tv:text-2xl font-black uppercase text-neo-white shadow-hard animate-pulse"
                    >
                      {t('education.liveControls.removeConfirm', { name: row.username })}
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    data-testid={`teacher-remove-${row.username}`}
                    onClick={() => (status === 'removing' ? undefined : arm(row.username))}
                    disabled={status === 'removing'}
                    aria-label={t('education.liveControls.removeAria', { name: row.username })}
                    className={cn(
                      'inline-flex min-h-[56px] items-center gap-2 rounded-neo border-3 border-neo-black px-3 tv:px-5',
                      'font-neo-display text-sm lg:text-lg xl:text-xl tv:text-2xl font-black uppercase shadow-hard',
                      status === 'failed' ? 'bg-neo-red text-neo-white' : 'bg-neo-cream text-neo-black',
                      status === 'removing' && 'cursor-not-allowed',
                    )}
                  >
                    {status === 'failed' ? (
                      <RotateCcw className="h-4 w-4 tv:h-6 tv:w-6" aria-hidden="true" />
                    ) : (
                      <UserMinus className="h-4 w-4 tv:h-6 tv:w-6" aria-hidden="true" />
                    )}
                    <span>
                      {status === 'removing'
                        ? t('education.liveControls.removing')
                        : status === 'failed'
                          ? t('education.liveControls.removeFailed')
                          : t('education.liveControls.remove')}
                    </span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default ClassRosterSheet;

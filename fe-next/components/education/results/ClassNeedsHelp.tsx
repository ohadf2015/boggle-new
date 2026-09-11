/**
 * ClassNeedsHelp — who to pull aside, while the class is still in the room.
 *
 * Kahoot has this exact panel ("Need help 3", three names, three percentages)
 * and buries it in a report the teacher opens after the lesson. By then the
 * children have gone. This puts the same answer on the screen the room is
 * already looking at, next to the Rematch button, so the next round can be
 * aimed at the two students who need it.
 *
 * The rule is deliberately one a teacher can repeat out loud: UNDER HALF the
 * lesson words. A percentile or a "bottom three" names somebody in every class,
 * including the class where everyone did fine — which trains teachers to ignore
 * the panel. A quiet class with no one under half says so instead of rendering
 * an ambiguous blank (Class 4: a silent no-op reads exactly like a bug).
 *
 * Teacher-only. `masteryByPlayer` is server-built and already excludes bots
 * (backend/modules/classroomSummary), so nothing is recomputed here.
 *
 * Dark-only surface — `bg-neo-navy-elevated` hardcoded, never the cream/dark
 * pair that flashes cream on a lazy mount (Class 5).
 */

'use client';

import { LifeBuoy, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClassroomPlayerMastery } from '@/shared/types/classroom';

/** Names printed at most, so one rough round does not list the whole register. */
const MAX_NAMES = 4;

export interface StudentNeedingHelp {
  username: string;
  found: number;
  total: number;
}

/**
 * Students who found under half the lesson words, furthest behind first.
 * Empty for a solo room: "needs help" is a comparison, and there is no class.
 */
export function pickStudentsNeedingHelp(
  masteryByPlayer: Record<string, ClassroomPlayerMastery>
): StudentNeedingHelp[] {
  const rows = Object.entries(masteryByPlayer);
  if (rows.length < 2) return [];
  return rows
    .filter(([, m]) => m.total > 0 && m.found * 2 < m.total)
    .map(([username, m]) => ({ username, found: m.found, total: m.total }))
    .sort((a, b) => a.found / a.total - b.found / b.total || a.username.localeCompare(b.username))
    .slice(0, MAX_NAMES);
}

export interface ClassNeedsHelpProps {
  masteryByPlayer: Record<string, ClassroomPlayerMastery>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function ClassNeedsHelp({ masteryByPlayer, t }: ClassNeedsHelpProps) {
  const players = Object.keys(masteryByPlayer).length;
  if (players < 2) return null;

  const behind = pickStudentsNeedingHelp(masteryByPlayer);

  if (behind.length === 0) {
    return (
      <p
        data-testid="class-needs-help-none"
        className={cn(
          'mb-4 flex items-center gap-2 p-3 rounded-neo border-[2px] border-neo-black',
          'bg-neo-lime text-neo-black font-neo-body font-bold text-sm shadow-hard-sm'
        )}
      >
        <PartyPopper className="w-5 h-5 shrink-0" aria-hidden />
        {t('education.results.needsHelp.none')}
      </p>
    );
  }

  return (
    <section
      data-testid="class-needs-help"
      className="mb-4 p-3 rounded-neo border-[2px] border-neo-black bg-neo-navy-elevated shadow-hard-sm"
    >
      <p className="mb-2 flex items-center gap-2 font-neo-display font-bold text-sm uppercase tracking-wide text-neo-orange">
        <LifeBuoy className="w-5 h-5 shrink-0" aria-hidden />
        {t('education.results.needsHelp.title', { count: behind.length })}
      </p>
      <ul className="flex flex-wrap gap-2">
        {behind.map((student) => (
          <li
            key={student.username}
            data-testid={`needs-help-${student.username}`}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-neo border-[2px] border-neo-black',
              'bg-neo-navy text-neo-white font-neo-body font-bold text-sm'
            )}
          >
            <span className="truncate max-w-[9rem]">{student.username}</span>
            <span className="shrink-0 tabular-nums text-neo-orange">
              {student.found}/{student.total}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 font-neo-body text-neo-white/60 text-xs">
        {t('education.results.needsHelp.hint')}
      </p>
    </section>
  );
}

export default ClassNeedsHelp;

'use client';

import type { ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { m } from 'framer-motion';
import { BookOpenCheck, CalendarDays, ClipboardList, Flame, Target, X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import AvatarLite, { type AvatarLiteConfig } from '@/components/AvatarLite';
import { EDU_MOTION, useReducedMotionSafe } from '@/components/education/motion';
import { NB_DIALOG_CLOSE, NB_DIALOG_TITLE } from '@/components/teacher/nb/nbDialogStyles';
import { NB_BLOCK, NB_DARK_EDGE, NB_SMALL } from '@/components/teacher/nb/nbStyles';
import { lastPlayedLabel } from './HomeClassList';
import type { RosterRow, RosterStatus } from './rosterModel';

type T = (key: string, params?: Record<string, string | number>) => string;

export const STATUS_DOT: Record<RosterStatus, string> = {
  done: 'bg-neo-lime',
  late: 'bg-neo-yellow',
  idle: 'border-2 border-neo-cream/40 bg-transparent',
};

export function StatusDot({ status, className }: { status: RosterStatus; className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-testid="home-roster-dot"
      data-status={status}
      className={cn('inline-block size-2.5 shrink-0 rounded-full', STATUS_DOT[status], className)}
    />
  );
}

// Only Behind is solid so the eye lands on who needs help, not on the many who played.
const STATUS_PILL: Record<RosterStatus, string> = {
  done: 'border-neo-lime/60 bg-neo-lime/20 text-neo-lime',
  late: 'border-neo-black bg-neo-yellow text-neo-black shadow-hard-sm',
  idle: 'border-neo-cream/30 bg-neo-cream/15 text-neo-cream/90',
};

export const STATUS_RING: Record<RosterStatus, string> = {
  done: 'ring-neo-lime',
  late: 'ring-neo-yellow',
  idle: 'ring-neo-cream/30',
};

export function StatusPill({ status, label }: { status: RosterStatus; label: string }) {
  return (
    <span
      data-testid="home-roster-pill"
      data-status={status}
      className={cn('inline-block max-w-full truncate rounded-full border-2 px-2 py-px font-neo-body text-xs font-black', STATUS_PILL[status])}
    >
      {label}
    </span>
  );
}

interface DetailProps {
  row: RosterRow;
  isRTL?: boolean;
  onClose: () => void;
  onAssign?: (row: RosterRow) => void;
  language: string;
  nowMs: number;
  t: T;
}

function DetailBody({ row, onClose, onAssign, language, nowMs, t, titleAs }: DetailProps & { titleAs: 'h3' | 'dialog' }) {
  const name = <span dir="auto">{row.name}</span>;
  const played = row.lastPracticeDate ? lastPlayedLabel(row.lastPracticeDate, language, nowMs) : t('eduShell.home.roster.notYet');
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <AvatarLite userId={row.id} customAvatar={row.avatarConfig as AvatarLiteConfig | null} pixelSize={44} className="shrink-0" />
        <div className="min-w-0 flex-1">
          {titleAs === 'dialog' ? (
            <DialogPrimitive.Title className={cn(NB_DIALOG_TITLE, 'truncate text-neo-cream')}>{name}</DialogPrimitive.Title>
          ) : (
            <h3 className={cn(NB_DIALOG_TITLE, 'truncate text-neo-cream')}>{name}</h3>
          )}
          <p className="mt-1">
            <StatusPill status={row.status} label={t(`eduShell.home.roster.status.${row.status}`)} />
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className={NB_DIALOG_CLOSE}
        >
          <X className="size-5" strokeWidth={3} aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat icon={<Zap className="size-4 text-neo-yellow" aria-hidden="true" />} value={row.xp.toLocaleString(language)} label={t('eduShell.home.roster.statXp')} />
        <Stat icon={<BookOpenCheck className="size-4 text-neo-lime" aria-hidden="true" />} value={row.wordsMastered.toLocaleString(language)} label={t('eduShell.home.roster.statWords')} />
      </div>

      <div>
        <h4 className="mb-1.5 font-neo-display text-sm font-black text-neo-cream">{t('eduShell.home.roster.recent')}</h4>
        <ul data-testid="home-roster-activity" className={cn('divide-y-2 divide-neo-cream/15 rounded-neo-lg border-[3px] bg-neo-navy-light', NB_DARK_EDGE)}>
          <Activity icon={<CalendarDays className="size-4" aria-hidden="true" />} text={t('eduShell.home.roster.lastPlayed', { when: played })} />
          <Activity icon={<Flame className="size-4" aria-hidden="true" />} text={row.streak > 0 ? t('eduShell.home.roster.streak', { count: row.streak }) : t('eduShell.home.roster.noStreak')} />
          <Activity
            icon={<Target className="size-4" aria-hidden="true" />}
            text={row.wordsAttempted > 0 ? t('eduShell.home.roster.accuracy', { count: Math.round(row.accuracy) }) : t('eduShell.home.roster.noWordsYet')}
          />
        </ul>
      </div>

      {onAssign && row.status !== 'done' ? (
        <button
          type="button"
          onClick={() => onAssign(row)}
          className={cn(NB_SMALL, NB_BLOCK.cyan, 'min-h-12 w-full text-base')}
        >
          <ClipboardList className="size-5" aria-hidden="true" />
          {t('eduShell.home.focus.assign')}
        </button>
      ) : null}
    </div>
  );
}

function Stat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div data-testid="home-roster-stat" className={cn('rounded-neo-lg border-[3px] bg-neo-navy-light px-3 py-2 shadow-hard', NB_DARK_EDGE)}>
      <span className="flex items-center gap-1.5 font-neo-display text-lg font-black tabular-nums text-neo-cream">
        {icon}
        {value}
      </span>
      <span className="block font-neo-body text-xs font-semibold text-neo-cream/70">{label}</span>
    </div>
  );
}

function Activity({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-2 px-3 py-1.5 font-neo-body text-sm font-semibold text-neo-cream/85">
      <span className="text-neo-cream/60">{icon}</span>
      {text}
    </li>
  );
}

/** The wide-screen drawer: sits beside the list, slides in from the inline end. */
export function RosterDrawer(props: DetailProps) {
  const reduced = useReducedMotionSafe();
  return (
    <m.aside
      key={props.row.id}
      data-testid="home-roster-drawer"
      aria-label={props.row.name}
      initial={reduced ? false : { x: props.isRTL ? -16 : 16, scale: 0.98 }}
      animate={{ x: 0, scale: 1 }}
      transition={EDU_MOTION.spring.settle}
      className="min-w-0 border-neo-cream/15 p-3 sm:p-4 @3xl/roster:border-s-2"
    >
      <DetailBody {...props} titleAs="h3" />
    </m.aside>
  );
}

/** The phone sheet: a bottom dialog, static backdrop, transform-only slide. */
export function RosterSheet(props: DetailProps) {
  const reduced = useReducedMotionSafe();
  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && props.onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-90 bg-neo-black/85" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn('fixed inset-x-0 bottom-0 z-90 max-h-[85dvh] overflow-y-auto rounded-t-neo-xl border-[3px] border-b-0 bg-neo-navy px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 focus:outline-none', NB_DARK_EDGE)}
        >
          <m.div initial={reduced ? false : { y: 48 }} animate={{ y: 0 }} transition={EDU_MOTION.spring.settle}>
            <span aria-hidden="true" className="mx-auto mb-3 block h-1.5 w-12 rounded-full bg-neo-cream/40" />
            <DetailBody {...props} titleAs="dialog" />
          </m.div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

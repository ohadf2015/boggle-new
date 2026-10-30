'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { m, AnimatePresence } from 'framer-motion';
import {
  Copy,
  Share2,
  Edit2,
  Trash2,
  ChevronRight,
  GraduationCap,
  MoreHorizontal,
  Play,
  MonitorPlay,
  ClipboardList,
  BarChart3,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { LANGUAGE_LABEL_KEYS } from '@/lib/i18n/languageLabels';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import ClassroomStudentList from '../ClassroomStudentList';
import { GoogleClassroomRosterImport } from './GoogleClassroomRosterImport';
import { StudentCapMeter } from '../StudentCapMeter';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { OUTLINE_BUTTON, PRIMARY_BUTTON } from '../home/homeStyles';
import { slideUp } from '../teacherDashboardTabs';

export interface ClassCardData {
  id: string;
  name: string;
  language: string;
  join_code: string;
  member_count?: number;
}

export interface ClassCardProps {
  classroom: ClassCardData;
  /** The full roster dialog is open. */
  expanded: boolean;
  onToggleExpanded: () => void;
  onCopy: () => void;
  onShare: () => void;
  /** Google Classroom share URL, or null when it cannot be built (SSR). */
  googleHref: string | null;
  onEdit: () => void;
  onDelete: () => void;
  /** The last game line. */
  activity?: ReactNode;
  /** A few student faces beside the roster button. */
  studentPreview?: ReactNode;
  /** Opens Pick-a-game with this class preselected. */
  startGameHref?: string;
  /** Quiet private practice with bots, under Pick a game. */
  rehearse?: ReactNode;
  assignHref?: string;
  reportHref?: string;
  onOpenProjector?: () => void;
}

const SMALL_ACTION = cn(OUTLINE_BUTTON, 'min-h-10 min-w-0 whitespace-normal px-2 text-center leading-tight');

const MENU_ITEM =
  'flex min-h-11 w-full items-center gap-2 rounded-neo px-3 text-start font-neo-body text-sm font-bold text-neo-cream hover:bg-neo-cream/10 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cream';

/**
 * One class on the Classes tab. The join code is the only cream tile, Pick a
 * game the only lime fill; the full roster opens in a dialog so the page never
 * grows. Rename, delete and Google Classroom live behind the menu.
 */
export function ClassCard({
  classroom,
  expanded,
  onToggleExpanded,
  onCopy,
  onShare,
  googleHref,
  onEdit,
  onDelete,
  activity,
  studentPreview,
  startGameHref,
  rehearse,
  assignHref,
  reportHref,
  onOpenProjector,
}: ClassCardProps) {
  const { t } = useLanguage();
  const { hasPro, loading: proLoading } = useTeacherPro();
  const count = classroom.member_count || 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // A document listener, not a `fixed inset-0` backdrop: the card animates in
  // with a transform, which turns `fixed` into "fixed to the card".
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);
  const pick = (fn: () => void) => () => {
    setMenuOpen(false);
    fn();
  };
  const languageKey = LANGUAGE_LABEL_KEYS[classroom.language as keyof typeof LANGUAGE_LABEL_KEYS];
  const actionsLabel = t('academy.teacher.classActions', 'Class actions');

  return (
    <m.div
      variants={slideUp}
      data-testid="classroom-card"
      className="@container relative flex flex-col gap-2.5 rounded-neo-lg border-2 border-neo-cream/40 bg-neo-navy-light p-3 shadow-hard sm:px-4"
    >
      <div className="flex items-center gap-2">
        <h3
          title={classroom.name}
          className="min-w-0 flex-1 line-clamp-2 font-neo-display text-lg font-bold leading-tight text-neo-cream @[24rem]:text-xl"
        >
          <bdi>{classroom.name}</bdi>
        </h3>
        <span
          data-testid="classroom-card-language"
          className="shrink-0 rounded-neo border border-neo-cream/35 px-1.5 py-px font-neo-body text-xs font-bold text-neo-cream/80"
        >
          {languageKey ? t(languageKey) : classroom.language}
        </span>
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            data-testid="classroom-card-menu"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={actionsLabel}
            title={actionsLabel}
            className={cn(OUTLINE_BUTTON, 'size-10 min-h-10 px-0')}
          >
            <MoreHorizontal className="size-5" aria-hidden="true" />
          </button>
          <AnimatePresence>
            {menuOpen ? (
              <m.div
                key="menu"
                role="menu"
                data-testid="classroom-card-menu-panel"
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                className="absolute end-0 top-full z-30 mt-2 w-56 origin-top-right rounded-neo border-2 border-neo-cream/40 bg-neo-navy p-1 shadow-hard-lg rtl:origin-top-left"
              >
                <button type="button" role="menuitem" onClick={pick(onEdit)} className={MENU_ITEM}>
                  <Edit2 className="size-4 shrink-0" aria-hidden="true" />
                  {t('teacher.classroom.edit')}
                </button>
                {googleHref ? (
                  <a
                    href={googleHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    role="menuitem"
                    data-testid="share-to-google-classroom"
                    onClick={() => setMenuOpen(false)}
                    className={MENU_ITEM}
                  >
                    <GraduationCap className="size-4 shrink-0" aria-hidden="true" />
                    {t('teacher.classroom.googleClassroom', 'Post to Google Classroom')}
                  </a>
                ) : null}
                <button type="button" role="menuitem" onClick={pick(onDelete)} className={cn(MENU_ITEM, 'text-neo-red')}>
                  <Trash2 className="size-4 shrink-0" aria-hidden="true" />
                  {t('teacher.classroom.delete')}
                </button>
              </m.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <section aria-labelledby={`class-code-${classroom.id}`} className="flex flex-col gap-1.5">
        <p
          id={`class-code-${classroom.id}`}
          data-testid="invite-students-label"
          className="font-neo-body text-xs font-bold text-neo-cream/70"
        >
          {t('academy.hq.classCode', 'Class code')}
        </p>
        <div className="flex items-stretch gap-2">
          <div
            data-testid="join-code-plate"
            className="flex min-w-0 flex-1 items-center justify-center rounded-neo border-2 border-neo-black bg-neo-cream px-2 py-1.5"
          >
            <code
              data-testid="classroom-join-code"
              dir="ltr"
              className="block whitespace-nowrap text-center font-neo-display text-3xl font-black tabular-nums tracking-wider text-neo-black @[19rem]:text-4xl"
            >
              {classroom.join_code}
            </code>
          </div>
          {onOpenProjector ? (
            <button
              type="button"
              data-testid="classroom-card-projector"
              onClick={onOpenProjector}
              className={cn(SMALL_ACTION, 'w-[38%] shrink-0 flex-col gap-0.5 py-1')}
            >
              <MonitorPlay className="size-4 shrink-0" aria-hidden="true" />
              {t('academy.hq.openProjector', 'Show code on board')}
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" data-testid="copy-join-code" onClick={onCopy} className={SMALL_ACTION}>
            <Copy className="size-4 shrink-0" aria-hidden="true" />
            {t('teacher.classroom.copyCode')}
          </button>
          <button type="button" data-testid="share-join-code" onClick={onShare} className={SMALL_ACTION}>
            <Share2 className="size-4 shrink-0" aria-hidden="true" />
            {t('teacher.classroom.share')}
          </button>
        </div>
      </section>

      {activity}

      <div className="flex min-h-11 items-center gap-2">
        {studentPreview}
        <button
          type="button"
          data-testid="classroom-card-students"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-haspopup="dialog"
          className="inline-flex min-h-11 min-w-0 items-center gap-1 rounded-neo px-1 text-start font-neo-body text-sm font-bold text-neo-cream underline decoration-neo-cream/40 underline-offset-4 hover:decoration-neo-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cream"
        >
          <span className="min-w-0">
            {count === 0
              ? t('teacher.classrooms.students.noneYet')
              : t('teacher.classroom.cardSeeAllStudents', { count })}
          </span>
          <DirectionalIcon icon={ChevronRight} className="size-4 shrink-0" />
        </button>
      </div>

      {hasPro || proLoading ? null : <StudentCapMeter studentCount={count} source="classroom_card" />}

      <div className="mt-auto flex flex-col gap-2">
        {startGameHref ? (
          <Link
            href={startGameHref}
            data-testid="classroom-card-start-game"
            className={cn(PRIMARY_BUTTON, 'w-full min-h-12')}
          >
            <Play className="size-5 shrink-0" strokeWidth={3} aria-hidden="true" />
            {t('eduShell.home.startLive', 'Pick a game')}
          </Link>
        ) : null}
        {assignHref || reportHref ? (
          <div className="grid grid-cols-2 gap-2">
            {assignHref ? (
              <Link href={assignHref} data-testid="classroom-card-assign" className={SMALL_ACTION}>
                <ClipboardList className="size-4 shrink-0" aria-hidden="true" />
                {t('teacher.classroom.cardAssignHomework', 'Assign homework')}
              </Link>
            ) : null}
            {reportHref ? (
              <Link href={reportHref} data-testid="classroom-card-report" className={SMALL_ACTION}>
                <BarChart3 className="size-4 shrink-0" aria-hidden="true" />
                {t('teacher.classroom.cardClassReport', 'Class report')}
              </Link>
            ) : null}
          </div>
        ) : null}
        {rehearse}
      </div>

      <Dialog open={expanded} onOpenChange={(open) => { if (open !== expanded) onToggleExpanded(); }}>
        <DialogContent
          className="max-w-lg border-neo-cream/40 bg-neo-navy-light text-neo-cream"
          closeButtonLabel={t('common.close')}
        >
          <div className="flex max-h-[80dvh] flex-col gap-3 p-4">
            <DialogTitle className="font-neo-display text-xl font-bold text-neo-cream">
              <bdi>{t('teacher.classroom.cardRosterTitle', { name: classroom.name })}</bdi>
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('teacher.classroom.cardSeeAllStudents', { count })}
            </DialogDescription>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <ClassroomStudentList classroomId={classroom.id} joinCode={classroom.join_code} />
              <GoogleClassroomRosterImport classroomId={classroom.id} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </m.div>
  );
}

export default ClassCard;

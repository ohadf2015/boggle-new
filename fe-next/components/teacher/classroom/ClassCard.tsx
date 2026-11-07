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
  Users,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { LANGUAGE_LABEL_KEYS } from '@/lib/i18n/languageLabels';
import { Dialog } from '@/components/ui/dialog';
import { NbDialogBody, NbDialogContent, NbDialogHeader } from '@/components/teacher/nb/NbDialog';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import ClassroomStudentList from '../ClassroomStudentList';
import { GoogleClassroomRosterImport } from './GoogleClassroomRosterImport';
import { StudentCapMeter } from '../StudentCapMeter';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { NB_BLOCK, NB_DARK_EDGE, NB_PANEL, NB_PRIMARY, NB_SMALL, NB_STICKER, type NbColor } from '../nb/nbStyles';
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
  /** The color block on the card's header band; the list rotates it so each class has its own. */
  color?: NbColor;
}

// Below 24rem the code takes its own row so six letters never run under the buttons.
const ICON_SIZE = 'h-12 min-h-12 flex-1 shrink-0 px-0 @[24rem]:w-12 @[24rem]:flex-none';
const ICON_ACTION = cn(NB_SMALL, NB_BLOCK.cream, ICON_SIZE);

const MENU_ITEM =
  'flex min-h-12 w-full items-center gap-3 rounded-neo-lg border-2 border-neo-black bg-white px-3 text-start font-neo-display text-[15px] font-black text-neo-black shadow-hard transition-transform hover:-translate-y-px focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan motion-reduce:transition-none';
const MENU_ICON = 'grid size-8 shrink-0 place-items-center rounded-neo border-2 border-neo-black';

/**
 * One class on the Classes tab, in the game's chunky look: a color band with the
 * class name, the join code on cream tiles, and ONE main button (Start a game).
 * Everything rarer (students, homework, report, practice, rename, Google
 * Classroom, delete) sits behind the "…" menu, so the card stays short and the
 * whole list fits a phone screen.
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
  color = 'pink',
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
  const studentsLabel =
    count === 0 ? t('teacher.classrooms.students.noneYet') : t('teacher.classroom.cardSeeAllStudents', { count });

  return (
    <m.div
      variants={slideUp}
      data-testid="classroom-card"
      data-color={color}
      className={cn(NB_PANEL, '@container relative flex w-full flex-col bg-neo-navy-light')}
    >
      <div
        data-testid="classroom-card-band"
        className={cn(
          'flex items-center gap-2 rounded-t-[13px] border-b-[3px] border-neo-black px-3.5 py-2.5',
          NB_BLOCK[color],
        )}
      >
        <h3
          title={classroom.name}
          className="min-w-0 flex-1 line-clamp-2 font-neo-display text-xl font-black leading-tight @[24rem]:text-2xl"
        >
          <bdi>{classroom.name}</bdi>
        </h3>
        <span data-testid="classroom-card-language" className={cn(NB_STICKER, NB_BLOCK.cream, 'shrink-0')}>
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
            className={cn(NB_SMALL, NB_BLOCK.navy, 'size-11 min-h-11 px-0')}
          >
            <MoreHorizontal className="size-6" aria-hidden="true" />
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
                className="absolute end-0 top-full z-30 mt-2 flex w-72 origin-top-right flex-col gap-2 rounded-neo-xl border-[3px] border-neo-black bg-neo-cream p-2.5 shadow-hard-xl rtl:origin-top-left"
              >
                <button type="button" role="menuitem" data-testid="classroom-card-students" onClick={pick(onToggleExpanded)} aria-haspopup="dialog" aria-expanded={expanded} className={MENU_ITEM}>
                  <span className={cn(MENU_ICON, NB_BLOCK.cyan)}><Users className="size-4" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">{studentsLabel}</span>
                  <DirectionalIcon icon={ChevronRight} className="size-4 shrink-0" />
                </button>
                {assignHref ? (
                  <Link href={assignHref} role="menuitem" data-testid="classroom-card-assign" onClick={() => setMenuOpen(false)} className={MENU_ITEM}>
                    <span className={cn(MENU_ICON, NB_BLOCK.lime)}><ClipboardList className="size-4" aria-hidden="true" /></span>
                    {t('teacher.classroom.cardAssignHomework', 'Assign homework')}
                  </Link>
                ) : null}
                {reportHref ? (
                  <Link href={reportHref} role="menuitem" data-testid="classroom-card-report" onClick={() => setMenuOpen(false)} className={MENU_ITEM}>
                    <span className={cn(MENU_ICON, NB_BLOCK.yellow)}><BarChart3 className="size-4" aria-hidden="true" /></span>
                    {t('teacher.classroom.cardClassReport', 'Class report')}
                  </Link>
                ) : null}
                {rehearse ? (
                  <div data-testid="classroom-card-rehearse" className={cn(MENU_ITEM, '[&_button]:min-h-0 [&_button]:px-0 [&_button]:text-neo-black [&_button]:no-underline')}>
                    {rehearse}
                  </div>
                ) : null}
                <button type="button" role="menuitem" onClick={pick(onEdit)} className={MENU_ITEM}>
                  <span className={cn(MENU_ICON, NB_BLOCK.orange)}><Edit2 className="size-4" aria-hidden="true" /></span>
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
                    <span className={cn(MENU_ICON, NB_BLOCK.purple)}><GraduationCap className="size-4" aria-hidden="true" /></span>
                    {t('teacher.classroom.googleClassroom', 'Post to Google Classroom')}
                  </a>
                ) : null}
                <button type="button" role="menuitem" onClick={pick(onDelete)} className={cn(MENU_ITEM, 'text-neo-pink')}>
                  <span className={cn(MENU_ICON, 'bg-white')}><Trash2 className="size-4" aria-hidden="true" /></span>
                  {t('teacher.classroom.delete')}
                </button>
              </m.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1">
          {studentPreview}
          <span data-testid="classroom-card-count" className="font-neo-body text-sm font-black text-neo-cream">
            {studentsLabel}
          </span>
          {activity}
        </div>

        <section aria-labelledby={`class-code-${classroom.id}`} className="flex flex-wrap items-stretch gap-2 @[24rem]:flex-nowrap">
          <p id={`class-code-${classroom.id}`} data-testid="invite-students-label" className="sr-only">
            {t('academy.hq.classCode', 'Class code')}
          </p>
          <div
            data-testid="join-code-plate"
            className="flex min-h-14 min-w-0 basis-full items-center justify-center rounded-neo-lg border-[3px] border-neo-black bg-neo-cream px-2 shadow-hard-lg @[24rem]:min-h-0 @[24rem]:flex-1 @[24rem]:basis-0"
          >
            <code
              data-testid="classroom-join-code"
              dir="ltr"
              className="block whitespace-nowrap text-center font-neo-display text-3xl font-black tabular-nums tracking-wider text-neo-black @[24rem]:@max-[28rem]:text-2xl"
            >
              {classroom.join_code}
            </code>
          </div>
          <button type="button" data-testid="copy-join-code" onClick={onCopy} aria-label={t('teacher.classroom.copyCode')} title={t('teacher.classroom.copyCode')} className={ICON_ACTION}>
            <Copy className="size-5" aria-hidden="true" />
          </button>
          <button type="button" data-testid="share-join-code" onClick={onShare} aria-label={t('teacher.classroom.share')} title={t('teacher.classroom.share')} className={ICON_ACTION}>
            <Share2 className="size-5" aria-hidden="true" />
          </button>
          {onOpenProjector ? (
            <button
              type="button"
              data-testid="classroom-card-projector"
              onClick={onOpenProjector}
              aria-label={t('academy.hq.openProjector', 'Show code on board')}
              title={t('academy.hq.openProjector', 'Show code on board')}
              className={cn(NB_SMALL, NB_BLOCK.navy, NB_DARK_EDGE, ICON_SIZE)}
            >
              <MonitorPlay className="size-5" aria-hidden="true" />
            </button>
          ) : null}
        </section>

        {hasPro || proLoading ? null : <StudentCapMeter studentCount={count} source="classroom_card" />}

        {startGameHref ? (
          <Link href={startGameHref} data-testid="classroom-card-start-game" className={cn(NB_PRIMARY, 'mt-auto w-full')}>
            <Play className="size-5 shrink-0 fill-current" aria-hidden="true" />
            {t('eduShell.home.startLive', 'Start a game')}
          </Link>
        ) : null}
      </div>

      <Dialog open={expanded} onOpenChange={(open) => { if (open !== expanded) onToggleExpanded(); }}>
        <NbDialogContent size="lg" phone="full">
          <NbDialogHeader
            title={<bdi>{t('teacher.classroom.cardRosterTitle', { name: classroom.name })}</bdi>}
            srDescription={t('teacher.classroom.cardSeeAllStudents', { count })}
            closeLabel={t('common.close')}
          />
          <NbDialogBody>
            <ClassroomStudentList classroomId={classroom.id} joinCode={classroom.join_code} />
            <GoogleClassroomRosterImport classroomId={classroom.id} />
          </NbDialogBody>
        </NbDialogContent>
      </Dialog>
    </m.div>
  );
}

export default ClassCard;

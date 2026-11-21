'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Check,
  ClipboardList,
  Copy,
  Edit2,
  GraduationCap,
  Lightbulb,
  MonitorPlay,
  Play,
  Share2,
  Trash2,
  Users,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { LANGUAGE_LABEL_KEYS } from '@/lib/i18n/languageLabels';
import { Dialog } from '@/components/ui/dialog';
import { NbDialogBody, NbDialogContent, NbDialogHeader } from '@/components/teacher/nb/NbDialog';
import ClassroomStudentList from '../ClassroomStudentList';
import { GoogleClassroomRosterImport } from './GoogleClassroomRosterImport';
import { StudentCapMeter } from '../StudentCapMeter';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { NB_BLOCK, NB_PRIMARY, NB_SECONDARY, NB_STICKER, type NbColor } from '../nb/nbStyles';
import { LIST_CARD_TITLE, ListCard } from '../ListCard';
import { CardMenuAction, CardMenuControl, CardMenuDivider, CardMenuLink, CardOverflowMenu } from '../CardOverflowMenu';

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
  /** Resolves false when the clipboard refused, so the plate never claims a copy that did not happen. */
  onCopy: () => void | boolean | Promise<void | boolean>;
  onShare: () => void;
  /** Opens the same share sheet as Teacher Home's Share code. Empty classes lead with it. */
  onInvite?: () => void;
  /** Google Classroom share URL, or null when it cannot be built (SSR). */
  googleHref: string | null;
  onEdit: () => void;
  onDelete: () => void;
  /** The last game line. */
  activity?: ReactNode;
  /** A few student faces beside the fact line. */
  studentPreview?: ReactNode;
  /** Opens Pick-a-game with this class preselected. */
  startGameHref?: string;
  /** Quiet private practice with bots. */
  rehearse?: ReactNode;
  assignHref?: string;
  reportHref?: string;
  onOpenProjector?: () => void;
  /** The class page; the name links there. */
  classHref?: string;
  /** Free teacher's one class with this week's insight. */
  insightHref?: string;
  /** The band color; the list rotates it so classes are easy to tell apart. */
  color?: NbColor;
}

/** One class on the Classes tab: a color band with its name, the join code, Start a game, and a menu with everything else. */
export function ClassCard({
  classroom,
  expanded,
  onToggleExpanded,
  onCopy,
  onShare,
  onInvite,
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
  classHref,
  insightHref,
  color = 'pink',
}: ClassCardProps) {
  const { t } = useLanguage();
  const { hasPro, loading: proLoading } = useTeacherPro();
  const count = classroom.member_count || 0;
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(id);
  }, [copied]);
  const copyFromPlate = async () => {
    if ((await onCopy()) !== false) setCopied(true);
  };
  const startGameCls = count === 0 ? NB_SECONDARY : NB_PRIMARY;
  const languageKey = LANGUAGE_LABEL_KEYS[classroom.language as keyof typeof LANGUAGE_LABEL_KEYS];
  const studentsLabel =
    count === 0 ? t('teacher.classrooms.students.noneYet') : t('teacher.classroom.cardSeeAllStudents', { count });

  const fact =
    count === 0 ? (
      <span>{t('teacher.pulse.state.noRoster')}</span>
    ) : (
      <>
        {studentPreview}
        {activity ?? <span>{t('teacher.classroom.studentCountPro', { count: String(count) })}</span>}
      </>
    );

  return (
    <ListCard
      data-testid="classroom-card"
      data-color={color}
      color={color}
      titleText={classroom.name}
      title={
        classHref ? (
          <Link href={classHref} data-testid="classroom-card-open" className={LIST_CARD_TITLE}>
            <bdi>{classroom.name}</bdi>
          </Link>
        ) : (
          <bdi>{classroom.name}</bdi>
        )
      }
      tag={
        <span data-testid="classroom-card-language" className={cn(NB_STICKER, NB_BLOCK.cream, 'shrink-0')}>
          {languageKey ? t(languageKey) : classroom.language}
        </span>
      }
      menu={
        <CardOverflowMenu label={t('academy.teacher.classActions', 'Class actions')} testId="classroom-card-menu">
          <CardMenuAction icon={Copy} testId="copy-join-code" onSelect={onCopy}>{t('teacher.classroom.copyCode')}</CardMenuAction>
          <CardMenuAction icon={Share2} testId="share-join-code" onSelect={onShare}>{t('teacher.classroom.share')}</CardMenuAction>
          {onOpenProjector ? (
            <CardMenuAction icon={MonitorPlay} testId="classroom-card-projector" onSelect={onOpenProjector}>
              {t('academy.hq.openProjector', 'Show code on board')}
            </CardMenuAction>
          ) : null}
          {googleHref ? (
            <CardMenuLink icon={GraduationCap} testId="share-to-google-classroom" href={googleHref} external>
              {t('teacher.classroom.googleClassroom', 'Post to Google Classroom')}
            </CardMenuLink>
          ) : null}
          <CardMenuDivider />
          <CardMenuAction icon={Users} testId="classroom-card-students" onSelect={onToggleExpanded} hasPopup="dialog">{studentsLabel}</CardMenuAction>
          {insightHref ? (
            <CardMenuLink icon={Lightbulb} testId="classroom-card-insight" href={insightHref}>{t('teacher.weekInsight.title')}</CardMenuLink>
          ) : null}
          {assignHref ? (
            <CardMenuLink icon={ClipboardList} testId="classroom-card-assign" href={assignHref}>{t('eduShell.home.focus.assign')}</CardMenuLink>
          ) : null}
          {reportHref ? (
            <CardMenuLink icon={BarChart3} testId="classroom-card-report" href={reportHref}>
              {t('teacher.classroom.cardClassReport', 'Class report')}
            </CardMenuLink>
          ) : null}
          {rehearse ? <CardMenuControl testId="classroom-card-rehearse">{rehearse}</CardMenuControl> : null}
          <CardMenuDivider />
          <CardMenuAction icon={Edit2} testId="classroom-card-edit" onSelect={onEdit}>{t('teacher.classroom.edit')}</CardMenuAction>
          <CardMenuAction icon={Trash2} testId="classroom-card-delete" onSelect={onDelete} danger>{t('teacher.classroom.delete')}</CardMenuAction>
        </CardOverflowMenu>
      }
      action={
        <div className="flex flex-col gap-2">
          {count === 0 ? (
            <button
              type="button"
              data-testid="classroom-card-invite"
              aria-haspopup="dialog"
              onClick={onInvite ?? onShare}
              className={cn(NB_PRIMARY, 'min-h-14 w-full text-lg')}
            >
              <Share2 className="size-5 shrink-0" aria-hidden="true" />
              {t('eduShell.home.shareCode', 'Share code')}
            </button>
          ) : null}
          {startGameHref ? (
            <Link href={startGameHref} data-testid="classroom-card-start-game" className={cn(startGameCls, 'min-h-14 w-full text-lg')}>
              <Play className="size-5 shrink-0 fill-current" aria-hidden="true" />
              {t('eduShell.home.startLive', 'Start a game')}
            </Link>
          ) : null}
        </div>
      }
    >
      <div data-testid="classroom-card-fact" className="flex min-h-9 min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-neo-body text-sm font-bold text-neo-cream/85">
        {fact}
      </div>
      <button
        type="button"
        data-testid="join-code-plate"
        aria-label={`${t('teacher.classroom.copyCode')}: ${classroom.join_code}`}
        onClick={() => void copyFromPlate()}
        className="flex min-h-16 w-full flex-col items-center justify-center rounded-neo-lg border-[3px] border-neo-black bg-neo-cream px-2 py-1 shadow-hard-lg transition-[transform,box-shadow] duration-150 hover:-translate-x-px hover:-translate-y-px active:translate-x-[3px] active:translate-y-[3px] active:shadow-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
      >
        <code data-testid="classroom-join-code" dir="ltr" className="whitespace-nowrap font-neo-display text-3xl font-black tabular-nums tracking-wider text-neo-black">
          {classroom.join_code}
        </code>
        <span data-testid="join-code-plate-caption" aria-live="polite" className="inline-flex items-center gap-1 font-neo-body text-xs font-black text-neo-black/65">
          {copied ? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> : <Copy className="size-3.5" strokeWidth={3} aria-hidden="true" />}
          {copied ? t('teacher.classroom.codeCopiedShort') : t('teacher.classroom.tapToCopy')}
        </span>
      </button>
      <Dialog open={expanded} onOpenChange={(open) => { if (open !== expanded) onToggleExpanded(); }}>
        <NbDialogContent size="lg" phone="full">
          <NbDialogHeader
            title={<bdi>{t('teacher.classroom.cardRosterTitle', { name: classroom.name })}</bdi>}
            srDescription={t('teacher.classroom.cardSeeAllStudents', { count })}
            closeLabel={t('common.close')}
          />
          <NbDialogBody>
            {hasPro || proLoading ? null : <StudentCapMeter studentCount={count} source="classroom_card" className="mb-3" />}
            <ClassroomStudentList classroomId={classroom.id} joinCode={classroom.join_code} />
            <GoogleClassroomRosterImport classroomId={classroom.id} />
          </NbDialogBody>
        </NbDialogContent>
      </Dialog>
    </ListCard>
  );
}

export default ClassCard;

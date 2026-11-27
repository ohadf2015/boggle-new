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
import { type NbColor } from '../nb/nbStyles';
import { PressSurface } from '@/components/motion/PressSurface';
import { LIST_CARD_TITLE } from '../ListCard';

const BAND: Record<NbColor, string> = {
  lime: 'bg-neo-lime',
  pink: 'bg-neo-pink',
  cyan: 'bg-neo-cyan',
  yellow: 'bg-neo-yellow',
  purple: 'bg-neo-purple',
  orange: 'bg-neo-orange',
  cream: 'bg-edu-tile',
  navy: 'bg-edu-ink/20',
};
import { CardMenuAction, CardMenuControl, CardMenuDivider, CardMenuLink, CardOverflowMenu } from '../CardOverflowMenu';
import { pluralKeyOf } from '@/lib/i18n/pluralKey';

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
  /** Only the first card on the list gets the lime action, so the screen has one primary. */
  lead?: boolean;
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
  lead = true,
}: ClassCardProps) {
  const { t, language: uiLanguage } = useLanguage();
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
  const languageKey = LANGUAGE_LABEL_KEYS[classroom.language as keyof typeof LANGUAGE_LABEL_KEYS];
  const studentsLabel =
    count === 0 ? t('teacher.classrooms.students.noneYet') : t(pluralKeyOf('teacher.classroom.cardSeeAllStudents', count, uiLanguage), { count });

  const fact =
    count === 0 ? (
      <span>{t('teacher.pulse.state.noRoster')}</span>
    ) : (
      <>
        {studentPreview}
        {activity ?? <span>{t(pluralKeyOf('teacher.classroom.studentCountPro', count, uiLanguage), { count })}</span>}
      </>
    );

  const round = 'grid size-14 shrink-0 place-items-center rounded-full border-[3px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan';
  const roundTone = (main: boolean) => (main ? 'border-neo-black bg-neo-lime text-neo-black' : 'border-edu-line bg-edu-surface text-edu-ink shadow-edu-line');

  return (
    <article
      data-testid="classroom-card"
      data-color={color}
      className="edu-card relative flex w-full min-w-0 flex-col gap-3 overflow-hidden px-4 pb-4 pt-6"
    >
      <span aria-hidden="true" data-testid="classroom-card-band" className={cn('absolute inset-x-0 top-0 h-3 border-b-[3px] border-edu-line', BAND[color])} />
      <div className="min-w-0 pe-14">
        <h3 title={classroom.name} className="line-clamp-2 font-neo-display text-2xl font-black leading-tight text-edu-ink [overflow-wrap:anywhere]">
          {classHref ? (
            <Link href={classHref} data-testid="classroom-card-open" className={LIST_CARD_TITLE}>
              <bdi>{classroom.name}</bdi>
            </Link>
          ) : (
            <bdi>{classroom.name}</bdi>
          )}
        </h3>
        <div data-testid="classroom-card-fact" className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 font-neo-body text-sm font-bold text-edu-ink/80">
          {fact}
          <span data-testid="classroom-card-language" className="text-edu-ink/80">· {languageKey ? t(languageKey) : classroom.language}</span>
        </div>
      </div>
      <div className="mt-auto flex min-w-0 flex-wrap items-center gap-2">
        <div className="flex-[1_0_auto]">
          <button
            type="button"
            data-testid="join-code-plate"
            aria-label={`${t('teacher.classroom.copyCode')}: ${classroom.join_code}`}
            onClick={() => void copyFromPlate()}
            className="inline-flex min-h-11 max-w-full items-center gap-1 rounded-neo text-edu-ink hover:bg-edu-ink/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
          >
            <code data-testid="classroom-join-code" dir="ltr" className="flex gap-0.5 font-neo-display text-sm font-black">
              {[...classroom.join_code].map((ch, i) => (
                <span key={i} data-testid="classroom-join-code-tile" className="edu-tile size-7 rounded-neo border-2 shadow-edu-lip-sm">
                  {ch}
                </span>
              ))}
            </code>
            {copied ? <Check className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" /> : <Copy className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />}
            <span data-testid="join-code-plate-caption" aria-live="polite" className="sr-only">
              {copied ? t('teacher.classroom.codeCopiedShort') : t('teacher.classroom.tapToCopy')}
            </span>
          </button>
        </div>
        <div className="ms-auto flex shrink-0 items-center gap-2">
          {count === 0 ? (
            <PressSurface
              lip={4}
              data-testid="classroom-card-invite"
              aria-haspopup="dialog"
              aria-label={t('eduShell.home.shareCode', 'Share code')}
              title={t('eduShell.home.shareCode', 'Share code')}
              onClick={onInvite ?? onShare}
              className={cn(round, roundTone(lead))}
            >
              <Share2 className="size-6" aria-hidden="true" />
            </PressSurface>
          ) : null}
          {startGameHref ? (
            <PressSurface asChild lip={4} className={cn(round, roundTone(lead && count > 0))}>
              <Link href={startGameHref} data-testid="classroom-card-start-game" aria-label={t('eduShell.home.startLive', 'Start a game')} title={t('eduShell.home.startLive', 'Start a game')}>
                <Play className="size-6 fill-current" aria-hidden="true" />
              </Link>
            </PressSurface>
          ) : null}
        </div>
      </div>
      <div className="absolute end-3 top-6">
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
      </div>
      <Dialog open={expanded} onOpenChange={(open) => { if (open !== expanded) onToggleExpanded(); }}>
        <NbDialogContent size="lg" phone="full">
          <NbDialogHeader
            title={<bdi>{t('teacher.classroom.cardRosterTitle', { name: classroom.name })}</bdi>}
            srDescription={t(pluralKeyOf('teacher.classroom.cardSeeAllStudents', count, uiLanguage), { count })}
            closeLabel={t('common.close')}
          />
          <NbDialogBody>
            {hasPro || proLoading ? null : <StudentCapMeter studentCount={count} source="classroom_card" className="mb-3" />}
            <ClassroomStudentList classroomId={classroom.id} joinCode={classroom.join_code} />
            <GoogleClassroomRosterImport classroomId={classroom.id} />
          </NbDialogBody>
        </NbDialogContent>
      </Dialog>
    </article>
  );
}

export default ClassCard;

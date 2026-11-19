'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  BarChart3,
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
import { NB_PRIMARY, NB_SECONDARY, type NbColor } from '../nb/nbStyles';
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
  onCopy: () => void;
  onShare: () => void;
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
  /** The card's thin edge; the list rotates it so classes are easy to tell apart. */
  color?: NbColor;
  /** The one card on the screen whose Start is the lime primary action. */
  featured?: boolean;
}

const ACCENT: Record<NbColor, string> = {
  lime: 'bg-neo-lime',
  pink: 'bg-neo-pink',
  cyan: 'bg-neo-cyan',
  yellow: 'bg-neo-yellow',
  purple: 'bg-neo-purple',
  orange: 'bg-neo-orange',
  cream: 'bg-neo-cream',
  navy: 'bg-neo-navy-light',
};

/** One class on the Classes tab: its name, one fact, Start a game, and a menu with everything else. */
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
  classHref,
  insightHref,
  color = 'pink',
  featured = false,
}: ClassCardProps) {
  const { t } = useLanguage();
  const { hasPro, loading: proLoading } = useTeacherPro();
  const count = classroom.member_count || 0;
  const languageKey = LANGUAGE_LABEL_KEYS[classroom.language as keyof typeof LANGUAGE_LABEL_KEYS];
  const studentsLabel =
    count === 0 ? t('teacher.classrooms.students.noneYet') : t('teacher.classroom.cardSeeAllStudents', { count });

  const fact =
    count === 0 ? (
      <span>
        {t('teacher.pulse.state.noRoster')}
        {' · '}
        <code dir="ltr" className="font-neo-display font-black tracking-wider text-neo-cream">{classroom.join_code}</code>
      </span>
    ) : (
      <>
        {studentPreview}
        {activity ?? <span>{t('teacher.classroom.studentCountPro', { count: String(count) })}</span>}
      </>
    );

  const menuHeader = (
    <div role="none" className="px-3 pb-2 pt-1.5">
      <p className="font-neo-body text-xs font-bold text-neo-cream/70">
        {t('academy.hq.classCode', 'Class code')}
        {' · '}
        <span data-testid="classroom-card-language">{languageKey ? t(languageKey) : classroom.language}</span>
      </p>
      <code data-testid="classroom-join-code" dir="ltr" className="block font-neo-display text-2xl font-black tracking-wider text-neo-cream">
        {classroom.join_code}
      </code>
    </div>
  );

  return (
    <ListCard
      data-testid="classroom-card"
      data-color={color}
      accentClass={ACCENT[color]}
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
      factTestId="classroom-card-fact"
      fact={fact}
      menu={
        <CardOverflowMenu label={t('academy.teacher.classActions', 'Class actions')} testId="classroom-card-menu" header={menuHeader}>
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
          <CardMenuAction icon={Users} testId="classroom-card-students" onSelect={onToggleExpanded}>{studentsLabel}</CardMenuAction>
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
        startGameHref ? (
          <Link href={startGameHref} data-testid="classroom-card-start-game" className={cn(featured ? NB_PRIMARY : NB_SECONDARY, 'min-h-14 w-full text-lg')}>
            <Play className="size-5 shrink-0 fill-current" aria-hidden="true" />
            {t('eduShell.home.startLive', 'Start a game')}
          </Link>
        ) : null
      }
    >
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

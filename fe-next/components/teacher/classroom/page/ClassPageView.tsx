'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LANGUAGE_LABEL_KEYS } from '@/lib/i18n/languageLabels';
import { NeoButton } from '@/components/ui/button';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { JoinCodeTile } from '../../hq/JoinCodeTile';
import { NB_BLOCK, NB_LINK, NB_PRIMARY, NB_STICKER } from '../../nb/nbStyles';
import { ClassDangerZone, ClassLastGame, ClassWordLists, type ClassLastGameState } from './ClassPageBlocks';
import type { ClassWordList } from './classWordLists';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface ClassPageViewProps {
  classroom: { id: string; name: string; join_code: string; language?: string | null; member_count?: number | null };
  language: string;
  classesHref: string;
  startHref: string;
  resultsHref: string;
  libraryHref: string;
  roster: ReactNode;
  lists: readonly ClassWordList[];
  listsLoading: boolean;
  lastGame: ClassLastGameState;
  onShare: () => void;
  onRequestDelete: () => void;
  t: T;
}

const TILE = 'h-14 w-11 rounded-neo-lg border-[3px] border-neo-black bg-neo-cream font-neo-display text-3xl font-black text-neo-black shadow-hard sm:h-16 sm:w-12 sm:text-4xl';

/** One class: who it is and how students get in, then Start a game, then the class's people, lists and last result. */
export function ClassPageView(props: ClassPageViewProps) {
  const { classroom, t } = props;
  const languageKey = LANGUAGE_LABEL_KEYS[classroom.language as keyof typeof LANGUAGE_LABEL_KEYS];
  const code = Array.from(classroom.join_code);
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 lg:gap-5">
      <Link href={props.classesHref} className={cn(NB_LINK, 'self-start')}>
        <DirectionalIcon icon={ArrowLeft} className="size-4" />
        {t('education.analytics.backToClassroom')}
      </Link>

      <section aria-labelledby="class-page-title" className="flex flex-col gap-4 rounded-neo-xl border-[3px] border-neo-black bg-neo-purple p-4 text-neo-cream shadow-hard-xl sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {languageKey ? <span className={cn(NB_STICKER, NB_BLOCK.cream)}>{t(languageKey)}</span> : null}
            <span className={cn(NB_STICKER, NB_BLOCK.cyan)}>{(classroom.member_count ?? 0) > 0 ? t('teacher.classrooms.students.count', { count: classroom.member_count ?? 0 }) : t('teacher.classrooms.students.empty')}</span>
          </div>
          <h1 id="class-page-title" dir="auto" className="line-clamp-2 font-neo-display text-3xl font-black leading-tight sm:text-5xl [overflow-wrap:anywhere]">
            {classroom.name}
          </h1>
        </div>

        <div className="flex flex-col gap-3 lg:w-[26rem] lg:shrink-0">
          <div className="flex items-center gap-2">
            <p className="sr-only">{t('eduShell.setup.joinCode')}</p>
            <span data-testid="class-page-code" dir="ltr" className="flex min-w-0 flex-1 justify-center gap-1 sm:gap-1.5" aria-label={classroom.join_code}>
              <span className="sr-only">{classroom.join_code}</span>
              {code.map((ch, i) => (
                <JoinCodeTile key={`${ch}-${i}`} ch={ch} index={i} count={code.length} className={TILE} />
              ))}
            </span>
            <NeoButton
              variant="small"
              tone="navy"
              data-testid="class-page-share"
              onClick={props.onShare}
              aria-label={t('eduShell.home.shareCode')}
              title={t('eduShell.home.shareCode')}
              className="size-14 shrink-0 px-0 sm:size-16"
            >
              <Share2 className="size-6" aria-hidden="true" />
            </NeoButton>
          </div>
          <Link href={props.startHref} data-testid="class-page-start" data-hero="true" className={cn(NB_PRIMARY, 'min-h-[60px] w-full text-2xl')}>
            <Play className="size-6 fill-current" aria-hidden="true" />
            {t('eduShell.home.startLive')}
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start lg:gap-5">
        <div className="order-2 min-w-0 lg:order-1">{props.roster}</div>
        <div className="order-1 flex min-w-0 flex-col gap-4 lg:order-2">
          <ClassLastGame state={props.lastGame} resultsHref={props.resultsHref} language={props.language} t={t} />
          <ClassWordLists lists={props.lists} loading={props.listsLoading} libraryHref={props.libraryHref} t={t} />
        </div>
      </div>

      <ClassDangerZone onRequestDelete={props.onRequestDelete} t={t} />
    </div>
  );
}

export default ClassPageView;

'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LANGUAGE_LABEL_KEYS } from '@/lib/i18n/languageLabels';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { HomeHero, type HomeReplay } from '../../home/HomeHero';
import { HomeClassMeta } from '../../home/HomeClassList';
import { NB_LINK } from '../../nb/nbStyles';
import { ClassDangerZone, ClassLastGame, ClassWordLists, type ClassLastGameState } from './ClassPageBlocks';
import type { ClassWordList } from './classWordLists';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface ClassPageViewProps {
  classroom: { id: string; name: string; join_code: string; language?: string | null; member_count?: number | null; created_at?: string };
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
  /** Free-teacher Pro offer. Never replaces Start a game. */
  proOffer?: ReactNode;
  rehearse?: ReactNode;
  replay?: HomeReplay;
  joinGoal?: ReactNode;
}

/** One class, laid out like Home for that class: the same hero and roster, with lists, last game and delete kept quiet below. */
export function ClassPageView(props: ClassPageViewProps) {
  const { classroom, language, lastGame, t } = props;
  const languageKey = LANGUAGE_LABEL_KEYS[classroom.language as keyof typeof LANGUAGE_LABEL_KEYS];
  const [nowMs] = useState(() => Date.now());
  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 lg:gap-5">
      <Link href={props.classesHref} className={cn(NB_LINK, 'self-start')}>
        <DirectionalIcon icon={ArrowLeft} className="size-4" />
        {t('education.analytics.backToClassroom')}
      </Link>

      <HomeHero
        classrooms={[classroom]}
        selectedId={classroom.id}
        onSelect={() => undefined}
        language={language}
        t={t}
        titleLevel={1}
        tone="purple"
        eyebrow={languageKey ? t(languageKey) : null}
        classPageLink={false}
        startHref={props.startHref}
        onShare={props.onShare}
        rehearse={props.rehearse}
        replay={props.replay?.kind === 'ready' ? props.replay : undefined}
        joinGoal={props.joinGoal}
        testIds={{ start: 'class-page-start', code: 'class-page-code', share: 'class-page-share' }}
        meta={
          <HomeClassMeta
            previewIds={[]}
            memberCount={classroom.member_count ?? 0}
            createdAt={classroom.created_at}
            played={lastGame.game?.playedAt}
            pending={lastGame.status === 'loading' || lastGame.status === 'idle'}
            failed={lastGame.status === 'error'}
            language={language}
            nowMs={nowMs}
            t={t}
          />
        }
      />

      {props.proOffer}

      {props.roster}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-start">
        <ClassLastGame state={lastGame} resultsHref={props.resultsHref} language={language} t={t} />
        <ClassWordLists lists={props.lists} loading={props.listsLoading} libraryHref={props.libraryHref} t={t} />
      </div>

      <ClassDangerZone onRequestDelete={props.onRequestDelete} t={t} />
    </div>
  );
}

export default ClassPageView;

'use client';

import type { ReactNode } from 'react';
import { Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NeoButton } from '@/components/ui/button';
import { JoinCodeTile } from '@/components/teacher/hq/JoinCodeTile';
import { NB_BLOCK } from '../nb/nbStyles';

type T = (key: string, params?: Record<string, string | number>) => string;

const TILE =
  'size-11 rounded-neo border-[3px] border-neo-black bg-neo-cream font-neo-display text-2xl font-black uppercase text-neo-black shadow-hard max-[379px]:size-9 max-[379px]:text-xl sm:size-14 sm:text-3xl @5xl/hero:size-16 @5xl/hero:text-4xl [@media(max-height:820px)]:sm:size-12 [@media(max-height:820px)]:sm:text-2xl';

export interface HomeJoinCardProps {
  code: string;
  /** The live joined-vs-goal line for a class still filling up. */
  joinGoal?: ReactNode;
  onShare: () => void;
  t: T;
  className?: string;
  testIds?: { code?: string; share?: string };
}

/** The yellow join card: each code letter on its own tile, one Share, and who has joined so far. */
export function HomeJoinCard({ code, joinGoal, onShare, t, className, testIds }: HomeJoinCardProps) {
  return (
    <div
      data-testid="home-join-row"
      className={cn(
        'flex min-w-0 flex-col items-center gap-2.5 rounded-neo-lg border-[3px] p-2.5 shadow-hard-lg sm:gap-3 sm:p-4',
        NB_BLOCK.yellow,
        className,
      )}
    >
      <div className="flex w-full min-w-0 items-center justify-between gap-2">
        <span className="min-w-0 truncate font-neo-body text-xs font-black uppercase tracking-wide text-neo-black/75">
          {joinGoal ? t('academy.hq.getStudentsIn') : t('academy.hq.classCode')}
        </span>
        <NeoButton
          variant="small"
          tone="navy"
          data-testid={testIds?.share ?? 'home-share-code'}
          aria-haspopup="dialog"
          onClick={onShare}
          className="shrink-0"
        >
          <Share2 className="size-5" aria-hidden="true" />
          {t('eduShell.home.shareCode')}
        </NeoButton>
      </div>
      <p className="flex gap-1 sm:gap-1.5" dir="ltr">
        <span data-testid={testIds?.code ?? 'home-desk-code'} className="sr-only">{code}</span>
        {Array.from(code).map((ch, i, all) => (
          <JoinCodeTile key={`${ch}-${i}`} ch={ch} index={i} count={all.length} data-testid="home-desk-code-tile" className={TILE} />
        ))}
      </p>
      {joinGoal ? <div className="w-full text-center">{joinGoal}</div> : null}
    </div>
  );
}

export default HomeJoinCard;

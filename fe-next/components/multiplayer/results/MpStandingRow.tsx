'use client';

import { forwardRef } from 'react';
import { Bot, ChevronDown, ChevronUp, Crown, Star } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { FriendQuickAction } from '@/components/friends/FriendQuickAction';
import { cn } from '@/lib/utils';
import { podiumTier, type MpStandingRow } from './mpStandings';
import fx from './mpResults.module.css';
import { CROWN_SRC, ResultArt, SPOTLIGHT_SRC } from './MpResultArt';

type TFn = (key: string, params?: Record<string, string | number>) => string;

const PODIUM = [
  { badge: 'bg-neo-lime text-neo-black', row: 'bg-neo-lime text-neo-black border-neo-black' },
  { badge: 'bg-neo-cyan text-neo-black', row: 'bg-neo-navy-light border-neo-cyan' },
  { badge: 'bg-neo-pink text-neo-black', row: 'bg-neo-navy-light border-neo-pink' },
] as const;

export interface MpStandingRowItemProps {
  row: MpStandingRow;
  shown: boolean;
  layout: 'fit' | 'list';
  t: TFn;
}

export const MpStandingRowItem = forwardRef<HTMLLIElement, MpStandingRowItemProps>(function MpStandingRowItem({ row: r, shown, layout, t }, ref) {
  // Ties share a rank (and its colour); 0 points never earn the podium.
  const tier = podiumTier(r);
  const podium = tier ? PODIUM[tier - 1] : null;
  const first = tier === 1;
  const fit = layout === 'fit';
  const anim = fit && shown;
  return (
    <li
      ref={ref}
      data-testid="mp-standing-row"
      data-rank={r.rank}
      data-podium={tier ?? 'none'}
      data-me={String(r.isMe)}
      data-revealed={String(shown)}
      aria-hidden={shown ? undefined : true}
      aria-current={!fit && r.isMe ? 'true' : undefined}
      className={cn(
        'relative isolate flex items-center overflow-hidden rounded-neo border-[3px] shadow-hard-sm',
        fit && 'min-h-0 grow shrink',
        'gap-[calc(10px*var(--mp-u,1))] px-[calc(10px*var(--mp-u,1))]',
        fit
          ? first ? 'basis-[calc(76px*var(--mp-u,1))] max-h-[calc(108px*var(--mp-u,1))] min-h-[calc(44px*var(--mp-u,1))]' : 'basis-[calc(58px*var(--mp-u,1))] max-h-[calc(84px*var(--mp-u,1))] min-h-[calc(34px*var(--mp-u,1))]'
          : cn('shrink-0', first ? 'h-[calc(64px*var(--mp-u,1))]' : 'h-[calc(56px*var(--mp-u,1))]'),
        podium ? podium.row : 'bg-neo-navy-light border-neo-cream/40',
        r.isMe && !first && 'outline-[3px] outline-offset-2 outline-neo-lime outline',
        r.isMe && first && 'outline-[3px] outline-offset-2 outline-neo-white outline',
        !fit && r.isMe && 'sticky top-0 bottom-0 z-10',
        !shown && 'invisible',
        anim && (first ? fx.firstSlam : fx.rowRise),
      )}
    >
      {first && anim && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <ResultArt
            src={SPOTLIGHT_SRC}
            fallback={null}
            className={cn('absolute left-1/2 top-0 max-w-none w-[calc(360px*var(--mp-u,1))] h-[calc(180px*var(--mp-u,1))] object-contain opacity-60', fx.spotlight)}
          />
          <span className={cn('absolute inset-y-0 start-0 block w-1/5 bg-neo-white/45', fx.shine)} />
        </span>
      )}
      <span
        className={cn(
          'relative shrink-0 grid place-items-center rounded-neo border-2 font-neo-display font-bold tabular-nums',
          'w-[calc(34px*var(--mp-u,1))] h-[calc(34px*var(--mp-u,1))] text-[calc(17px*var(--mp-u,1))]',
          podium ? (first ? 'border-neo-black bg-neo-black text-neo-lime' : cn('border-neo-black', podium.badge)) : 'border-neo-cream/40 bg-neo-navy text-neo-white',
        )}
      >
        {r.rank}
      </span>
      <span
        className={cn(
          'relative shrink-0 rounded-full border-2',
          first ? 'border-neo-black' : r.isMe ? 'border-neo-lime' : 'border-neo-cream/40',
        )}
        style={{ width: 'calc(40px * var(--mp-u, 1))', height: 'calc(40px * var(--mp-u, 1))' }}
      >
        <span className="absolute top-0 left-0 block origin-top-left [transform:scale(var(--mp-u,1))]">
          <Avatar avatarImage={r.avatar?.avatarImage} customAvatar={r.avatar?.customAvatar ?? null} userId={r.username} pixelSize={36} disableEffects />
        </span>
        {first && shown && (
          <span data-testid="mp-standing-crown" aria-hidden="true" className={cn('absolute -top-[calc(16px*var(--mp-u,1))] -start-[calc(8px*var(--mp-u,1))] block w-[calc(26px*var(--mp-u,1))] h-[calc(26px*var(--mp-u,1))]', anim && fx.crownDrop)}>
            <ResultArt
              src={CROWN_SRC}
              className="w-full h-full object-contain drop-shadow-[2px_2px_0_rgb(var(--neo-black))]"
              fallback={<Crown className="w-full h-full text-neo-yellow fill-neo-yellow drop-shadow-[2px_2px_0_rgb(var(--neo-black))]" />}
            />
          </span>
        )}
        {r.isBot && (
          <Bot aria-label={t('mpUi.shell.bot')} className="absolute -bottom-1 -end-1 w-4 h-4 rounded-full bg-neo-cyan text-neo-black p-0.5" />
        )}
      </span>
      <span className="min-w-0 flex-1 flex flex-col justify-center leading-tight">
        <span className="flex items-center gap-1.5 min-w-0">
          <span dir="auto" className={cn('truncate font-neo-display font-bold', 'text-[calc(17px*var(--mp-u,1))]')}>
            {r.username}
          </span>
          {r.isMe && (
            <span className={cn('shrink-0 rounded-full border-2 border-neo-black px-1.5 text-[calc(10px*var(--mp-u,1))] font-bold uppercase', first ? 'bg-neo-black text-neo-lime' : 'bg-neo-lime text-neo-black')}>
              {t('mpUi.results.you')}
            </span>
          )}
        </span>
        {(r.roundScore !== undefined || r.seriesTotal !== null || r.bestWord) && (
          <span className={cn('flex items-center gap-1 text-[calc(11px*var(--mp-u,1))] font-neo-body tabular-nums', first ? 'text-neo-black/75' : 'text-neo-white/70')}>
            {r.roundScore !== undefined ? (
              <span
                data-testid="mp-standing-round"
                data-quiet={String(r.roundScore === 0)}
                className={cn('truncate', r.roundScore === 0 && 'opacity-50')}
              >
                {t('mpUi.results.roundGain', { points: `⁦+${r.roundScore}⁩` })}
              </span>
            ) : r.seriesTotal !== null ? (
              <span className="truncate">{t('mpUi.results.seriesTotal', { total: r.seriesTotal })}</span>
            ) : null}
            {r.seriesDelta > 0 && (
              <span data-testid="mp-standing-delta" className={cn('inline-flex items-center font-bold', first ? 'text-neo-black' : 'text-neo-lime', anim && fx.chipPop)}>
                <ChevronUp aria-hidden="true" className="w-3 h-3" />
                {r.seriesDelta}
              </span>
            )}
            {r.seriesDelta < 0 && (
              <span data-testid="mp-standing-delta" className={cn('inline-flex items-center font-bold', first ? 'text-neo-black' : 'text-neo-pink')}>
                <ChevronDown aria-hidden="true" className="w-3 h-3" />
                {Math.abs(r.seriesDelta)}
              </span>
            )}
            {r.bestWord && (
              <span
                data-testid="mp-standing-best"
                className={cn(
                  'inline-flex items-center gap-0.5 min-w-0 rounded-full border-2 px-1.5 leading-none py-[2px] font-bold',
                  first ? 'border-neo-black bg-neo-black text-neo-lime' : 'border-neo-black bg-neo-yellow text-neo-black',
                  anim && fx.wordPop,
                )}
              >
                <Star aria-hidden="true" className="w-3 h-3 shrink-0 fill-current" />
                <span dir="auto" className="truncate uppercase font-neo-display tracking-wide">{r.bestWord.word}</span>
                <span dir="ltr" className="shrink-0 opacity-75">+{r.bestWord.score}</span>
              </span>
            )}
          </span>
        )}
      </span>
      {shown && !r.isMe && !r.isBot && (
        <FriendQuickAction userId={r.userId} name={r.username} surface="mp_results" />
      )}
      <span
        data-testid="mp-standing-score"
        className={cn('shrink-0 font-neo-display font-bold tabular-nums', first ? 'text-[calc(32px*var(--mp-u,1))]' : 'text-[calc(24px*var(--mp-u,1))]')}
      >
        {r.score}
      </span>
    </li>
  );
});

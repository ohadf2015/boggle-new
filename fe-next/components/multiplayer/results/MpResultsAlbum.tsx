'use client';

import { memo, type CSSProperties } from 'react';
import { Layers, Ruler, Star, type LucideIcon } from 'lucide-react';
import Avatar from '@/components/Avatar';
import type { Avatar as AvatarData } from '@/shared/types/game';
import { cn } from '@/lib/utils';
import type { RoundAward, RoundAwards, SeriesGrid } from './mpResultsStory';
import fx from './mpResults.module.css';

type TFn = (key: string, params?: Record<string, string | number>) => string;

/** A small avatar that follows the stage's --mp-u scale (Avatar takes pixels). */
function MiniAvatar({ avatar, userId, px = 22 }: { avatar?: AvatarData; userId: string; px?: number }) {
  return (
    <span
      aria-hidden="true"
      className="relative shrink-0 rounded-full border-2 border-neo-black overflow-hidden"
      style={{ width: `calc(${px + 4}px * var(--mp-u, 1))`, height: `calc(${px + 4}px * var(--mp-u, 1))` }}
    >
      <span className="absolute top-0 left-0 block origin-top-left [transform:scale(var(--mp-u,1))]">
        <Avatar avatarImage={avatar?.avatarImage} customAvatar={avatar?.customAvatar ?? null} userId={userId} pixelSize={px} disableEffects />
      </span>
    </span>
  );
}

const panel = 'rounded-neo-lg border-[3px] border-neo-black bg-neo-navy-light text-neo-white shadow-hard';
const panelTitle = 'font-neo-display font-bold uppercase tracking-wider text-neo-cyan text-[calc(12px*var(--mp-u,1))]';

const AWARDS: { key: keyof RoundAwards; label: string; icon: LucideIcon; tone: string }[] = [
  { key: 'best', label: 'mpUi.results.awardTop', icon: Star, tone: 'bg-neo-lime' },
  { key: 'longest', label: 'mpUi.results.awardLongest', icon: Ruler, tone: 'bg-neo-cyan' },
  { key: 'most', label: 'mpUi.results.awardMost', icon: Layers, tone: 'bg-neo-pink' },
];

/** Top word: "+N" points; longest: its letter count; most words: the bare count. */
function awardValue(key: keyof RoundAwards, a: RoundAward, t: TFn): string {
  if (key === 'most') return String(a.value);
  if (key === 'longest') return t('mpUi.results.letterCount', { count: a.value });
  return `+${a.value}`;
}

/**
 * ROUND AWARDS: the round told as three stamps (top word, longest word, most
 * words), each naming its owner. Renders nothing when nobody counted a word.
 */
function MpRoundAwardsImpl({ awards, t, className }: { awards: RoundAwards; t: TFn; className?: string }) {
  const shown = AWARDS.filter((a) => awards[a.key]);
  if (shown.length === 0) return null;
  return (
    <section data-testid="mp-round-awards" aria-label={t('mpUi.results.awardsTitle')} className={cn(panel, 'p-[calc(10px*var(--mp-u,1))]', className)}>
      <h3 className={cn(panelTitle, 'mb-[calc(8px*var(--mp-u,1))]')}>{t('mpUi.results.awardsTitle')}</h3>
      <ul className={cn('grid gap-[calc(8px*var(--mp-u,1))]', shown.length === 3 ? 'grid-cols-3' : shown.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
        {shown.map(({ key, label, icon: Icon, tone }, i) => {
          const a = awards[key] as RoundAward;
          return (
            <li
              key={key}
              data-testid={`mp-award-${key}`}
              className={cn('min-w-0 flex flex-col gap-[calc(4px*var(--mp-u,1))] rounded-neo border-2 border-neo-black bg-neo-navy p-[calc(8px*var(--mp-u,1))]', fx.awardIn)}
              style={{ animationDelay: `${i * 110}ms` } as CSSProperties}
            >
              <span className="flex items-center gap-1 min-w-0">
                <span className={cn('grid place-items-center shrink-0 rounded-full border-2 border-neo-black text-neo-black w-[calc(20px*var(--mp-u,1))] h-[calc(20px*var(--mp-u,1))]', tone)}>
                  <Icon aria-hidden="true" className="w-[60%] h-[60%]" />
                </span>
                <span className="truncate font-neo-body font-bold uppercase text-neo-white/70 text-[calc(10px*var(--mp-u,1))]">{t(label)}</span>
              </span>
              {a.word && (
                <span dir="auto" className="truncate font-neo-display font-bold uppercase leading-none text-[calc(18px*var(--mp-u,1))]">{a.word}</span>
              )}
              <span
                dir={key === 'longest' ? undefined : 'ltr'}
                className={cn('self-start font-neo-display font-bold tabular-nums leading-none text-neo-yellow', a.word ? 'text-[calc(12px*var(--mp-u,1))]' : 'text-[calc(26px*var(--mp-u,1))]')}
              >
                {awardValue(key, a, t)}
              </span>
              <span className="flex items-center gap-1 min-w-0">
                <MiniAvatar avatar={a.avatar} userId={a.username} px={16} />
                <span dir="auto" className="truncate font-neo-body font-semibold text-[calc(11px*var(--mp-u,1))]">{a.username}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export const MpRoundAwards = memo(MpRoundAwardsImpl);
MpRoundAwards.displayName = 'MpRoundAwards';

/**
 * ROUND BY ROUND: the series as a grid (ladder order), each round's top score
 * stamped lime, my row outlined. Columns land one after another.
 */
function MpSeriesGridImpl({ grid, t, className }: { grid: SeriesGrid; t: TFn; className?: string }) {
  const cols = Array.from({ length: grid.rounds }, (_, i) => i);
  return (
    <section data-testid="mp-series-grid" aria-label={t('mpUi.results.roundByRound')} className={cn(panel, 'min-h-0 p-[calc(10px*var(--mp-u,1))]', className)}>
      <h3 className={cn(panelTitle, 'mb-[calc(6px*var(--mp-u,1))]')}>{t('mpUi.results.roundByRound')}</h3>
      <table className="w-full table-fixed border-separate border-spacing-y-[calc(3px*var(--mp-u,1))] font-neo-display tabular-nums text-[calc(13px*var(--mp-u,1))]">
        <colgroup>
          <col />
          {cols.map((i) => <col key={i} className="w-[calc(29px*var(--mp-u,1))]" />)}
          <col className="w-[calc(40px*var(--mp-u,1))]" />
        </colgroup>
        <thead>
          <tr className="text-neo-white/60 text-[calc(10px*var(--mp-u,1))] uppercase">
            <th scope="col" className="sr-only">{t('mpUi.results.player')}</th>
            {cols.map((i) => (
              <th key={i} scope="col" className="font-bold text-center">{t('mpUi.results.roundShort', { n: i + 1 })}</th>
            ))}
            <th scope="col" className="font-bold text-end pe-1">{t('mpUi.results.total')}</th>
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((r) => (
            <tr key={r.username} data-testid="mp-series-grid-row" data-me={String(r.isMe)} className={cn(r.isMe && 'text-neo-lime')}>
              <th scope="row" className={cn('text-start font-normal rounded-s-neo ps-1', r.isMe ? 'bg-neo-lime/15' : 'bg-neo-navy')}>
                <span className="flex items-center gap-1.5 min-w-0 py-[calc(2px*var(--mp-u,1))]">
                  <MiniAvatar avatar={r.avatar} userId={r.username} px={18} />
                  <span dir="auto" className="truncate font-bold">{r.username}</span>
                </span>
              </th>
              {r.cells.map((v, i) => {
                const top = grid.top[i] !== null && v === grid.top[i];
                return (
                  <td key={i} className={cn('text-center', r.isMe ? 'bg-neo-lime/15' : 'bg-neo-navy')}>
                    <span
                      data-top={String(top)}
                      className={cn(
                        'inline-grid place-items-center min-w-[calc(25px*var(--mp-u,1))] rounded-full leading-none py-[calc(3px*var(--mp-u,1))] font-bold',
                        top ? 'bg-neo-lime text-neo-black border-2 border-neo-black' : v === 0 ? 'text-neo-white/30' : 'text-neo-white/85',
                        fx.cellPop,
                      )}
                      style={{ animationDelay: `${i * 90}ms` } as CSSProperties}
                    >
                      {v === 0 ? '·' : v}
                    </span>
                  </td>
                );
              })}
              <td className={cn('text-end pe-2 rounded-e-neo font-bold text-[1.15em]', r.isMe ? 'bg-neo-lime/15' : 'bg-neo-navy')}>{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export const MpSeriesGrid = memo(MpSeriesGridImpl);
MpSeriesGrid.displayName = 'MpSeriesGrid';

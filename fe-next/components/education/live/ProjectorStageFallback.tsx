'use client';

import { MonitorSmartphone, Smartphone, Trophy } from 'lucide-react';
import { catalogueEntry } from '@/components/education/ClassroomModeCatalogueData';
import { teacherGameMode } from '@/lib/education/gameModes';
import type { Translate } from './eduLiveStyles';

export interface StagePlayer {
  username: string;
  score: number;
}

const RANK_FILL = ['bg-neo-yellow', 'bg-neo-cream', 'bg-neo-orange'] as const;

export function stageLeaders(players: readonly StagePlayer[] | undefined, count = 3): StagePlayer[] {
  return (players ?? [])
    .filter((p) => p.score > 0)
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}

/** The wall for any round without a shared board: what the game is, where it is played, and who leads. */
export function ProjectorStageFallback({ mode, players, t }: { mode?: string; players?: readonly StagePlayer[]; t: Translate }) {
  const known = teacherGameMode(mode);
  const both = catalogueEntry(mode)?.delivery === 'both';
  const Icon = both ? MonitorSmartphone : Smartphone;
  const leaders = stageLeaders(players);

  return (
    <div
      data-testid="projector-phone-mode"
      className="hidden h-full max-h-full w-[min(40%,28rem)] shrink-0 rounded-neo-lg border-4 border-neo-cream bg-neo-navy-light text-center [container-type:inline-size] text-neo-cream shadow-hard-lg md:block"
    >
      {/* cq units resolve against the nearest ancestor container, so the content sits one level inside the sized card. */}
      <div className="flex h-full flex-col items-center justify-center gap-[4cqw] overflow-hidden p-[6cqw]">
      <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border-[3px] border-neo-black bg-neo-cyan px-3 py-1 font-neo-display text-[clamp(0.875rem,6cqw,1.75rem)] font-black uppercase text-neo-black shadow-hard-sm">
        <Icon className="size-[1.15em]" aria-hidden="true" />
        {t(both ? 'eduShell.deliveryShort.both' : 'eduShell.delivery.phones')}
      </span>
      {known && (
        <>
          <p className="font-neo-display text-[clamp(1.5rem,13cqw,5rem)] font-black uppercase leading-none">{t(known.nameKey)}</p>
          <p className="max-w-[24ch] font-neo-body text-[clamp(1rem,6cqw,2.25rem)] font-bold leading-snug text-neo-cream">{t(known.howKey)}</p>
        </>
      )}
      {leaders.length > 0 && (
        <div className="flex w-full flex-col gap-[2cqw]">
          <p className="inline-flex items-center justify-center gap-2 font-neo-display text-[clamp(0.875rem,5cqw,1.75rem)] font-black uppercase">
            <Trophy className="size-[1.1em] text-neo-yellow" aria-hidden="true" />
            {t('partyScreen.liveLeaderboard')}
          </p>
          <ol data-testid="projector-stage-leaders" className="flex flex-col gap-[2cqw]">
            {leaders.map((p, i) => (
              <li
                key={p.username}
                className="flex items-center gap-[3cqw] rounded-neo border-[3px] border-neo-cream/50 bg-neo-navy px-[3cqw] py-[1.5cqw] shadow-hard"
              >
                <span className={`grid size-[clamp(1.75rem,9cqw,3.5rem)] shrink-0 place-items-center rounded-full border-[3px] border-neo-black font-neo-display text-[clamp(1rem,5.5cqw,2rem)] font-black text-neo-black ${RANK_FILL[i]}`}>
                  {i + 1}
                </span>
                <bdi className="min-w-0 flex-1 truncate text-start font-neo-display text-[clamp(1rem,6cqw,2.25rem)] font-black">{p.username}</bdi>
                <span
                  key={`${p.username}:${p.score}`}
                  data-testid={`projector-stage-score-${p.username}`}
                  className="inline-block shrink-0 font-neo-display text-[clamp(1rem,6cqw,2.25rem)] font-black tabular-nums text-neo-lime motion-safe:animate-score-pop"
                >
                  {p.score}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
      </div>
    </div>
  );
}

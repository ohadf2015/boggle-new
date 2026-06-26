'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { m } from 'framer-motion';
import { ArrowRight, ArrowLeft, PencilRuler, Play, Star, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import Avatar from '@/components/Avatar';
import type { BoardCardBoard } from '@/components/ugc/BoardCard';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: 'bg-green-500',
  MEDIUM: 'bg-neo-orange',
  HARD: 'bg-red-500',
};

const DIFFICULTY_GLOW: Record<string, string> = {
  EASY: 'shadow-[0_0_8px_rgba(34,197,94,0.3)]',
  MEDIUM: 'shadow-[0_0_8px_rgba(255,107,53,0.3)]',
  HARD: 'shadow-[0_0_8px_rgba(239,68,68,0.3)]',
};

function MiniGrid({ grid, difficulty }: { grid: string[][]; difficulty: string }) {
  const size = grid.length;
  const start = Math.max(0, Math.floor((size - 3) / 2));
  const rows = grid.slice(start, start + 3);

  return (
    <div className={cn('flex flex-col gap-0.5 rounded p-1', DIFFICULTY_GLOW[difficulty])}>
      {rows.map((row, ri) => (
        <div key={ri} className="flex gap-0.5">
          {row.slice(start, start + 3).map((cell, ci) => (
            <div
              key={ci}
              className="w-6 h-6 flex items-center justify-center bg-neo-navy-light border border-neo-white/20 rounded-sm font-neo-display font-bold text-[10px] text-neo-white uppercase"
            >
              {cell}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 30, rotate: 0 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    rotate: [-2, 1.5, -1][i % 3],
    transition: { type: 'spring' as const, stiffness: 280, damping: 16, delay: i * 0.12 },
  }),
};

interface LandingCommunityShowcaseProps {
  className?: string;
}

export function LandingCommunityShowcase({ className }: LandingCommunityShowcaseProps) {
  const { t, language, dir } = useLanguage();
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  const { data: boards = [] } = useQuery<BoardCardBoard[]>({
    queryKey: ['ugc', 'featured-boards'],
    queryFn: async () => {
      const res = await fetch('/api/ugc/boards/gallery?sort=featured&limit=3&page=1');
      if (!res.ok) return [];
      const data = await res.json();
      return data.boards ?? [];
    },
    staleTime: 5 * 60_000,
  });

  if (boards.length === 0) return null;

  return (
    <div className={cn('w-full max-w-4xl mx-auto xl:max-w-5xl', className)}>
      {/* Section header */}
      <m.div
        className="flex items-center justify-between mb-4"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-neo-pink" aria-hidden="true" />
          <h3 className="font-black text-neo-white uppercase text-sm sm:text-base neo-title-sm">
            {t('landing.communityBoards')}
          </h3>
        </div>
        <Link
          prefetch={false}
          href={`/${language}/community`}
          className={cn(
            'flex items-center gap-1 text-xs font-bold',
            'text-neo-cyan hover:text-neo-lime transition-colors',
            'group'
          )}
        >
          {t('landing.viewAllBoards')}
          <ArrowIcon className="w-3 h-3 group-hover:translate-x-0.5 group-hover:rtl:-translate-x-0.5 transition-transform" />
        </Link>
      </m.div>

      {/* Board cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 lg:gap-4 xl:gap-5">
        {boards.map((board, i) => {
          const avgRating = board.rating_count > 0
            ? (board.rating_sum / board.rating_count).toFixed(1)
            : null;

          return (
            <m.div
              key={board.board_code}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              whileHover={{
                y: -6,
                rotate: 0,
                scale: 1.03,
                transition: { type: 'spring', stiffness: 400, damping: 15 },
              }}
              className={cn(
                'snap-center shrink-0 w-[75vw] sm:w-auto',
                'bg-neo-navy border-3 border-black shadow-hard rounded-neo',
                'p-3 flex flex-col gap-2',
                'cursor-pointer group relative overflow-hidden'
              )}
            >
              {/* Difficulty accent strip */}
              <div className={cn('absolute top-0 inset-x-0 h-1 bg-linear-to-r', {
                'from-green-500 to-green-600': board.difficulty === 'EASY',
                'from-neo-orange to-amber-600': board.difficulty === 'MEDIUM',
                'from-red-500 to-red-600': board.difficulty === 'HARD',
              })} />

              {/* Staff pick badge */}
              {board.featured && (
                <div className="absolute top-2 -inset-e-5 z-10">
                  <span className="inline-block bg-neo-orange text-white text-[9px] font-bold px-5 py-0.5 -rotate-3 shadow-hard-sm border border-black uppercase">
                    {t('ugc.gallery.staffPick')}
                  </span>
                </div>
              )}

              {/* Top row: grid preview + info */}
              <div className="flex items-start gap-3 pt-1">
                <div className="shrink-0">
                  <MiniGrid grid={board.grid} difficulty={board.difficulty} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-neo-display font-bold text-sm text-neo-white leading-tight line-clamp-2">
                    {board.title}
                  </h4>
                  {/* Creator */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Avatar
                      customAvatar={(board.creator_avatar as CustomAvatarConfig | null) ?? null}
                      size="sm"
                    />
                    <span className="text-neo-white text-[10px] font-neo-body truncate">
                      {board.creator_display_name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom row: difficulty + stats + play */}
              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-[9px] font-bold px-1.5 py-0.5 rounded-neo border border-black text-white uppercase',
                    DIFFICULTY_COLORS[board.difficulty]
                  )}>
                    {t(`ugc.difficulty.${board.difficulty.toLowerCase()}`)}
                  </span>
                  <span className="flex items-center gap-0.5 text-neo-white text-[10px]">
                    <Users size={10} /> {board.play_count}
                  </span>
                  {avgRating && (
                    <span className="flex items-center gap-0.5 text-neo-yellow text-[10px]">
                      <Star size={10} className="fill-neo-yellow" /> {avgRating}
                    </span>
                  )}
                </div>
                <Link
                  prefetch={false}
                  href={`/${language}/community/${board.board_code}`}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1',
                    'bg-neo-lime text-black text-xs font-bold',
                    'border-2 border-black rounded-neo shadow-hard-sm',
                    'hover:shadow-hard active:shadow-hard-pressed',
                    'transition-all duration-100'
                  )}
                >
                  <Play size={10} />
                  {t('ugc.gallery.play')}
                </Link>
              </div>
            </m.div>
          );
        })}
      </div>

      {/* Create your own CTA */}
      <m.div
        className="mt-4"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
      >
        <Link
          prefetch={false}
          href={`/${language}/create/board`}
          className={cn(
            'flex items-center gap-3 px-4 py-2.5',
            'bg-neo-pink/15 border-2 border-neo-pink/30 rounded-neo',
            'hover:bg-neo-pink/25 hover:border-neo-pink/50',
            'transition-all duration-150 group'
          )}
        >
          <div className="flex items-center justify-center w-8 h-8 bg-neo-pink/20 rounded-neo shrink-0">
            <PencilRuler className="w-4 h-4 text-neo-pink" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-neo-white">
              {t('landing.createYourBoard')}
            </p>
            <p className="text-[10px] text-neo-white font-neo-body">
              {t('landing.createBoardDesc')}
            </p>
          </div>
          <ArrowIcon className="w-4 h-4 text-neo-pink/60 group-hover:text-neo-pink transition-colors shrink-0" />
        </Link>
      </m.div>
    </div>
  );
}

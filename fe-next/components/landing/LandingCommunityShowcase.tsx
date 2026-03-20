'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
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

function MiniGrid({ grid }: { grid: string[][] }) {
  // Show max 3x3 center crop for a compact preview
  const size = grid.length;
  const start = Math.max(0, Math.floor((size - 3) / 2));
  const rows = grid.slice(start, start + 3);

  return (
    <div className="flex flex-col gap-0.5">
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
  const [boards, setBoards] = useState<BoardCardBoard[]>([]);

  const fetchFeatured = useCallback(async () => {
    try {
      const res = await fetch('/api/ugc/boards/gallery?sort=featured&limit=3&page=1');
      if (!res.ok) return;
      const data = await res.json();
      setBoards(data.boards ?? []);
    } catch {
      // Silently fail — section just won't render
    }
  }, []);

  useEffect(() => { fetchFeatured(); }, [fetchFeatured]);

  // Don't render if no boards available
  if (boards.length === 0) return null;

  return (
    <div className={cn('w-full max-w-4xl mx-auto xl:max-w-5xl', className)}>
      {/* Section header */}
      <motion.div
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
          href={`/${language}/community`}
          className={cn(
            'flex items-center gap-1 text-xs font-bold',
            'text-neo-cyan hover:text-neo-lime transition-colors',
            'group'
          )}
        >
          {t('landing.viewAllBoards')}
          <ArrowIcon className="w-3 h-3 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
        </Link>
      </motion.div>

      {/* Board cards — horizontal scroll on mobile, grid on tablet+ */}
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 lg:gap-4 xl:gap-5">
        {boards.map((board, i) => {
          const avgRating = board.rating_count > 0
            ? (board.rating_sum / board.rating_count).toFixed(1)
            : null;

          return (
            <motion.div
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
                'bg-neo-navy border-3 border-black shadow-hard rounded-neo-lg',
                'p-3 flex flex-col gap-2',
                'cursor-pointer group relative overflow-hidden'
              )}
            >
              {/* Staff pick badge */}
              {board.featured && (
                <div className="absolute top-2 -end-5 z-10">
                  <span className="inline-block bg-neo-orange text-white text-[9px] font-bold px-5 py-0.5 -rotate-3 shadow-hard-sm border border-black uppercase">
                    {t('ugc.gallery.staffPick')}
                  </span>
                </div>
              )}

              {/* Top row: grid preview + info */}
              <div className="flex items-start gap-3">
                <div className="shrink-0">
                  <MiniGrid grid={board.grid} />
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
                    <span className="text-neo-white/50 text-[10px] font-neo-body truncate">
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
                  <span className="flex items-center gap-0.5 text-neo-white/60 text-[10px]">
                    <Users size={10} /> {board.play_count}
                  </span>
                  {avgRating && (
                    <span className="flex items-center gap-0.5 text-neo-white/60 text-[10px]">
                      <Star size={10} /> {avgRating}
                    </span>
                  )}
                </div>
                <Link
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
            </motion.div>
          );
        })}
      </div>

      {/* Create your own CTA */}
      <motion.div
        className="mt-4"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
      >
        <Link
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
            <p className="text-[10px] text-neo-white/50 font-neo-body">
              {t('landing.createBoardDesc')}
            </p>
          </div>
          <ArrowIcon className="w-4 h-4 text-neo-pink/60 group-hover:text-neo-pink transition-colors shrink-0" />
        </Link>
      </motion.div>
    </div>
  );
}

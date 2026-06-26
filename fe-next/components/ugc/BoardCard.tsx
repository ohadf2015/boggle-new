'use client';

import { memo } from 'react';
import Image from 'next/image';
import { Play, Star, Users, Share2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { shareBoard } from '@/utils/share';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

export interface BoardCardBoard {
  board_code: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  grid: string[][];
  grid_size: number;
  play_count: number;
  rating_sum: number;
  rating_count: number;
  featured: boolean;
  creator_display_name: string;
  creator_avatar?: Record<string, unknown> | null;
  cover_image_url?: string | null;
}

interface BoardCardProps {
  board: BoardCardBoard;
  personalBest?: number | null;
  onPlay?: (boardCode: string) => void;
  /** Compact horizontal layout for embedding in tight spaces */
  variant?: 'default' | 'compact';
  className?: string;
}

const DIFFICULTY_CONFIG = {
  EASY: {
    bg: 'bg-green-500',
    glow: 'shadow-[0_0_12px_rgba(34,197,94,0.4)]',
    accent: 'from-green-500 to-green-600',
    text: 'text-green-400',
    key: 'ugc.difficulty.easy',
  },
  MEDIUM: {
    bg: 'bg-neo-orange',
    glow: 'shadow-[0_0_12px_rgba(255,107,53,0.4)]',
    accent: 'from-neo-orange to-amber-600',
    text: 'text-neo-orange',
    key: 'ugc.difficulty.medium',
  },
  HARD: {
    bg: 'bg-red-500',
    glow: 'shadow-[0_0_12px_rgba(239,68,68,0.4)]',
    accent: 'from-red-500 to-red-600',
    text: 'text-red-400',
    key: 'ugc.difficulty.hard',
  },
} as const;

function BoardPreviewGrid({ grid, size, glowClass }: { grid: string[][]; size: 'sm' | 'md'; glowClass?: string }) {
  const cellSize = size === 'sm' ? 'w-5 h-5 text-[8px]' : 'w-7 h-7 text-xs';
  return (
    <div className={cn('flex flex-col gap-0.5 items-center rounded-neo p-1.5', glowClass)}>
      {grid.map((row, ri) => (
        <div key={ri} className="flex gap-0.5">
          {row.map((cell, ci) => (
            <div
              key={ci}
              className={cn(
                cellSize,
                'flex items-center justify-center',
                'bg-neo-navy-light border border-neo-white/20 rounded-sm',
                'font-neo-display font-bold text-neo-white uppercase'
              )}
            >
              {cell}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Compact horizontal chip — for embedding in results pages, sidebars, strips */
function BoardCardCompact({ board, personalBest, onPlay, className }: Omit<BoardCardProps, 'variant'>) {
  const { t } = useLanguage();
  const diff = DIFFICULTY_CONFIG[board.difficulty];

  const avgRating =
    board.rating_count > 0
      ? (board.rating_sum / board.rating_count).toFixed(1)
      : null;

  // Crop to 3x3 center for compact preview
  const gridSize = board.grid.length;
  const start = Math.max(0, Math.floor((gridSize - 3) / 2));
  const croppedGrid = board.grid.slice(start, start + 3).map(row => row.slice(start, start + 3));

  return (
    <button type="button"
      onClick={() => onPlay?.(board.board_code)}
      className={cn(
        'group flex items-center gap-3 p-2.5',
        'bg-neo-navy border-2 border-black rounded-neo shadow-hard-sm',
        'hover:shadow-hard hover:-translate-y-0.5',
        'active:shadow-hard-pressed active:translate-y-0',
        'transition-all duration-150 text-start w-full',
        className
      )}
    >
      {/* Mini grid */}
      <div className="shrink-0">
        <div className="flex flex-col gap-px">
          {croppedGrid.map((row, ri) => (
            <div key={ri} className="flex gap-px">
              {row.map((cell, ci) => (
                <div
                  key={ci}
                  className="w-5 h-5 flex items-center justify-center bg-neo-navy-light border border-neo-white/15 rounded-sm font-neo-display font-bold text-[7px] text-neo-white uppercase"
                >
                  {cell}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-neo-display font-bold text-sm text-neo-white truncate">
            {board.title}
          </h4>
          {board.featured && (
            <span className="shrink-0 bg-neo-orange text-white text-[8px] font-bold px-1.5 py-px rounded border border-black uppercase">
              {t('ugc.gallery.staffPick')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={cn('text-[10px] font-bold px-1.5 py-px rounded border border-black text-white', diff.bg)}>
            {t(diff.key)}
          </span>
          <span className="flex items-center gap-0.5 text-neo-white text-[10px]">
            <Users size={9} /> {board.play_count}
          </span>
          {avgRating && (
            <span className="flex items-center gap-0.5 text-neo-yellow text-[10px]">
              <Star size={9} className="fill-neo-yellow" /> {avgRating}
            </span>
          )}
          {personalBest != null && (
            <span className="flex items-center gap-0.5 text-neo-lime text-[10px] font-bold">
              <RotateCcw size={9} /> {personalBest}
            </span>
          )}
        </div>
      </div>

      {/* Play arrow */}
      <div className={cn(
        'shrink-0 w-8 h-8 flex items-center justify-center',
        'bg-neo-lime border-2 border-black rounded-neo shadow-hard-sm',
        'group-hover:shadow-hard transition-all duration-100'
      )}>
        <Play size={14} className="text-black" />
      </div>
    </button>
  );
}

/** Full-size card for gallery grids */
const BoardCard = memo<BoardCardProps>(({ board, personalBest, onPlay, variant = 'default', className }) => {
  const { t, language } = useLanguage();

  if (variant === 'compact') {
    return <BoardCardCompact board={board} personalBest={personalBest} onPlay={onPlay} className={className} />;
  }

  const diff = DIFFICULTY_CONFIG[board.difficulty];

  const avgRating =
    board.rating_count > 0
      ? (board.rating_sum / board.rating_count).toFixed(1)
      : null;

  return (
    <div className={cn(
      'relative group flex flex-col overflow-hidden',
      'bg-neo-navy border-3 border-black rounded-neo',
      'shadow-hard hover:shadow-hard-lg',
      'hover:-translate-y-1 active:translate-y-0 active:shadow-hard-pressed',
      'transition-all duration-150',
      className
    )}>
      {/* Difficulty accent strip */}
      <div className={cn('h-1.5 w-full bg-linear-to-r', diff.accent)} />

      {/* Staff pick badge */}
      {board.featured && (
        <div className="absolute top-4 -inset-e-5 z-10 rotate-3">
          <span className="inline-block bg-neo-orange text-white text-[9px] font-neo-body font-bold px-5 py-0.5 shadow-hard-sm border border-black uppercase tracking-wide">
            {t('ugc.gallery.staffPick')}
          </span>
        </div>
      )}

      {/* Creator attribution */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
        <Avatar
          customAvatar={(board.creator_avatar as CustomAvatarConfig | null) ?? null}
          size="sm"
        />
        <span className="text-neo-white text-xs font-neo-body truncate">
          {board.creator_display_name}
        </span>
      </div>

      {/* Cover image or mini grid preview */}
      <div className="flex justify-center px-3 py-2">
        {board.cover_image_url ? (
          <Image
            src={board.cover_image_url}
            alt={board.title}
            width={400}
            height={128}
            className="w-full h-32 object-cover rounded-neo border border-neo-white/20"
          />
        ) : (
          <BoardPreviewGrid grid={board.grid} size="sm" glowClass={diff.glow} />
        )}
      </div>

      {/* Board title */}
      <div className="px-3 pb-1">
        <h3 className="font-neo-display font-bold text-lg text-neo-white leading-tight line-clamp-2">
          {board.title}
        </h3>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-2 px-3 pb-2 flex-wrap">
        <span className={cn(
          'inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded border border-black text-white',
          diff.bg
        )}>
          {t(diff.key)}
        </span>
        <span className="flex items-center gap-1 text-neo-white text-xs">
          <Users size={11} /> {board.play_count}
        </span>
        {avgRating !== null && (
          <span className="flex items-center gap-1 text-neo-yellow text-xs">
            <Star size={11} className="fill-neo-yellow" /> {avgRating}
          </span>
        )}
      </div>

      {/* Personal best */}
      {personalBest != null && (
        <div className="px-3 pb-1">
          <span className="inline-flex items-center gap-1 text-neo-lime text-xs font-neo-body font-bold bg-neo-lime/10 border border-neo-lime/30 rounded px-2 py-0.5">
            <RotateCcw size={10} />
            {t('ugc.gallery.personalBest')}: {personalBest}
          </span>
        </div>
      )}

      {/* CTA buttons */}
      <div className="px-3 pb-3 mt-auto flex gap-2">
        <button type="button"
          onClick={() => onPlay?.(board.board_code)}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5',
            'bg-neo-lime text-black font-neo-body font-bold text-sm py-2',
            'rounded-neo border-2 border-black shadow-hard-sm',
            'hover:shadow-hard active:shadow-hard-pressed',
            'transition-all duration-100'
          )}
        >
          <Play size={14} />
          {personalBest != null ? t('ugc.gallery.improve') : t('ugc.gallery.play')}
        </button>
        <button type="button"
          onClick={() => shareBoard(board.board_code, board.title, board.creator_display_name, language, t)}
          className={cn(
            'flex items-center justify-center px-3 py-2',
            'bg-neo-navy text-neo-white font-neo-body font-bold text-sm',
            'rounded-neo border-2 border-black shadow-hard-sm',
            'hover:shadow-hard active:shadow-hard-pressed',
            'transition-all duration-100'
          )}
          aria-label={t('ugc.board.share')}
        >
          <Share2 size={14} />
        </button>
      </div>
    </div>
  );
});

BoardCard.displayName = 'BoardCard';

export { BoardCardCompact };
export default BoardCard;

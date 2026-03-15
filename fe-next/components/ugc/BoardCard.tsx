'use client';

import { memo } from 'react';
import { Play, Star, Users } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
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
  creator_profile_picture_url?: string | null;
  cover_image_url?: string | null;
}

interface BoardCardProps {
  board: BoardCardBoard;
  personalBest?: number | null;
  onPlay?: (boardCode: string) => void;
}

const DIFFICULTY_STYLES: Record<string, string> = {
  EASY: 'bg-green-500 text-white',
  MEDIUM: 'bg-neo-orange text-white',
  HARD: 'bg-red-500 text-white',
};

function BoardPreviewGrid({ grid, size }: { grid: string[][]; size: 'sm' | 'md' }) {
  const cellSize = size === 'sm' ? 'w-5 h-5 text-[8px]' : 'w-7 h-7 text-xs';
  return (
    <div className="flex flex-col gap-0.5 items-center">
      {grid.map((row, ri) => (
        <div key={ri} className="flex gap-0.5">
          {row.map((cell, ci) => (
            <div
              key={ci}
              className={`${cellSize} flex items-center justify-center bg-neo-navy border border-neo-white/20 rounded font-neo-body font-bold text-neo-white`}
            >
              {cell}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const BoardCard = memo<BoardCardProps>(({ board, personalBest, onPlay }) => {
  const { t } = useLanguage();

  const avgRating =
    board.rating_count > 0
      ? (board.rating_sum / board.rating_count).toFixed(1)
      : null;

  const difficultyKey = {
    EASY: 'ugc.difficulty.easy',
    MEDIUM: 'ugc.difficulty.medium',
    HARD: 'ugc.difficulty.hard',
  }[board.difficulty];

  return (
    <div className="relative bg-neo-navy border-neo border-black shadow-hard rounded-neo overflow-hidden hover:shadow-hard-lg transition-shadow duration-200 flex flex-col">
      {/* Staff pick badge */}
      {board.featured && (
        <div className="absolute top-3 -end-6 z-10">
          <span className="inline-block bg-neo-orange text-white text-xs font-neo-body font-bold px-6 py-0.5 -rotate-3 shadow-hard-sm border border-black">
            {t('ugc.gallery.staffPick')}
          </span>
        </div>
      )}

      {/* Creator attribution */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <Avatar
          customAvatar={(board.creator_avatar as CustomAvatarConfig | null) ?? null}
          profilePictureUrl={board.creator_profile_picture_url}
          size="sm"
        />
        <span className="text-neo-white/70 text-xs font-neo-body truncate">
          {t('ugc.gallery.createdBy')} <span className="text-neo-white font-bold">{board.creator_display_name}</span>
        </span>
      </div>

      {/* Cover image or mini grid preview */}
      <div className="flex justify-center px-3 pb-2">
        {board.cover_image_url ? (
          <img
            src={board.cover_image_url}
            alt={board.title}
            className="w-full h-32 object-cover rounded-neo border border-neo-white/20"
            loading="lazy"
          />
        ) : (
          <BoardPreviewGrid grid={board.grid} size="sm" />
        )}
      </div>

      {/* Board title */}
      <div className="px-3 pb-1">
        <h3 className="font-neo-display font-bold text-lg text-neo-white leading-tight line-clamp-2">
          {board.title}
        </h3>
      </div>

      {/* Difficulty badge */}
      <div className="px-3 pb-2">
        <span className={`inline-block text-xs font-neo-body font-bold px-2 py-0.5 rounded-neo border border-black ${DIFFICULTY_STYLES[board.difficulty]}`}>
          {t(difficultyKey)}
        </span>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 px-3 pb-2 text-neo-white/60 text-xs font-neo-body">
        <span className="flex items-center gap-1">
          <Users size={12} />
          <span>{board.play_count}</span>
        </span>
        <span className="flex items-center gap-1">
          <Star size={12} />
          {avgRating !== null ? (
            <span>{avgRating}</span>
          ) : (
            <span>{t('ugc.gallery.noRating')}</span>
          )}
        </span>
      </div>

      {/* Personal best */}
      {personalBest != null && (
        <div className="px-3 pb-1 text-neo-yellow text-xs font-neo-body font-bold">
          {t('ugc.gallery.personalBest')}: <span>{personalBest}</span>
        </div>
      )}

      {/* CTA button */}
      <div className="px-3 pb-3 mt-auto">
        <button
          onClick={() => onPlay?.(board.board_code)}
          className="w-full bg-neo-lime text-black font-neo-body font-bold text-sm py-2 rounded-neo border-neo border-black shadow-hard hover:shadow-hard-pressed active:shadow-hard-pressed transition-all duration-100 flex items-center justify-center gap-1"
        >
          <Play size={14} />
          {personalBest != null ? t('ugc.gallery.improve') : t('ugc.gallery.play')}
        </button>
      </div>
    </div>
  );
});

BoardCard.displayName = 'BoardCard';

export default BoardCard;

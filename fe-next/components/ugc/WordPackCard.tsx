'use client';

import { memo } from 'react';
import { ThumbsUp, Play, Hash, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import Avatar from '@/components/Avatar';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

export interface WordPack {
  id: string;
  name: string;
  description?: string | null;
  theme_emoji?: string | null;
  word_count: number;
  play_count: number;
  upvote_count: number;
  tags?: string[] | null;
  creator_display_name: string;
  creator_avatar?: Record<string, unknown> | null;
}

interface WordPackCardProps {
  pack: WordPack;
  isUpvoted?: boolean;
  onPlay?: (packId: string) => void;
  onUpvote?: (packId: string) => void;
  /** Compact horizontal layout for embedding */
  variant?: 'default' | 'compact';
  className?: string;
}

/** Compact horizontal chip — for tight spaces */
function WordPackCardCompact({ pack, onPlay, className }: Pick<WordPackCardProps, 'pack' | 'onPlay' | 'className'>) {
  const { t } = useLanguage();

  return (
    <button
      type="button"
      onClick={() => onPlay?.(pack.id)}
      className={cn(
        'group flex items-center gap-3 p-2.5',
        'bg-neo-navy border-2 border-black rounded-neo shadow-hard-sm',
        'hover:shadow-hard hover:-translate-y-0.5',
        'active:shadow-hard-pressed active:translate-y-0',
        'transition-all duration-150 text-start w-full',
        className
      )}
    >
      {/* Emoji icon */}
      {pack.theme_emoji ? (
        <span className="text-2xl leading-none shrink-0" aria-hidden="true">
          {pack.theme_emoji}
        </span>
      ) : (
        <div className="w-8 h-8 flex items-center justify-center bg-neo-pink/20 rounded-neo shrink-0">
          <Hash className="w-4 h-4 text-neo-pink" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-neo-display font-bold text-sm text-neo-white truncate">
          {pack.name}
        </h4>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-neo-white">
          <span className="flex items-center gap-0.5">
            <Hash className="w-3 h-3" /> {pack.word_count} {t('ugc.pack.card.words')}
          </span>
          <span className="flex items-center gap-0.5">
            <Users className="w-3 h-3" /> {pack.play_count}
          </span>
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

const WordPackCard = memo(function WordPackCard({
  pack,
  isUpvoted = false,
  onPlay,
  onUpvote,
  variant = 'default',
  className,
}: WordPackCardProps) {
  const { t } = useLanguage();

  if (variant === 'compact') {
    return <WordPackCardCompact pack={pack} onPlay={onPlay} className={className} />;
  }

  return (
    <article className={cn(
      'group flex flex-col overflow-hidden',
      'bg-neo-navy border-3 border-black rounded-neo',
      'shadow-hard hover:shadow-hard-lg',
      'hover:-translate-y-1 active:translate-y-0 active:shadow-hard-pressed',
      'transition-all duration-150',
      className
    )}>
      {/* Pink accent strip */}
      <div className="h-1.5 w-full bg-linear-to-r from-neo-pink to-purple-500" />

      {/* Creator row */}
      <div className="flex items-center gap-2 px-4 pt-3">
        <Avatar
          customAvatar={pack.creator_avatar as CustomAvatarConfig | null}
          size="sm"
        />
        <span className="text-xs text-neo-white font-neo-body truncate">
          {pack.creator_display_name}
        </span>
      </div>

      {/* Pack identity */}
      <div className="flex items-start gap-3 px-4 pt-3">
        {pack.theme_emoji ? (
          <span className="text-4xl leading-none shrink-0" aria-hidden="true">
            {pack.theme_emoji}
          </span>
        ) : (
          <div className="w-12 h-12 flex items-center justify-center bg-neo-pink/15 border-2 border-neo-pink/30 rounded-neo shrink-0">
            <Hash className="w-6 h-6 text-neo-pink" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-neo-display text-neo-white text-lg leading-tight truncate">
            {pack.name}
          </h3>
          {pack.description && (
            <p className="mt-1 text-sm text-neo-white font-neo-body line-clamp-2">
              {pack.description}
            </p>
          )}
        </div>
      </div>

      {/* Tags */}
      {pack.tags && pack.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-4 mt-3">
          {pack.tags.map((tag) => (
            <span
              key={tag}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5',
                'bg-neo-pink/10 border border-neo-pink/25 rounded',
                'text-[10px] text-neo-pink/80 font-neo-body font-bold uppercase'
              )}
            >
              <Hash className="w-2.5 h-2.5" aria-hidden="true" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-3 px-4 mt-3 text-xs text-neo-white font-neo-body">
        <span className="flex items-center gap-1">
          <Hash className="w-3 h-3" aria-hidden="true" />
          {pack.word_count} {t('ugc.pack.card.words')}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" aria-hidden="true" />
          {pack.play_count} {t('ugc.pack.card.plays')}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3 mt-auto">
        <button
          type="button"
          onClick={() => onPlay?.(pack.id)}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2',
            'bg-neo-lime text-black font-neo-display text-sm',
            'border-2 border-black rounded-neo shadow-hard-sm',
            'hover:shadow-hard active:shadow-hard-pressed',
            'transition-all duration-100'
          )}
        >
          <Play className="w-4 h-4" aria-hidden="true" />
          {t('ugc.pack.card.play')}
        </button>

        <button
          type="button"
          onClick={() => onUpvote?.(pack.id)}
          aria-label={`${t('ugc.pack.card.upvote')} ${pack.upvote_count}`}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2',
            'font-neo-display text-sm border-2 border-black rounded-neo shadow-hard-sm',
            'hover:shadow-hard active:shadow-hard-pressed transition-all duration-100',
            isUpvoted
              ? 'bg-neo-pink text-white'
              : 'bg-neo-navy text-neo-white hover:bg-neo-white/5'
          )}
        >
          <ThumbsUp className={cn('w-4 h-4', isUpvoted && 'fill-white')} aria-hidden="true" />
          {pack.upvote_count}
        </button>
      </div>
    </article>
  );
});

export { WordPackCardCompact };
export default WordPackCard;

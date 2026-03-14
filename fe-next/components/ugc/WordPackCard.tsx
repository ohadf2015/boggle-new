'use client';

import React, { memo } from 'react';
import { ThumbsUp, Play, Hash, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import Avatar from '@/components/Avatar';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

interface WordPack {
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
}

const WordPackCard = memo(function WordPackCard({
  pack,
  isUpvoted = false,
  onPlay,
  onUpvote,
}: WordPackCardProps) {
  const { t } = useLanguage();

  return (
    <article className="flex flex-col bg-neo-navy border-neo border-black rounded-neo shadow-hard overflow-hidden">
      {/* Creator row */}
      <div className="flex items-center gap-2 px-4 pt-3">
        <Avatar
          customAvatar={pack.creator_avatar as CustomAvatarConfig | null}
          size="sm"
        />
        <span className="text-xs text-neo-white/60 font-neo-body truncate">
          {pack.creator_display_name}
        </span>
      </div>

      {/* Pack identity */}
      <div className="flex items-start gap-3 px-4 pt-3">
        {pack.theme_emoji && (
          <span
            className="text-4xl leading-none flex-shrink-0"
            aria-hidden="true"
          >
            {pack.theme_emoji}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-neo-display text-neo-white text-lg leading-tight truncate">
            {pack.name}
          </h3>
          {pack.description && (
            <p className="mt-1 text-sm text-neo-white/60 font-neo-body line-clamp-2">
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
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-neo-navy/50 border border-white/20 rounded-neo text-xs text-neo-white/60 font-neo-body"
            >
              <Hash className="w-3 h-3" aria-hidden="true" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 px-4 mt-3 text-xs text-neo-white/50 font-neo-body">
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
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-neo-lime text-black font-neo-display text-sm border-neo border-black rounded-neo shadow-hard-sm hover:shadow-hard-pressed active:animate-neo-press"
        >
          <Play className="w-4 h-4" aria-hidden="true" />
          {t('ugc.pack.card.play')}
        </button>

        <button
          type="button"
          onClick={() => onUpvote?.(pack.id)}
          aria-label={`${t('ugc.pack.card.upvote')} ${pack.upvote_count}`}
          className={`flex items-center gap-1.5 px-3 py-2 font-neo-display text-sm border-neo border-black rounded-neo shadow-hard-sm hover:shadow-hard-pressed active:animate-neo-press transition-colors ${
            isUpvoted
              ? 'bg-neo-pink text-white upvoted'
              : 'bg-neo-navy text-neo-white/70 hover:bg-neo-navy/80'
          }`}
        >
          <ThumbsUp className="w-4 h-4" aria-hidden="true" />
          {pack.upvote_count}
        </button>
      </div>
    </article>
  );
});

export default WordPackCard;

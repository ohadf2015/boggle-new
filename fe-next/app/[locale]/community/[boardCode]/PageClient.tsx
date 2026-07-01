'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Play, ArrowLeft } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBackOneLevel } from '@/hooks/useBackOneLevel';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import type { BoardCardBoard } from '@/components/ugc/BoardCard';

interface Props {
  boardCode: string;
}

export default function BoardPlayPageClient({ boardCode }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const goBack = useBackOneLevel();
  const [board, setBoard] = useState<BoardCardBoard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/ugc/boards/${boardCode}`);
        if (!res.ok) return;
        const data = await res.json();
        setBoard(data.board);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [boardCode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neo-navy flex items-center justify-center">
        <div className="text-neo-white font-neo-body">{t('common.loading')}</div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen bg-neo-navy flex items-center justify-center">
        <div className="text-neo-white font-neo-body">{t('ugc.board.notFound')}</div>
      </div>
    );
  }

  const difficultyLabel = {
    EASY: t('ugc.difficulty.easy'),
    MEDIUM: t('ugc.difficulty.medium'),
    HARD: t('ugc.difficulty.hard'),
  }[board.difficulty];

  const handlePlay = () => {
    router.push(`/singleplayer?boardCode=${boardCode}`);
  };

  return (
    <div className="min-h-screen bg-neo-navy px-4 py-8 max-w-lg mx-auto">
      <button
        type="button"
        onClick={goBack}
        className="flex items-center gap-1 text-neo-white font-neo-body text-sm mb-6 hover:text-neo-white transition-colors"
      >
        <ArrowLeft size={16} className="rtl:scale-x-[-1]" />
        {t('common.back')}
      </button>

      <div className="bg-neo-navy border-neo border-black shadow-hard rounded-neo p-5 flex flex-col gap-4">
        {/* Creator */}
        <div className="flex items-center gap-2">
          <Avatar
            customAvatar={(board.creator_avatar as CustomAvatarConfig | null) ?? null}
            size="sm"
          />
          <span className="text-neo-white text-xs font-neo-body">
            {t('ugc.gallery.createdBy')}{' '}
            <span className="text-neo-white font-bold">{board.creator_display_name}</span>
          </span>
        </div>

        {/* Title */}
        <h1 className="font-neo-display font-bold text-2xl text-neo-white">{board.title}</h1>

        {/* Cover image or grid preview */}
        {board.cover_image_url ? (
          <div className="py-2">
            <Image
              src={board.cover_image_url}
              alt={board.title}
              width={600}
              height={192}
              className="w-full h-48 object-cover rounded-neo border-neo border-black"
            />
          </div>
        ) : (
          <div className="flex justify-center py-2">
            <div className="flex flex-col gap-1">
              {board.grid.map((row, ri) => (
                <div key={ri} className="flex gap-1">
                  {row.map((cell, ci) => (
                    <div
                      key={ci}
                      className="w-8 h-8 flex items-center justify-center bg-neo-navy border-2 border-neo-white/30 rounded font-neo-body font-bold text-neo-white text-sm"
                    >
                      {cell}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Difficulty & info */}
        <div className="flex items-center gap-3 text-sm font-neo-body text-neo-white">
          <span className="bg-neo-orange text-white px-2 py-0.5 rounded-neo border border-black font-bold text-xs">
            {difficultyLabel}
          </span>
          <span>{board.grid_size}x{board.grid_size} {t('ugc.board.grid')}</span>
        </div>

        {/* Play button */}
        <button
          type="button"
          onClick={handlePlay}
          className="w-full bg-neo-lime text-black font-neo-body font-bold py-3 rounded-neo border-neo border-black shadow-hard hover:shadow-hard-pressed active:shadow-hard-pressed transition-all flex items-center justify-center gap-2 text-lg mt-2"
        >
          <Play size={20} />
          {t('ugc.gallery.play')}
        </button>
      </div>
    </div>
  );
}

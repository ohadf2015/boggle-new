'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import Link from 'next/link';
import { Layout, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import BoardCard, { type BoardCardBoard } from './BoardCard';

type SortOption = 'featured' | 'popular' | 'newest' | 'topRated';
type DifficultyFilter = 'EASY' | 'MEDIUM' | 'HARD';

interface GalleryResponse {
  boards: BoardCardBoard[];
  total: number;
  page: number;
  hasMore: boolean;
}

const SORT_TABS: { key: SortOption; label: string; icon: string }[] = [
  { key: 'featured', label: 'ugc.gallery.sort.featured', icon: '⭐' },
  { key: 'popular', label: 'ugc.gallery.sort.popular', icon: '🔥' },
  { key: 'newest', label: 'ugc.gallery.sort.newest', icon: '✨' },
  { key: 'topRated', label: 'ugc.gallery.sort.topRated', icon: '🏆' },
];

const DIFFICULTY_CHIPS: { key: DifficultyFilter; label: string; color: string }[] = [
  { key: 'EASY', label: 'ugc.difficulty.easy', color: 'bg-green-500/15 border-green-500/30 text-green-400 hover:bg-green-500/25' },
  { key: 'MEDIUM', label: 'ugc.difficulty.medium', color: 'bg-neo-orange/15 border-neo-orange/30 text-neo-orange hover:bg-neo-orange/25' },
  { key: 'HARD', label: 'ugc.difficulty.hard', color: 'bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25' },
];

const LIMIT = 12;

interface BoardGalleryProps {
  onPlay?: (boardCode: string) => void;
}

const BoardGallery = memo<BoardGalleryProps>(({ onPlay }) => {
  const { t, language } = useLanguage();

  const [sort, setSort] = useState<SortOption>('featured');
  const [difficulty, setDifficulty] = useState<DifficultyFilter | null>(null);
  const [boards, setBoards] = useState<BoardCardBoard[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchBoards = useCallback(
    async (currentSort: SortOption, currentDifficulty: DifficultyFilter | null, currentPage: number, append = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          sort: currentSort,
          page: String(currentPage),
          limit: String(LIMIT),
        });
        if (currentDifficulty) params.set('difficulty', currentDifficulty);

        const res = await fetch(`/api/ugc/boards/gallery?${params.toString()}`, { method: 'GET' });
        if (!res.ok) return;
        const data: GalleryResponse = await res.json();

        setBoards(prev => append ? [...prev, ...(data.boards ?? [])] : (data.boards ?? []));
        setTotal(data.total);
        setHasMore(data.hasMore);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    setPage(1);
    fetchBoards(sort, difficulty, 1, false);
  }, [sort, difficulty, fetchBoards]);

  const handleLoadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchBoards(sort, difficulty, nextPage, true);
  }, [page, sort, difficulty, fetchBoards]);

  const handleDifficultyToggle = useCallback((key: DifficultyFilter) => {
    setDifficulty(prev => (prev === key ? null : key));
  }, []);

  const handleSortChange = useCallback((key: SortOption) => {
    setSort(key);
  }, []);

  return (
    <div className="w-full">
      {/* ── Toolbar row — sort + difficulty in a single bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        {/* Sort tabs */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1">
          {SORT_TABS.map(tab => (
            <button
              type="button"
              key={tab.key}
              onClick={() => handleSortChange(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-neo',
                'font-neo-body font-bold text-xs whitespace-nowrap',
                'border-2 border-black transition-all duration-100',
                sort === tab.key
                  ? 'bg-neo-yellow text-black shadow-hard-sm'
                  : 'bg-neo-navy text-neo-white shadow-hard-sm hover:text-neo-white hover:bg-neo-white/5'
              )}
            >
              <span className="text-sm" aria-hidden>{tab.icon}</span>
              {t(tab.label)}
            </button>
          ))}
        </div>

        {/* Difficulty chips */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-neo-white shrink-0" />
          {DIFFICULTY_CHIPS.map(chip => (
            <button
              type="button"
              key={chip.key}
              onClick={() => handleDifficultyToggle(chip.key)}
              className={cn(
                'px-2.5 py-1 rounded-neo font-neo-body font-bold text-[11px]',
                'border transition-all duration-100',
                difficulty === chip.key
                  ? cn(chip.color, 'border-current shadow-hard-sm')
                  : 'border-neo-white/10 text-neo-white hover:text-neo-white'
              )}
            >
              {t(chip.label)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Board count ── */}
      {total > 0 && (
        <p className="text-neo-white font-neo-body text-xs mb-4">
          {total} {t('ugc.gallery.boardCount')}
        </p>
      )}

      {/* ── Board grid ── */}
      {!loading && boards.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="relative">
            <Layout size={52} className="text-neo-white" />
            <Search size={20} className="text-neo-white absolute -bottom-1 -inset-e-1" />
          </div>
          <div>
            <p className="font-neo-display font-bold text-neo-white text-lg mb-1">
              {t('ugc.gallery.empty')}
            </p>
            <p className="text-neo-white font-neo-body text-sm max-w-xs mx-auto">
              {t('ugc.gallery.emptyHint')}
            </p>
          </div>
          <Link
            href={`/${language}/create/board`}
            className="px-5 py-2.5 bg-neo-yellow text-black font-neo-display font-bold text-sm rounded-neo border-3 border-black shadow-hard hover:shadow-hard-pressed transition-all"
          >
            {t('ugc.gallery.createBoard')}
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {boards.map((board, i) => (
              <AdaptiveMotion.div
                key={board.board_code}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.04 * Math.min(i, 12),
                  type: 'spring',
                  stiffness: 350,
                  damping: 24,
                }}
              >
                <BoardCard
                  board={board}
                  onPlay={onPlay}
                />
              </AdaptiveMotion.div>
            ))}
          </div>

          {/* Loading skeleton placeholders */}
          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={`skel-${i}`}
                  className="h-52 rounded-neo border-3 border-black bg-neo-white/3 animate-pulse"
                />
              ))}
            </div>
          )}

          {hasMore && !loading && (
            <div className="flex justify-center mt-8">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className={cn(
                  'px-8 py-2.5 font-neo-display font-bold text-sm',
                  'bg-neo-navy text-neo-white rounded-neo',
                  'border-3 border-black shadow-hard',
                  'hover:shadow-hard-lg hover:-translate-y-0.5',
                  'active:shadow-hard-pressed active:translate-y-0',
                  'transition-all duration-150 disabled:opacity-50'
                )}
              >
                {t('ugc.gallery.loadMore')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
});

BoardGallery.displayName = 'BoardGallery';

export default BoardGallery;

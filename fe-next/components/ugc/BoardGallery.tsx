'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import Link from 'next/link';
import { Layout } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import BoardCard, { type BoardCardBoard } from './BoardCard';

type SortOption = 'featured' | 'popular' | 'newest' | 'topRated';
type DifficultyFilter = 'EASY' | 'MEDIUM' | 'HARD';

interface GalleryResponse {
  boards: BoardCardBoard[];
  total: number;
  page: number;
  hasMore: boolean;
}

const SORT_TABS: { key: SortOption; label: string }[] = [
  { key: 'featured', label: 'ugc.gallery.sort.featured' },
  { key: 'popular', label: 'ugc.gallery.sort.popular' },
  { key: 'newest', label: 'ugc.gallery.sort.newest' },
  { key: 'topRated', label: 'ugc.gallery.sort.topRated' },
];

const DIFFICULTY_CHIPS: { key: DifficultyFilter; label: string }[] = [
  { key: 'EASY', label: 'ugc.difficulty.easy' },
  { key: 'MEDIUM', label: 'ugc.difficulty.medium' },
  { key: 'HARD', label: 'ugc.difficulty.hard' },
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

        setBoards(prev => append ? [...prev, ...data.boards] : data.boards);
        setTotal(data.total);
        setHasMore(data.hasMore);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Reset to page 1 on filter change
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
    <div className="min-h-screen bg-neo-navy px-4 py-6 max-w-5xl mx-auto">
      {/* Hero */}
      <div className="mb-6 text-center">
        <h1 className="font-neo-display font-bold text-3xl text-neo-white mb-1">
          {t('ugc.gallery.title')}
        </h1>
        {total > 0 && (
          <p className="text-neo-white/60 font-neo-body text-sm">
            {total} {t('ugc.gallery.boardCount')}
          </p>
        )}
      </div>

      {/* Sort tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {SORT_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleSortChange(tab.key)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-neo border-neo border-black font-neo-body font-bold text-sm transition-all duration-100 ${
              sort === tab.key
                ? 'bg-neo-yellow text-black shadow-hard-pressed'
                : 'bg-neo-navy text-neo-white/70 shadow-hard hover:text-neo-white'
            }`}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>

      {/* Difficulty filter chips */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {DIFFICULTY_CHIPS.map(chip => (
          <button
            key={chip.key}
            onClick={() => handleDifficultyToggle(chip.key)}
            className={`px-3 py-1 rounded-neo border-neo border-black font-neo-body font-bold text-xs transition-all duration-100 ${
              difficulty === chip.key
                ? 'bg-neo-orange text-white shadow-hard-pressed'
                : 'bg-neo-navy text-neo-white/70 shadow-hard hover:text-neo-white'
            }`}
          >
            {t(chip.label)}
          </button>
        ))}
      </div>

      {/* Board grid */}
      {!loading && boards.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Layout size={48} className="text-neo-white/20" />
          <p className="font-neo-body text-neo-white/60 text-sm">
            {t('ugc.gallery.empty')}
          </p>
          <Link
            href={`/${language}/create/board`}
            className="px-5 py-2 bg-neo-yellow text-black font-neo-body font-bold rounded-neo border-neo border-black shadow-hard hover:shadow-hard-pressed transition-all"
          >
            {t('ugc.gallery.createBoard')}
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {boards.map(board => (
              <BoardCard
                key={board.board_code}
                board={board}
                onPlay={onPlay}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="px-6 py-2 bg-neo-navy text-neo-white font-neo-body font-bold rounded-neo border-neo border-black shadow-hard hover:shadow-hard-lg transition-all disabled:opacity-50"
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

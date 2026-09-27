'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, Sparkles, PencilRuler } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import BoardCard, { type BoardCardBoard } from './BoardCard';

type SortMode = 'featured' | 'popular' | 'newest';

interface UGCFeaturedStripProps {
  /** Section title i18n key — defaults to 'ugc.strip.title' */
  titleKey?: string;
  /** How to sort boards */
  sort?: SortMode;
  /** Max boards to show */
  limit?: number;
  /** Card layout variant */
  variant?: 'default' | 'compact';
  /** Show "Create your own" CTA */
  showCreateCTA?: boolean;
  /** Show "View all" link */
  showViewAll?: boolean;
  /** Minimum boards needed to render (prevents empty-looking sections) */
  minToShow?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * UGCFeaturedStrip — self-contained UGC board showcase.
 *
 * Fetches boards, renders them horizontally (mobile) or in a grid (desktop).
 * Drop it anywhere: landing page, results page, lobby, game mode selector.
 */
const UGCFeaturedStrip = memo<UGCFeaturedStripProps>(({
  titleKey = 'ugc.strip.title',
  sort = 'featured',
  limit = 3,
  variant = 'default',
  showCreateCTA = false,
  showViewAll = true,
  minToShow = 1,
  className,
}) => {
  const { t, language, dir } = useLanguage();
  const router = useRouter();
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const [boards, setBoards] = useState<BoardCardBoard[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fetchBoards = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        sort,
        page: '1',
        limit: String(limit),
      });
      const res = await fetch(`/api/ugc/boards/gallery?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setBoards(data.boards ?? []);
    } catch {
      // Silent fail — section won't render
    } finally {
      setLoaded(true);
    }
  }, [sort, limit]);

  useEffect(() => { fetchBoards(); }, [fetchBoards]);

  const handlePlay = useCallback((boardCode: string) => {
    router.push(`/${language}/community/${boardCode}`);
  }, [router, language]);

  // Don't render until loaded, and only if we have enough boards
  if (!loaded || boards.length < minToShow) return null;

  return (
    <section className={cn('w-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-neo-pink" aria-hidden="true" />
          <h3 className="font-neo-display font-bold text-sm sm:text-base text-neo-white uppercase">
            {t(titleKey)}
          </h3>
        </div>
        {showViewAll && (
          <Link
            href={`/${language}/community`}
            className="flex items-center gap-1 text-xs font-bold text-neo-cyan hover:text-neo-lime transition-colors group"
          >
            {t('ugc.strip.viewAll')}
            <ArrowIcon className="w-3 h-3 group-hover:translate-x-0.5 group-hover:rtl:-translate-x-0.5 transition-transform" />
          </Link>
        )}
      </div>

      {/* Board cards */}
      {variant === 'compact' ? (
        // Compact: vertical stack of chips
        <div className="flex flex-col gap-2">
          {boards.map((board) => (
            <BoardCard
              key={board.board_code}
              board={board}
              variant="compact"
              onPlay={handlePlay}
            />
          ))}
        </div>
      ) : (
        // Default: horizontal scroll on mobile, grid on desktop
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
          {boards.map((board) => (
            <div key={board.board_code} className="snap-center shrink-0 w-[72vw] sm:w-auto">
              <BoardCard
                board={board}
                onPlay={handlePlay}
              />
            </div>
          ))}
        </div>
      )}

      {/* Create CTA */}
      {showCreateCTA && (
        <Link
          href={`/${language}/create/board`}
          className={cn(
            'flex items-center gap-3 mt-3 px-3 py-2',
            'bg-neo-pink/10 border-2 border-neo-pink/25 rounded-neo',
            'hover:bg-neo-pink/20 hover:border-neo-pink/40',
            'transition-all duration-150 group'
          )}
        >
          <div className="flex items-center justify-center w-7 h-7 bg-neo-pink/20 rounded-neo shrink-0">
            <PencilRuler className="w-3.5 h-3.5 text-neo-pink" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-neo-white">{t('ugc.strip.createOwn')}</p>
            <p className="text-[10px] text-neo-white font-neo-body">{t('ugc.strip.createDesc')}</p>
          </div>
          <ArrowIcon className="w-3.5 h-3.5 text-neo-pink/60 group-hover:text-neo-pink transition-colors shrink-0" />
        </Link>
      )}
    </section>
  );
});

UGCFeaturedStrip.displayName = 'UGCFeaturedStrip';

export { UGCFeaturedStrip };
export default UGCFeaturedStrip;

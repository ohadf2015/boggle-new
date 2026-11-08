'use client';

import React, { useRef, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button } from '@/components/ui/button';
import type { GamesResponse } from '../types';
import type { GameGroup } from '@/lib/admin/gameLog/groupGames';
import { GameGroupDetailPanel } from './GameGroupDetailPanel';
import { GameListRow, ROW_GRID } from './GameListRow';

interface Props {
  gameGroups: GameGroup[];
  pagination: GamesResponse['pagination'] | null;
  page: number;
  pageSize: number;
  onPageChange: (page: number | ((prev: number) => number)) => void;
  t: (key: string, fallback?: string) => string;
}

const ROW_ESTIMATE = 72;

export function VirtualGamesList({ gameGroups, pagination, page, pageSize, onPageChange, t }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const virtualizer = useVirtualizer({
    count: gameGroups.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_ESTIMATE,
    overscan: 8,
    // Re-measure when a row expands/collapses.
    getItemKey: (index) => gameGroups[index]?.key ?? index,
  });

  const items = virtualizer.getVirtualItems();
  // When the scroll container cannot be measured (jsdom/SSR, or no ResizeObserver),
  // the virtualizer yields 0 items. Fall back to rendering every row so the list is
  // never blank. Real browsers measure fine and use the windowed path above.
  const useFallback = items.length === 0 && gameGroups.length > 0;

  return (
    <>
      {/* Column header — desktop only; phone rows label themselves. */}
      <div className={`hidden sm:grid bg-neo-navy-elevated/50 rounded-t-neo border-neo border-b-0 border-black px-3 py-2 ${ROW_GRID} text-[11px] uppercase tracking-wide text-slate-400 font-neo-display`}>
        <span>{t('admin.todayGames.time', 'Time')}</span>
        <span>{t('admin.todayGames.player', 'Player')}</span>
        <span>{t('admin.todayGames.detail.mode', 'Mode')}</span>
        <span>{t('admin.todayGames.detail.result', 'Result')}</span>
        <span className="text-end">{t('admin.todayGames.score', 'Score')}</span>
        <span className="text-end">{t('admin.todayGames.words', 'Words')}</span>
        <span className="text-end">{t('admin.todayGames.duration', 'Time')}</span>
        <span />
      </div>

      <div
        ref={parentRef}
        className="bg-neo-navy-light/50 rounded-neo sm:rounded-t-none border-neo sm:border-t-0 border-black overflow-auto"
        style={{ maxHeight: 'min(70vh, 640px)' }}
      >
        {useFallback ? (
          <div>
            {gameGroups.map((group) => {
              const isOpen = expanded.has(group.key);
              return (
                <div key={group.key} className="border-b border-slate-700/70">
                  <GameListRow group={group} isOpen={isOpen} onToggle={() => toggle(group.key)} t={t} />
                  {isOpen && <GameGroupDetailPanel group={group} t={t} />}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {items.map((vi) => {
              const group = gameGroups[vi.index];
              if (!group) return null;
              const isOpen = expanded.has(group.key);
              return (
                <div
                  key={vi.key}
                  data-index={vi.index}
                  ref={virtualizer.measureElement}
                  className="absolute left-0 w-full border-b border-slate-700/70"
                  style={{ transform: `translateY(${vi.start}px)` }}
                >
                  <GameListRow group={group} isOpen={isOpen} onToggle={() => toggle(group.key)} t={t} />
                  {isOpen && <GameGroupDetailPanel group={group} t={t} />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm text-slate-400">
            {t('admin.todayGames.showing', 'Showing')}{' '}
            {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, pagination.totalCount)}{' '}
            {t('admin.todayGames.of', 'of')} {pagination.totalCount}
          </span>
          <div className="flex gap-2">
            <Button onClick={() => onPageChange((p) => p - 1)} disabled={!pagination.hasPrevPage} variant="outline" size="sm">
              {t('common.previous', 'Previous')}
            </Button>
            <Button onClick={() => onPageChange((p) => p + 1)} disabled={!pagination.hasNextPage} variant="outline" size="sm">
              {t('common.next', 'Next')}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

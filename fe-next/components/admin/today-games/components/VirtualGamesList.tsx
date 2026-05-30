'use client';

import React, { useRef, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown, ChevronRight, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GamesResponse } from '../types';
import type { GameGroup } from '@/lib/admin/gameLog/groupGames';
import { LANGUAGE_FLAGS, GAME_TYPE_ICONS, formatDuration, formatTime } from '../constants';
import { PlayerAvatar } from './PlayerAvatar';
import { GameGroupDetailPanel } from './GameGroupDetailPanel';
import { gameModeLabel } from '@/lib/admin/gameLog/gameDisplay';
import { ACQUISITION_TONE } from '../utils/classifyAcquisition';

interface Props {
  gameGroups: GameGroup[];
  pagination: GamesResponse['pagination'] | null;
  page: number;
  pageSize: number;
  onPageChange: (page: number | ((prev: number) => number)) => void;
  t: (key: string, fallback?: string) => string;
}

const ROW_ESTIMATE = 56;

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
      {/* Column header */}
      <div className="bg-neo-navy-elevated/50 rounded-t-neo border-neo border-b-0 border-black px-3 py-2 grid grid-cols-[auto_1fr_auto] sm:grid-cols-[70px_1fr_140px_70px_70px_80px_24px] gap-2 text-[11px] uppercase tracking-wide text-slate-400 font-neo-display">
        <span>{t('admin.todayGames.time', 'Time')}</span>
        <span>{t('admin.todayGames.player', 'Player')}</span>
        <span className="hidden sm:block">{t('admin.todayGames.type', 'Mode')}</span>
        <span className="hidden sm:block text-right">{t('admin.todayGames.score', 'Score')}</span>
        <span className="hidden sm:block text-right">{t('admin.todayGames.words', 'Words')}</span>
        <span className="hidden sm:block text-right">{t('admin.todayGames.duration', 'Time')}</span>
        <span className="hidden sm:block" />
      </div>

      <div
        ref={parentRef}
        className="bg-neo-navy-light/50 rounded-b-neo border-neo border-t-0 border-black overflow-auto"
        style={{ maxHeight: 'min(70vh, 640px)' }}
      >
        {useFallback ? (
          <div>
            {gameGroups.map((group) => {
              const isOpen = expanded.has(group.key);
              return (
                <div key={group.key} className="border-b border-slate-700/70">
                  <GameGroupListRow group={group} isOpen={isOpen} onToggle={() => toggle(group.key)} t={t} />
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
                  <GameGroupListRow group={group} isOpen={isOpen} onToggle={() => toggle(group.key)} t={t} />
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

function GameGroupListRow({
  group,
  isOpen,
  onToggle,
  t,
}: {
  group: GameGroup;
  isOpen: boolean;
  onToggle: () => void;
  t: (key: string, fallback?: string) => string;
}) {
  const flag = LANGUAGE_FLAGS[group.language] || '🌐';
  const typeIcon = GAME_TYPE_ICONS[group.modeRaw] || null;
  const hostName = group.host?.displayName || 'Unknown';
  const hostAcq = group.hostAcquisition;
  const showAcqChip = hostAcq && (hostAcq.kind !== 'unknown' || !!hostAcq.rawLabel);

  // Status badge styling
  const statusStyles: Record<string, string> = {
    completed: 'bg-neo-lime/20 text-neo-lime border-neo-lime/40',
    abandoned: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    errored: 'bg-neo-red/20 text-neo-red border-neo-red/40',
  };
  const statusLabels: Record<string, string> = {
    completed: t('admin.todayGames.status.completed', 'Completed'),
    abandoned: t('admin.todayGames.status.abandoned', 'Abandoned'),
    errored: t('admin.todayGames.status.errored', 'Error'),
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      className="w-full text-left px-3 py-2.5 grid grid-cols-[auto_1fr_auto] sm:grid-cols-[70px_1fr_140px_70px_70px_80px_24px] gap-2 items-center hover:bg-neo-navy-elevated/30 transition-colors"
    >
      <span className="text-xs text-slate-400">{formatTime(group.createdAt)}</span>

      <span className="flex items-center gap-2 min-w-0">
        <span className="relative inline-flex flex-shrink-0">
          <PlayerAvatar customAvatar={group.host?.profile?.avatar_config} userId={group.host?.playerId ?? undefined} />
          {group.isMultiplayer && <span className="absolute -top-1.5 -end-1.5 text-xs">👥</span>}
        </span>
        <span className="flex flex-col min-w-0">
          <span className="text-sm text-neo-white truncate max-w-[160px] flex items-center gap-1.5">
            {hostName}
          </span>
          {/* Mode + badges on mobile */}
          <span className="flex items-center gap-1.5 sm:hidden text-[11px] text-slate-400 flex-wrap">
            {gameModeLabel(group.modeRaw, t)}
            {group.isMultiplayer && <span className="text-[9px] bg-slate-600 text-slate-300 px-1 rounded">{t('admin.todayGames.multiplayer', 'MP')}</span>}
            {group.isRanked && <span className="text-[9px] bg-slate-600 text-slate-300 px-1 rounded">{t('admin.todayGames.ranked', 'Ranked')}</span>}
          </span>
        </span>
      </span>

      <span className="hidden sm:flex items-center gap-1.5 min-w-0">
        {typeIcon}
        <span className="text-sm text-slate-300 truncate">{gameModeLabel(group.modeRaw, t)}</span>
        {group.isMultiplayer && <span className="text-[9px] bg-slate-600 text-slate-300 px-1 rounded">{t('admin.todayGames.multiplayer', 'MP')}</span>}
        {group.isRanked && <span className="text-[9px] bg-slate-600 text-slate-300 px-1 rounded">{t('admin.todayGames.ranked', 'Ranked')}</span>}
      </span>

      <span className="hidden sm:block text-right font-mono text-sm text-slate-300">
        {group.playerCount}{group.botCount ? ` +${group.botCount}b` : ''}
      </span>
      <span className="hidden sm:block text-right font-mono text-sm text-neo-white">{group.topScore}</span>
      <span className="hidden sm:block text-right font-mono text-sm text-slate-300">{group.totalWords}</span>

      <span className="hidden sm:flex justify-center items-center text-slate-400">
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </span>
      <span className="sm:hidden flex items-center gap-1 text-slate-400">
        <span className="text-lg">{flag}</span>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </span>
    </button>
  );
}

'use client';

import React, { useRef, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown, ChevronRight, Crown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UnifiedGame, GamesResponse } from '../types';
import { LANGUAGE_FLAGS, GAME_TYPE_ICONS, formatDuration, formatTime } from '../constants';
import { PlayerAvatar } from './PlayerAvatar';
import { GameDetailPanel } from './GameDetailPanel';
import { gameModeLabel } from '@/lib/admin/gameLog/gameDisplay';
import { classifyAcquisition, ACQUISITION_TONE } from '../utils/classifyAcquisition';

interface Props {
  games: UnifiedGame[];
  pagination: GamesResponse['pagination'] | null;
  page: number;
  pageSize: number;
  onPageChange: (page: number | ((prev: number) => number)) => void;
  t: (key: string, fallback?: string) => string;
}

const ROW_ESTIMATE = 56;

export function VirtualGamesList({ games, pagination, page, pageSize, onPageChange, t }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const virtualizer = useVirtualizer({
    count: games.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_ESTIMATE,
    overscan: 8,
    // Re-measure when a row expands/collapses.
    getItemKey: (index) => games[index]?.id ?? index,
  });

  const items = virtualizer.getVirtualItems();
  // When the scroll container cannot be measured (jsdom/SSR, or no ResizeObserver),
  // the virtualizer yields 0 items. Fall back to rendering every row so the list is
  // never blank. Real browsers measure fine and use the windowed path above.
  const useFallback = items.length === 0 && games.length > 0;

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
            {games.map((game) => {
              const isOpen = expanded.has(game.id);
              return (
                <div key={game.id} className="border-b border-slate-700/70">
                  <GameListRow game={game} isOpen={isOpen} onToggle={() => toggle(game.id)} t={t} />
                  {isOpen && <GameDetailPanel game={game} t={t} />}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {items.map((vi) => {
              const game = games[vi.index];
              if (!game) return null;
              const isOpen = expanded.has(game.id);
              return (
                <div
                  key={vi.key}
                  data-index={vi.index}
                  ref={virtualizer.measureElement}
                  className="absolute left-0 w-full border-b border-slate-700/70"
                  style={{ transform: `translateY(${vi.start}px)` }}
                >
                  <GameListRow game={game} isOpen={isOpen} onToggle={() => toggle(game.id)} t={t} />
                  {isOpen && <GameDetailPanel game={game} t={t} />}
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

function GameListRow({
  game,
  isOpen,
  onToggle,
  t,
}: {
  game: UnifiedGame;
  isOpen: boolean;
  onToggle: () => void;
  t: (key: string, fallback?: string) => string;
}) {
  const flag = LANGUAGE_FLAGS[game.language] || '🌐';
  const typeIcon = GAME_TYPE_ICONS[game.mode] || null;
  const playerName =
    game.profiles?.display_name ||
    game.profiles?.username ||
    game.guest_name ||
    (game.is_guest ? t('admin.todayGames.guest', 'Guest') : 'Unknown');
  const seedId = game.player_id || game.guest_session_id || undefined;

  const acq = classifyAcquisition({
    utm_source: game.utm_source,
    utm_medium: game.utm_medium,
    utm_campaign: game.utm_campaign,
    referrer_source: game.referrer_source,
    is_guest: !!game.is_guest,
  });
  const showChip = acq.kind !== 'unknown' || !!acq.rawLabel;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      className="w-full text-left px-3 py-2.5 grid grid-cols-[auto_1fr_auto] sm:grid-cols-[70px_1fr_140px_70px_70px_80px_24px] gap-2 items-center hover:bg-neo-navy-elevated/30 transition-colors"
    >
      <span className="text-xs text-slate-400">{formatTime(game.created_at)}</span>

      <span className="flex items-center gap-2 min-w-0">
        <span className="relative inline-flex flex-shrink-0">
          <PlayerAvatar customAvatar={game.is_guest ? null : game.profiles?.avatar_config} userId={seedId} />
          {game.placement === 1 && <Crown className="absolute -top-1.5 -end-1.5 w-3 h-3 text-neo-lime" />}
        </span>
        <span className="flex flex-col min-w-0">
          <span className="text-sm text-neo-white truncate max-w-[160px] flex items-center gap-1.5">
            {playerName}
            {game.is_guest && (
              <span className="text-[10px] bg-slate-600 text-slate-300 px-1 rounded">{t('admin.todayGames.guest', 'Guest')}</span>
            )}
            {game.is_first_game && <Sparkles className="w-3 h-3 text-neo-lime" />}
          </span>
          {/* Mode + source chip on mobile (where the mode column is hidden) */}
          <span className="flex items-center gap-1.5 sm:hidden text-[11px] text-slate-400">
            {gameModeLabel(game.game_mode || game.mode, t)}
            {showChip && (
              <span className={`inline-flex items-center gap-0.5 border rounded-full px-1 leading-none ${ACQUISITION_TONE[acq.kind]}`}>
                {t(`admin.todayGames.source.${acq.kind}`, acq.kind)}
              </span>
            )}
          </span>
        </span>
      </span>

      <span className="hidden sm:flex items-center gap-1.5 min-w-0">
        {typeIcon}
        <span className="text-sm text-slate-300 truncate">{gameModeLabel(game.game_mode || game.mode, t)}</span>
        {showChip && (
          <span className={`inline-flex items-center border rounded-full px-1 text-[10px] leading-none ${ACQUISITION_TONE[acq.kind]}`} title={acq.tooltip}>
            {t(`admin.todayGames.source.${acq.kind}`, acq.kind)}
          </span>
        )}
      </span>

      <span className="hidden sm:block text-right font-mono text-sm text-neo-white">{game.score}</span>
      <span className="hidden sm:block text-right font-mono text-sm text-slate-300">{game.word_count}</span>
      <span className="hidden sm:block text-right text-sm text-slate-300">{formatDuration(game.time_played)}</span>

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

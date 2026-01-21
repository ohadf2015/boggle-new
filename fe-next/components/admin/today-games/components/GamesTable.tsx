'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import type { UnifiedGame, SortField, SortOrder, GamesResponse } from '../types';
import { SortableHeader } from './SortableHeader';
import { GameRow } from './GameRow';

interface GamesTableProps {
  games: UnifiedGame[];
  pagination: GamesResponse['pagination'] | null;
  sortField: SortField;
  sortOrder: SortOrder;
  page: number;
  pageSize: number;
  isRTL: boolean;
  onSort: (field: SortField) => void;
  onPageChange: (page: number | ((prev: number) => number)) => void;
  t: (key: string) => string;
}

export function GamesTable({
  games,
  pagination,
  sortField,
  sortOrder,
  page,
  pageSize,
  isRTL,
  onSort,
  onPageChange,
  t,
}: GamesTableProps) {
  return (
    <>
      <div className="bg-slate-800/50 rounded-neo border-neo border-black overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-slate-700/50">
            <tr>
              <SortableHeader
                label={t('admin.todayGames.time') || 'Time'}
                field="created_at"
                currentField={sortField}
                sortOrder={sortOrder}
                onSort={onSort}
                isRTL={isRTL}
              />
              <th className="px-4 py-3 text-left text-sm font-neo-display text-slate-300">
                {t('admin.todayGames.player') || 'Player'}
              </th>
              <th className="px-4 py-3 text-left text-sm font-neo-display text-slate-300">
                {t('admin.todayGames.type') || 'Type'}
              </th>
              <th className="px-4 py-3 text-left text-sm font-neo-display text-slate-300">
                {t('admin.todayGames.language') || 'Lang'}
              </th>
              <SortableHeader
                label={t('admin.todayGames.score') || 'Score'}
                field="score"
                currentField={sortField}
                sortOrder={sortOrder}
                onSort={onSort}
                isRTL={isRTL}
              />
              <SortableHeader
                label={t('admin.todayGames.words') || 'Words'}
                field="word_count"
                currentField={sortField}
                sortOrder={sortOrder}
                onSort={onSort}
                isRTL={isRTL}
              />
              <SortableHeader
                label={t('admin.todayGames.duration') || 'Duration'}
                field="time_played"
                currentField={sortField}
                sortOrder={sortOrder}
                onSort={onSort}
                isRTL={isRTL}
              />
              <th className="px-4 py-3 text-left text-sm font-neo-display text-slate-300">
                {t('admin.todayGames.code') || 'Code'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            <AnimatePresence mode="popLayout">
              {games.map((game) => (
                <GameRow key={game.id} game={game} t={t} />
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">
            {t('admin.todayGames.showing') || 'Showing'}{' '}
            {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, pagination.totalCount)}{' '}
            {t('admin.todayGames.of') || 'of'} {pagination.totalCount}
          </span>
          <div className="flex gap-2">
            <Button
              onClick={() => onPageChange((p) => p - 1)}
              disabled={!pagination.hasPrevPage}
              variant="outline"
              size="sm"
            >
              {t('common.previous') || 'Previous'}
            </Button>
            <Button
              onClick={() => onPageChange((p) => p + 1)}
              disabled={!pagination.hasNextPage}
              variant="outline"
              size="sm"
            >
              {t('common.next') || 'Next'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

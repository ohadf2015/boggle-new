'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Trash2, Link, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NeoLoader } from '@/components/ui/NeoLoader';
import { cn } from '@/lib/utils';
import type { PlayerAttempt } from '../types';

interface AttemptsListProps {
  isExpanded: boolean;
  attempts: PlayerAttempt[];
  attemptsLoading: boolean;
  searchQuery: string;
  selectedAttempts: Set<string>;
  saving: boolean;
  onSearchChange: (query: string) => void;
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onResetSelected: () => void;
  onCopyResetLink: () => void;
  getFilteredAttempts: () => PlayerAttempt[];
}

export function AttemptsList({
  isExpanded,
  attempts,
  attemptsLoading,
  searchQuery,
  selectedAttempts,
  saving,
  onSearchChange,
  onToggleSelection,
  onSelectAll,
  onResetSelected,
  onCopyResetLink,
  getFilteredAttempts,
}: AttemptsListProps): React.ReactElement | null {
  const filteredAttempts = getFilteredAttempts();

  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t-2 border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50"
        >
          <div className="p-4">
            {/* Search and Actions */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-neo text-sm"
                />
              </div>

              {selectedAttempts.size > 0 && (
                <>
                  <Button
                    onClick={onResetSelected}
                    disabled={saving}
                    size="sm"
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Reset {selectedAttempts.size} Selected
                  </Button>
                  <Button
                    onClick={onCopyResetLink}
                    size="sm"
                    variant="outline"
                    className="border-2 border-neo-pink text-neo-pink hover:bg-neo-pink hover:text-white"
                    title="Copy reset link to share with player"
                  >
                    <Link className="w-4 h-4 mr-1" />
                    Copy Reset Link
                  </Button>
                </>
              )}
            </div>

            {/* Attempts List */}
            {attemptsLoading ? (
              <div className="flex justify-center py-6 sm:py-8">
                <NeoLoader variant="dots" size="md" />
              </div>
            ) : filteredAttempts.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <Users className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No attempts found</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <table className="w-full text-xs sm:text-sm min-w-[320px]">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="py-1.5 sm:py-2 px-1.5 sm:px-2 text-left w-8">
                        <input
                          type="checkbox"
                          checked={
                            selectedAttempts.size === filteredAttempts.length &&
                            filteredAttempts.length > 0
                          }
                          onChange={onSelectAll}
                          className="rounded w-4 h-4"
                        />
                      </th>
                      <th className="py-1.5 sm:py-2 px-1.5 sm:px-2 text-left">Player</th>
                      <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center w-10 sm:w-14">
                        ✓
                      </th>
                      <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center w-12 sm:w-16">
                        Tries
                      </th>
                      <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center w-10 sm:w-14 hidden xs:table-cell">
                        Pts
                      </th>
                      <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-left w-12 sm:w-14 hidden sm:table-cell">
                        Type
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttempts.map((attempt) => (
                      <tr
                        key={attempt.id}
                        className={cn(
                          'border-b border-gray-100 dark:border-gray-800',
                          selectedAttempts.has(attempt.id) && 'bg-blue-50 dark:bg-blue-900/20'
                        )}
                      >
                        <td className="py-1.5 sm:py-2 px-1.5 sm:px-2">
                          <input
                            type="checkbox"
                            checked={selectedAttempts.has(attempt.id)}
                            onChange={() => onToggleSelection(attempt.id)}
                            className="rounded w-4 h-4"
                          />
                        </td>
                        <td className="py-1.5 sm:py-2 px-1.5 sm:px-2">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span
                              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs flex-shrink-0"
                              style={{ backgroundColor: attempt.avatar_color || '#6366f1' }}
                            >
                              {attempt.avatar_emoji || '🎯'}
                            </span>
                            <span className="font-medium truncate max-w-[80px] sm:max-w-[150px]">
                              {attempt.display_name}
                            </span>
                          </div>
                        </td>
                        <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-center">
                          {attempt.solved ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-red-500">✗</span>
                          )}
                        </td>
                        <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-center font-mono">
                          {attempt.attempts_used}/10
                        </td>
                        <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-center font-mono hidden xs:table-cell">
                          {attempt.efficiency_score}
                        </td>
                        <td className="py-1.5 sm:py-2 px-1 sm:px-2 hidden sm:table-cell">
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded text-[10px] sm:text-xs',
                              attempt.player_id
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600'
                            )}
                          >
                            {attempt.player_id ? 'U' : 'G'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

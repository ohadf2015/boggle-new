'use client';

import React, { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import type { WordBankWord } from '../types';

interface WordBankTableProps {
  words: WordBankWord[];
  loading: boolean;
  onDelete: (word: string) => Promise<boolean>;
  hasMore: boolean;
  onLoadMore: () => Promise<void>;
}

export function WordBankTable({
  words,
  loading,
  onDelete,
  hasMore,
  onLoadMore,
}: WordBankTableProps): React.ReactElement {
  const { t } = useLanguage();
  const [deletingWord, setDeletingWord] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = async (word: string): Promise<void> => {
    setDeletingWord(word);
    const success = await onDelete(word);
    setDeletingWord(null);
    setConfirmDelete(null);
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const getSourceBadgeColor = (source: string): string => {
    switch (source) {
      case 'wikipedia':
        return 'bg-blue-500/20 text-blue-400 border-blue-500';
      case 'dictionary':
        return 'bg-green-500/20 text-green-400 border-green-500';
      case 'static':
        return 'bg-purple-500/20 text-purple-400 border-purple-500';
      case 'admin':
        return 'bg-orange-500/20 text-orange-400 border-orange-500';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500';
    }
  };

  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500';
      case 'blocked':
        return 'bg-red-500/20 text-red-400 border-red-500';
      case 'used':
        return 'bg-gray-500/20 text-gray-400 border-gray-500';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500';
    }
  };

  if (loading && words.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neo-yellow"></div>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <AlertTriangle className="w-12 h-12 mb-4" />
        <p className="text-lg font-medium">{t('admin.wordBank.noWordsFound')}</p>
        <p className="text-sm">{t('admin.wordBank.tryAdjustingFilters')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-2 border-gray-700 rounded-lg">
          <thead className="bg-gray-800 border-b-2 border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {t('admin.wordBank.word')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {t('admin.wordBank.language')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {t('admin.wordBank.source')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {t('admin.wordBank.status')}
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {t('admin.wordBank.timesUsed')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {t('admin.wordBank.lastUsed')}
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {t('admin.wordBank.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {words.map(word => (
              <tr key={word.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{word.word}</td>
                <td className="px-4 py-3 text-gray-300 uppercase text-sm">{word.language}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded border ${getSourceBadgeColor(
                      word.source
                    )}`}
                  >
                    {word.source}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded border ${getStatusBadgeColor(
                      word.status
                    )}`}
                  >
                    {word.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-gray-300">{word.times_used}</td>
                <td className="px-4 py-3 text-gray-400 text-sm">{formatDate(word.last_used_at)}</td>
                <td className="px-4 py-3 text-center">
                  {confirmDelete === word.word ? (
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        onClick={() => handleDelete(word.word)}
                        disabled={deletingWord === word.word}
                        size="sm"
                        variant="destructive"
                        className="text-xs"
                      >
                        {deletingWord === word.word ? t('admin.wordBank.deleting') : t('common.confirm')}
                      </Button>
                      <Button
                        onClick={() => setConfirmDelete(null)}
                        disabled={deletingWord === word.word}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setConfirmDelete(word.word)}
                      disabled={deletingWord !== null}
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button onClick={onLoadMore} disabled={loading} variant="outline">
            {loading ? t('admin.wordBank.loading') : t('admin.wordBank.loadMore')}
          </Button>
        </div>
      )}
    </div>
  );
}

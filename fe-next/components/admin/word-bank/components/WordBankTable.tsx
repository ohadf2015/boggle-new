'use client';

import React, { useState } from 'react';
import { Trash2, AlertTriangle, Check, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import type { WordBankWord, ValidationStatus } from '../types';

interface WordBankTableProps {
  words: WordBankWord[];
  loading: boolean;
  onDelete: (word: string) => Promise<boolean>;
  onApprove: (wordId: string) => Promise<boolean>;
  onReject: (wordId: string) => Promise<boolean>;
  selectedWords: Set<string>;
  onToggleSelect: (wordId: string) => void;
  onToggleSelectAll: () => void;
  hasMore: boolean;
  onLoadMore: () => Promise<void>;
}

export function WordBankTable({
  words,
  loading,
  onDelete,
  onApprove,
  onReject,
  selectedWords,
  onToggleSelect,
  onToggleSelectAll,
  hasMore,
  onLoadMore,
}: WordBankTableProps): React.ReactElement {
  const { t } = useLanguage();
  const [deletingWord, setDeletingWord] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [actioningWord, setActioningWord] = useState<string | null>(null);

  const handleDelete = async (word: string): Promise<void> => {
    setDeletingWord(word);
    await onDelete(word);
    setDeletingWord(null);
    setConfirmDelete(null);
  };

  const handleApprove = async (wordId: string): Promise<void> => {
    setActioningWord(wordId);
    await onApprove(wordId);
    setActioningWord(null);
  };

  const handleReject = async (wordId: string): Promise<void> => {
    setActioningWord(wordId);
    await onReject(wordId);
    setActioningWord(null);
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

  const getValidationStatusBadgeColor = (status: ValidationStatus): string => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500';
      case 'approved':
        return 'bg-green-500/20 text-green-400 border-green-500';
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500';
    }
  };

  const allSelected = words.length > 0 && words.every(w => selectedWords.has(w.id));

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
          <thead className="bg-neo-navy-light border-b-2 border-gray-700">
            <tr>
              <th className="px-2 py-3 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 rounded border-gray-600 bg-neo-navy-light text-neo-yellow focus:ring-neo-yellow"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {t('admin.wordBank.word')}
              </th>
              <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {t('admin.wordBank.source')}
              </th>
              <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {t('admin.wordBank.status')}
              </th>
              <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {t('admin.wordBank.validationStatus')}
              </th>
              <th className="hidden sm:table-cell px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {t('admin.wordBank.timesUsed')}
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {t('admin.wordBank.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {words.map(word => (
              <tr key={word.id} className={`hover:bg-neo-navy-light/50 transition-colors ${selectedWords.has(word.id) ? 'bg-neo-yellow/5' : ''}`}>
                <td className="px-2 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={selectedWords.has(word.id)}
                    onChange={() => onToggleSelect(word.id)}
                    className="w-4 h-4 rounded border-gray-600 bg-neo-navy-light text-neo-yellow focus:ring-neo-yellow"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-white font-medium">{word.word}</span>
                    {word.source_article_title && (
                      <a
                        href={word.source_article_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        {word.source_article_title}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </td>
                <td className="hidden sm:table-cell px-4 py-3">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded border ${getSourceBadgeColor(
                      word.source
                    )}`}
                  >
                    {word.source}
                  </span>
                </td>
                <td className="px-2 sm:px-4 py-3">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded border ${getStatusBadgeColor(
                      word.status
                    )}`}
                  >
                    {word.status}
                  </span>
                </td>
                <td className="hidden md:table-cell px-4 py-3">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded border ${getValidationStatusBadgeColor(
                      word.validation_status
                    )}`}
                  >
                    {word.validation_status}
                  </span>
                </td>
                <td className="hidden sm:table-cell px-4 py-3 text-center text-gray-300">{word.times_used}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    {/* Approve/Reject for pending words */}
                    {word.validation_status === 'pending' && (
                      <>
                        <Button
                          onClick={() => handleApprove(word.id)}
                          disabled={actioningWord === word.id}
                          size="sm"
                          variant="ghost"
                          className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                          title={t('admin.wordBank.approve')}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleReject(word.id)}
                          disabled={actioningWord === word.id}
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          title={t('admin.wordBank.reject')}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {/* Delete button */}
                    {confirmDelete === word.word ? (
                      <div className="flex items-center gap-1">
                        <Button
                          onClick={() => handleDelete(word.word)}
                          disabled={deletingWord === word.word}
                          size="sm"
                          variant="destructive"
                          className="text-xs"
                        >
                          {deletingWord === word.word ? '...' : t('common.confirm')}
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
                        disabled={deletingWord !== null || actioningWord !== null}
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        title={t('admin.wordBank.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
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

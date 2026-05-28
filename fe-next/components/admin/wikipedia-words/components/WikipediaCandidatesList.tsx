'use client';

import React, { useState, useMemo } from 'react';
import { Check, X, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateShort, type WikipediaWordCandidate, type ValidationStatus } from '../types';
import { BulkApproveButton } from './BulkApproveButton';
import type { BulkApproveResult } from '../hooks/useWikipediaCandidates';

interface WikipediaCandidatesListProps {
  candidates: WikipediaWordCandidate[];
  loading: boolean;
  onUpdateStatus: (id: string, status: ValidationStatus) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onBulkUpdateStatus: (ids: string[], status: ValidationStatus) => Promise<boolean>;
  onBulkDelete: (ids: string[]) => Promise<boolean>;
  onBulkApproveToDict: (ids: string[]) => Promise<BulkApproveResult>;
}

const STATUS_BADGES: Record<ValidationStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-500 text-white' },
  valid: { label: 'Valid', className: 'bg-green-500 text-white' },
  invalid: { label: 'Invalid', className: 'bg-red-500 text-white' },
};

export function WikipediaCandidatesList({
  candidates,
  loading,
  onUpdateStatus,
  onDelete,
  onBulkUpdateStatus,
  onBulkDelete,
  onBulkApproveToDict,
}: WikipediaCandidatesListProps): React.ReactElement {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const allSelected = useMemo(
    () => candidates.length > 0 && selectedIds.size === candidates.length,
    [candidates.length, selectedIds.size]
  );

  const toggleSelect = (id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = (): void => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidates.map((c) => c.id)));
    }
  };

  const handleStatusUpdate = async (id: string, status: ValidationStatus): Promise<void> => {
    setProcessingIds((prev) => new Set(prev).add(id));
    await onUpdateStatus(id, status);
    setProcessingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleDelete = async (id: string): Promise<void> => {
    setProcessingIds((prev) => new Set(prev).add(id));
    await onDelete(id);
    setProcessingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleBulkAction = async (
    action: 'approve' | 'reject' | 'delete'
  ): Promise<void> => {
    if (selectedIds.size === 0) return;

    setBulkProcessing(true);
    const ids = Array.from(selectedIds);

    let success = false;
    if (action === 'approve') {
      success = await onBulkUpdateStatus(ids, 'valid');
    } else if (action === 'reject') {
      success = await onBulkUpdateStatus(ids, 'invalid');
    } else if (action === 'delete') {
      success = await onBulkDelete(ids);
    }

    if (success) {
      setSelectedIds(new Set());
    }
    setBulkProcessing(false);
  };

  const handleBulkApprove = async (): Promise<{
    approved: number;
    skipped: number;
    failed: number;
  }> => {
    const ids = Array.from(selectedIds);
    const result = await onBulkApproveToDict(ids);

    if (result.success || result.approved > 0) {
      setSelectedIds(new Set());
    }

    return {
      approved: result.approved,
      skipped: result.skipped,
      failed: result.failed,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-neo-pink" />
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p className="text-lg font-bold">No candidates found</p>
        <p className="text-sm mt-1">Try adjusting your filters or trigger a new population</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 p-3 bg-neo-navy/50 rounded-lg border-2 border-neo-pink">
          <span className="text-sm font-bold text-white">
            {selectedIds.size} selected
          </span>
          <div className="flex flex-wrap gap-2 md:ms-auto">
            <BulkApproveButton
              selectedCount={selectedIds.size}
              onApprove={handleBulkApprove}
              disabled={bulkProcessing}
            />
            <button
              onClick={() => handleBulkAction('approve')}
              disabled={bulkProcessing}
              className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-bold hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              <Check className="w-4 h-4" />
              Mark Valid
            </button>
            <button
              onClick={() => handleBulkAction('reject')}
              disabled={bulkProcessing}
              className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Reject
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              disabled={bulkProcessing}
              className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-sm font-bold hover:bg-neo-navy-elevated disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Table Header */}
      <div className="hidden md:grid md:grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-4 px-4 py-2 text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
        <div>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            className="w-4 h-4 rounded border-2 border-gray-300 dark:border-slate-600"
          />
        </div>
        <div>Word</div>
        <div>Source Article</div>
        <div className="text-center">Score</div>
        <div className="text-center">Status</div>
        <div className="text-center">Actions</div>
      </div>

      {/* Candidates List */}
      <div className="space-y-2">
        {candidates.map((candidate) => {
          const isProcessing = processingIds.has(candidate.id);
          const isSelected = selectedIds.has(candidate.id);
          const statusBadge = STATUS_BADGES[candidate.validation_status];

          return (
            <div
              key={candidate.id}
              className={cn(
                'p-4 rounded-lg border-2 transition-all',
                isSelected
                  ? 'border-neo-pink bg-neo-pink/10'
                  : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-neo-navy-light',
                isProcessing && 'opacity-50'
              )}
            >
              {/* Mobile Layout */}
              <div className="md:hidden space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(candidate.id)}
                      className="w-4 h-4 rounded border-2 border-gray-300 dark:border-slate-600"
                    />
                    <div>
                      <span className="font-bold text-lg uppercase text-gray-900 dark:text-white">
                        {candidate.word}
                      </span>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {formatDateShort(candidate.fetch_date)}
                      </div>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-1 rounded text-xs font-bold',
                      statusBadge.className
                    )}
                  >
                    {statusBadge.label}
                  </span>
                </div>

                {candidate.source_article_title && (
                  <a
                    href={candidate.source_article_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-neo-cyan hover:underline"
                  >
                    {candidate.source_article_title}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Score: <span className="font-bold">{candidate.interestingness_score}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusUpdate(candidate.id, 'valid')}
                      disabled={isProcessing || candidate.validation_status === 'valid'}
                      className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                      title="Approve"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(candidate.id, 'invalid')}
                      disabled={isProcessing || candidate.validation_status === 'invalid'}
                      className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                      title="Reject"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(candidate.id)}
                      disabled={isProcessing}
                      className="p-2 bg-gray-600 text-white rounded-lg hover:bg-neo-navy-elevated disabled:opacity-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden md:grid md:grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-4 items-center">
                <div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(candidate.id)}
                    className="w-4 h-4 rounded border-2 border-gray-300 dark:border-slate-600"
                  />
                </div>
                <div>
                  <span className="font-bold text-lg uppercase text-gray-900 dark:text-white">
                    {candidate.word}
                  </span>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {formatDateShort(candidate.fetch_date)}
                  </div>
                </div>
                <div>
                  {candidate.source_article_title ? (
                    <a
                      href={candidate.source_article_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-neo-cyan hover:underline truncate"
                    >
                      {candidate.source_article_title}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </div>
                <div className="text-center">
                  <span className="font-bold text-gray-700 dark:text-gray-300">
                    {candidate.interestingness_score}
                  </span>
                </div>
                <div className="text-center">
                  <span
                    className={cn(
                      'px-2 py-1 rounded text-xs font-bold',
                      statusBadge.className
                    )}
                  >
                    {statusBadge.label}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleStatusUpdate(candidate.id, 'valid')}
                    disabled={isProcessing || candidate.validation_status === 'valid'}
                    className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 transition-colors"
                    title="Approve"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(candidate.id, 'invalid')}
                    disabled={isProcessing || candidate.validation_status === 'invalid'}
                    className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
                    title="Reject"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(candidate.id)}
                    disabled={isProcessing}
                    className="p-1.5 bg-gray-600 text-white rounded hover:bg-neo-navy-elevated disabled:opacity-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

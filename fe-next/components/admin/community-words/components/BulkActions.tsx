'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/Loader';

interface BulkActionsProps {
  totalWords: number;
  selectedCount: number;
  bulkProcessing: boolean;
  onToggleSelectAll: () => void;
  onBulkApprove: () => void;
  onBulkReject: () => void;
}

export function BulkActions({
  totalWords,
  selectedCount,
  bulkProcessing,
  onToggleSelectAll,
  onBulkApprove,
  onBulkReject,
}: BulkActionsProps) {
  if (totalWords === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-4 bg-white dark:bg-neo-navy-light text-black dark:text-white p-4 rounded-lg shadow-xs">
      <input
        type="checkbox"
        checked={selectedCount === totalWords && totalWords > 0}
        onChange={onToggleSelectAll}
        className="w-4 h-4 rounded border-slate-300"
        aria-label="Select all words"
      />
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {selectedCount > 0 ? `${selectedCount} selected` : 'Select all'}
      </span>
      {selectedCount > 0 && (
        <div className="flex gap-2 ms-auto">
          <Button
            size="sm"
            variant="ghost"
            className="text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={onBulkApprove}
            disabled={bulkProcessing}
          >
            {bulkProcessing ? (
              <Loader size="sm" />
            ) : (
              <>
                <Check className="w-4 h-4 me-2" /> Approve Selected
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={onBulkReject}
            disabled={bulkProcessing}
          >
            {bulkProcessing ? (
              <Loader size="sm" />
            ) : (
              <>
                <X className="w-4 h-4 me-2" /> Reject Selected
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

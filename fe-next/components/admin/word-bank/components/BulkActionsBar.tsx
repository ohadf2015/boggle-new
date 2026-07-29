'use client';

import React, { useState } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BulkActionResult } from '../types';

interface BulkActionsBarProps {
  selectedCount: number;
  onBulkApprove: () => Promise<BulkActionResult>;
  onBulkReject: () => Promise<BulkActionResult>;
  onClearSelection: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onBulkApprove,
  onBulkReject,
  onClearSelection,
}: BulkActionsBarProps): React.ReactElement | null {
  const { t } = useLanguage();
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);
  const [result, setResult] = useState<{
    type: 'approve' | 'reject';
    data: BulkActionResult;
  } | null>(null);

  if (selectedCount === 0 && !result) return null;

  const handleBulkApprove = async (): Promise<void> => {
    setLoading('approve');
    setResult(null);
    const data = await onBulkApprove();
    setResult({ type: 'approve', data });
    setLoading(null);
    if (data.success) {
      setTimeout(() => {
        setResult(null);
        onClearSelection();
      }, 2000);
    }
  };

  const handleBulkReject = async (): Promise<void> => {
    setLoading('reject');
    setResult(null);
    const data = await onBulkReject();
    setResult({ type: 'reject', data });
    setLoading(null);
    if (data.success) {
      setTimeout(() => {
        setResult(null);
        onClearSelection();
      }, 2000);
    }
  };

  return (
    <div className="sticky bottom-0 bg-neo-navy border-t-2 border-gray-700 p-4 -mx-4 -mb-4 mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {selectedCount > 0 && (
            <>
              <span className="text-white font-medium">
                {selectedCount} {t('admin.wordBank.bulkActions.selected')}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleBulkApprove}
                  disabled={loading !== null}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 gap-2"
                >
                  <Check className="w-4 h-4" />
                  {loading === 'approve'
                    ? t('admin.wordBank.bulkActions.approving')
                    : t('admin.wordBank.bulkActions.approveAll')}
                </Button>
                <Button
                  onClick={handleBulkReject}
                  disabled={loading !== null}
                  size="sm"
                  variant="destructive"
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  {loading === 'reject'
                    ? t('admin.wordBank.bulkActions.rejecting')
                    : t('admin.wordBank.bulkActions.rejectAll')}
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {result && (
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded ${
                result.data.success
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {result.data.success ? (
                <Check className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span className="text-sm">
                {result.data.success
                  ? t('admin.wordBank.bulkActions.successMessage', {
                      count: result.data.affected,
                      action: result.type === 'approve' ? 'approved' : 'rejected',
                    })
                  : t('admin.wordBank.bulkActions.errorMessage')}
              </span>
            </div>
          )}

          {selectedCount > 0 && (
            <Button
              onClick={() => {
                setResult(null);
                onClearSelection();
              }}
              size="sm"
              variant="outline"
            >
              {t('admin.wordBank.bulkActions.clearSelection')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

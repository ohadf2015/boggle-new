'use client';

/**
 * BulkApproveButton Component
 *
 * Provides bulk approval functionality for invalid words with confirmation dialog.
 * Displays selected count, shows confirmation dialog before approval, and
 * shows result counts (approved/skipped/failed) after operation.
 */

import React, { useState } from 'react';
import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { BulkApproveResult } from '@/app/api/admin/invalid-words/bulk-approve/route';

interface BulkApproveButtonProps {
  selectedCount: number;
  selectedIds: string[];
  authToken: string;
  onComplete: () => void;
  disabled?: boolean;
}

export function BulkApproveButton({
  selectedCount,
  selectedIds,
  authToken,
  onComplete,
  disabled = false,
}: BulkApproveButtonProps): React.ReactElement {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    approved: number;
    skipped: number;
    failed: number;
  } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleConfirmApprove = async (): Promise<void> => {
    if (selectedIds.length === 0 || loading) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/invalid-words/bulk-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ wordIds: selectedIds }),
      });

      if (!response.ok) {
        throw new Error('Bulk approve failed');
      }

      const data: BulkApproveResult = await response.json();

      setResult({
        approved: data.approved ?? 0,
        skipped: data.skipped ?? 0,
        failed: data.failed ?? 0,
      });

      // Clear result after 5 seconds
      setTimeout(() => setResult(null), 5000);

      // Trigger refresh and clear selection
      onComplete();
    } catch (error) {
      console.error('[BulkApproveButton] Error:', error);
      setResult({ approved: 0, skipped: 0, failed: selectedIds.length });
      setTimeout(() => setResult(null), 5000);
    } finally {
      setLoading(false);
      setDialogOpen(false);
    }
  };

  const isDisabled = disabled || selectedCount === 0 || loading;

  return (
    <div className="flex items-center gap-3">
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            disabled={isDisabled}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium
              border-2 border-black shadow-hard
              transition-all duration-150
              ${
                isDisabled
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-neo-yellow text-black hover:bg-yellow-400 active:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px]'
              }
            `}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {loading
              ? 'Approving...'
              : `Bulk Approve (${selectedCount})`}
          </button>
        </AlertDialogTrigger>

        <AlertDialogContent className="bg-neo-navy-light border-slate-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-5 h-5 text-neo-yellow" />
              Confirm Bulk Approval
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              You are about to approve <strong className="text-neo-yellow">{selectedCount}</strong> word{selectedCount !== 1 ? 's' : ''}.
              <br /><br />
              Approved words will be added to the word_scores table and become valid for all players.
              This action cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-neo-navy-elevated border-slate-600 text-white hover:bg-slate-600"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmApprove}
              className="bg-green-600 text-white hover:bg-green-700 border-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 me-2" />
                  Approve {selectedCount} Word{selectedCount !== 1 ? 's' : ''}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {result && (
        <span className="text-sm">
          <span className="text-green-500">{result.approved} approved</span>
          {result.skipped > 0 && (
            <span className="text-yellow-500 ms-2">{result.skipped} skipped</span>
          )}
          {result.failed > 0 && (
            <span className="text-red-500 ms-2">{result.failed} failed</span>
          )}
        </span>
      )}
    </div>
  );
}

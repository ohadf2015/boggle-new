'use client';

/**
 * AutoPromoteButton Component
 *
 * Triggers the auto-promotion pipeline for invalid words that meet
 * confidence thresholds (submission count or milog verification).
 * Shows confirmation dialog before triggering and displays results.
 */

import React, { useState } from 'react';
import { Zap, Loader2, AlertTriangle } from 'lucide-react';
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

interface AutoPromoteButtonProps {
  candidateCount: number;
  authToken: string;
  onComplete: () => void;
  disabled?: boolean;
}

interface AutoPromoteResult {
  promoted: number;
  failed: number;
  blocked?: number;
  words: {
    milogBased: string[];
    wiktionaryBased: string[];
    wiktionaryEsBased: string[];
  };
}

export function AutoPromoteButton({
  candidateCount,
  authToken,
  onComplete,
  disabled = false,
}: AutoPromoteButtonProps): React.ReactElement {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AutoPromoteResult | null>(null);
  const [error, setError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleConfirm = async (): Promise<void> => {
    if (loading) return;

    setLoading(true);
    setResult(null);
    setError(false);

    try {
      const response = await fetch('/api/admin/invalid-words/auto-promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Auto-promote failed');
      }

      const data: AutoPromoteResult = await response.json();
      setResult(data);
      setTimeout(() => setResult(null), 5000);
      onComplete();
    } catch {
      setError(true);
      setTimeout(() => setError(false), 5000);
    } finally {
      setLoading(false);
      setDialogOpen(false);
    }
  };

  const isDisabled = disabled || candidateCount === 0 || loading;

  return (
    <div className="flex items-center gap-3">
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogTrigger asChild>
          <button
            disabled={isDisabled}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium
              border-2 border-black shadow-hard
              transition-all duration-150
              ${
                isDisabled
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-neo-cyan text-black hover:bg-cyan-400 active:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px]'
              }
            `}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {loading
              ? 'Promoting...'
              : `Auto-Promote (${candidateCount})`}
          </button>
        </AlertDialogTrigger>

        <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-5 h-5 text-neo-cyan" />
              Confirm Auto-Promotion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              <strong className="text-neo-cyan">{candidateCount}</strong> word{candidateCount !== 1 ? 's' : ''} will be automatically promoted to the dictionary.
              <br /><br />
              This promotes only externally-verified words (Wiktionary for English/Spanish, milog for Hebrew); offensive/slur terms are filtered out automatically. Promoted words become valid for all players.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-cyan-600 text-white hover:bg-cyan-700 border-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  Promoting...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 me-2" />
                  Auto-Promote
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {result && (
        <span className="text-sm">
          <span className="text-green-500">{result.promoted} promoted</span>
          {result.failed > 0 && (
            <span className="text-red-500 ms-2">{result.failed} failed</span>
          )}
        </span>
      )}

      {error && (
        <span className="text-sm text-red-500">Auto-promotion failed</span>
      )}
    </div>
  );
}

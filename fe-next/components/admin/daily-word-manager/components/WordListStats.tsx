'use client';

import React, { useState } from 'react';
import { AlertTriangle, Copy, Check, Download, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Language } from '@/types';
import type { WordListStats as WordListStatsType } from '../types';
import { generateTypeScriptCode } from '../constants';

interface WordListStatsProps {
  stats: WordListStatsType;
  wordLists: Record<Language, string[]>;
  onResetToDefaults: () => void;
}

export const WordListStats: React.FC<WordListStatsProps> = ({
  stats,
  wordLists,
  onResetToDefaults,
}) => {
  const [copied, setCopied] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleExportCode = () => {
    const code = generateTypeScriptCode(wordLists);
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJSON = () => {
    const json = JSON.stringify(wordLists, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'daily-word-lists.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const handleConfirmReset = () => {
    onResetToDefaults();
    setShowResetConfirm(false);
  };

  return (
    <div className="bg-white dark:bg-neo-navy-light/50 rounded-xl border border-gray-200 dark:border-slate-700 p-4 text-gray-900 dark:text-gray-100">
      <h2 className="font-bold text-lg sm:text-xl mb-3">Statistics</h2>

      <div className="grid grid-cols-3 gap-2 sm:block sm:space-y-3">
        <div className="text-center sm:text-left sm:flex sm:justify-between p-2 bg-gray-50 dark:bg-neo-navy-elevated/50 rounded-lg sm:bg-transparent sm:p-0">
          <span className="block sm:inline text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Total
          </span>
          <span className="block sm:inline font-bold text-lg sm:text-base">{stats.total}</span>
        </div>
        <div className="text-center sm:text-left sm:flex sm:justify-between p-2 bg-gray-50 dark:bg-neo-navy-elevated/50 rounded-lg sm:bg-transparent sm:p-0">
          <span className="block sm:inline text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Shortest
          </span>
          <span className="block sm:inline font-bold text-lg sm:text-base">{stats.shortest}L</span>
        </div>
        <div className="text-center sm:text-left sm:flex sm:justify-between p-2 bg-gray-50 dark:bg-neo-navy-elevated/50 rounded-lg sm:bg-transparent sm:p-0">
          <span className="block sm:inline text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Longest
          </span>
          <span className="block sm:inline font-bold text-lg sm:text-base">{stats.longest}L</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-600">
        <h3 className="font-bold mb-2 text-sm">By Length:</h3>
        <div className="grid grid-cols-2 sm:grid-cols-1 gap-1 text-sm">
          {Object.entries(stats.byLength)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([len, count]) => (
              <div
                key={len}
                className="flex justify-between px-2 py-1 bg-gray-50 dark:bg-neo-navy-elevated/50 rounded"
              >
                <span className="text-gray-600 dark:text-gray-400">{len}L:</span>
                <span className="font-mono font-bold">{count}</span>
              </div>
            ))}
        </div>
      </div>

      {stats.shortest < 3 && (
        <div className="mt-4 p-2 sm:p-3 bg-red-100 dark:bg-red-900/30 border border-red-500 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-red-600 dark:text-red-400">
              <strong>Warning:</strong> Some words &lt;3 letters!
            </div>
          </div>
        </div>
      )}

      {/* Export Actions */}
      <div className="mt-4 sm:mt-6 flex sm:flex-col gap-2">
        <Button
          onClick={handleExportCode}
          size="sm"
          className="flex-1 sm:w-full bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm"
        >
          {copied ? (
            <Check className="me-1 sm:me-2 h-3 w-3 sm:h-4 sm:w-4" />
          ) : (
            <Copy className="me-1 sm:me-2 h-3 w-3 sm:h-4 sm:w-4" />
          )}
          {copied ? 'Copied!' : 'Copy TS'}
        </Button>
        <Button
          onClick={handleDownloadJSON}
          variant="outline"
          size="sm"
          className="flex-1 sm:w-full text-xs sm:text-sm"
        >
          <Download className="me-1 sm:me-2 h-3 w-3 sm:h-4 sm:w-4" />
          JSON
        </Button>
        <Button
          onClick={handleReset}
          variant="outline"
          size="sm"
          className="flex-1 sm:w-full text-xs sm:text-sm text-orange-600 border-orange-300 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-700 dark:hover:bg-orange-900/20"
        >
          <RotateCcw className="me-1 sm:me-2 h-3 w-3 sm:h-4 sm:w-4" />
          Reset
        </Button>
      </div>

      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset word lists</AlertDialogTitle>
            <AlertDialogDescription>
              Reset all word lists to defaults? This will clear your custom changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReset} className="bg-red-600 hover:bg-red-700">
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

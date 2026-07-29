'use client';

import React, { useState } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Search, Plus, Trash2 } from 'lucide-react';
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

interface WordListEditorProps {
  filteredWords: string[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddWord: (word: string) => { success: boolean; error?: string };
  onRemoveWord: (word: string) => void;
}

export const WordListEditor: React.FC<WordListEditorProps> = ({
  filteredWords,
  searchQuery,
  onSearchChange,
  onAddWord,
  onRemoveWord,
}) => {
  const [newWord, setNewWord] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ word: string } | null>(null);

  const handleAddWord = () => {
    const result = onAddWord(newWord);
    if (result.success) {
      setNewWord('');
    } else if (result.error) {
      alert(result.error);
    }
  };

  const handleRemoveWord = (word: string) => {
    setConfirmDelete({ word });
  };

  const handleConfirmRemove = () => {
    if (confirmDelete) {
      onRemoveWord(confirmDelete.word);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="lg:col-span-2 space-y-3 sm:space-y-4">
      {/* Add Word + Search Row */}
      <div className="bg-white dark:bg-neo-navy-light/50 rounded-xl border border-gray-200 dark:border-slate-700 p-3 sm:p-4 text-gray-900 dark:text-gray-100">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Add Word Input */}
          <div className="flex gap-2 flex-1">
            <input
              type="text"
              value={newWord}
              onChange={e => setNewWord(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddWord()}
              placeholder="Add word (3+ letters)"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg font-mono text-sm sm:text-base bg-white dark:bg-neo-navy-elevated min-w-0"
            />
            <Button
              onClick={handleAddWord}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white shrink-0 min-h-[40px] min-w-[44px]"
            >
              <Plus className="h-4 w-4 sm:me-1" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:max-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Search..."
              className="w-full ps-9 pe-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-neo-navy-elevated"
            />
          </div>
        </div>
      </div>

      {/* Words Grid */}
      <div className="bg-white dark:bg-neo-navy-light/50 rounded-xl border border-gray-200 dark:border-slate-700 p-3 sm:p-4 text-gray-900 dark:text-gray-100">
        <h2 className="font-bold text-sm sm:text-base mb-3">
          Words <span className="text-gray-500">({filteredWords.length})</span>
        </h2>

        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 sm:gap-2 max-h-[50vh] sm:max-h-[600px] overflow-y-auto">
          {filteredWords.map((word, idx) => (
            <AdaptiveMotion.div
              key={word}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.005, 0.2) }}
              className="flex items-center justify-between p-1.5 sm:p-2 bg-gray-50 dark:bg-neo-navy-elevated/50 rounded-lg border border-gray-200 dark:border-slate-600 group hover:border-red-300 dark:hover:border-red-500 transition-colors"
            >
              <span className="font-mono text-xs sm:text-sm truncate flex-1">{word}</span>
              <button
                onClick={() => handleRemoveWord(word)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 ms-1 shrink-0 p-1"
                aria-label={`Remove ${word}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </AdaptiveMotion.div>
          ))}
        </div>

        {filteredWords.length === 0 && (
          <div className="text-center py-8 sm:py-12 text-gray-500 dark:text-gray-400">
            No words found
          </div>
        )}
      </div>
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove word</AlertDialogTitle>
            <AlertDialogDescription>
              Remove &quot;{confirmDelete?.word}&quot; from the word list?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove} className="bg-red-600 hover:bg-red-700">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

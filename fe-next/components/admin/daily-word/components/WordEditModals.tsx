'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Edit2, Check, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/Loader';
import type { Language } from '@/types';
import {
  formatDate,
  getEffectiveWord,
  getTodayDateString,
  LANGUAGES,
  type ScheduledWord,
} from '../types';

interface ModalBaseProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function ModalBase({ open, onClose, children }: ModalBaseProps): React.ReactElement | null {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 rounded-neo border-3 sm:border-4 border-neo-black p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Replace Word Modal
interface ReplaceWordModalProps {
  open: boolean;
  onClose: () => void;
  replaceDate: string | null;
  replaceWord: string;
  resetAllOnReplace: boolean;
  saving: boolean;
  onReplaceWordChange: (word: string) => void;
  onResetAllChange: (reset: boolean) => void;
  onSubmit: () => void;
}

export function ReplaceWordModal({
  open,
  onClose,
  replaceDate,
  replaceWord,
  resetAllOnReplace,
  saving,
  onReplaceWordChange,
  onResetAllChange,
  onSubmit,
}: ReplaceWordModalProps): React.ReactElement {
  return (
    <ModalBase open={open} onClose={onClose}>
      <h3 className="text-lg sm:text-xl font-black mb-3 sm:mb-4 flex items-center gap-2">
        <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
        <span className="truncate">Replace: {replaceDate ? formatDate(replaceDate) : 'Date'}</span>
      </h3>

      <div className="space-y-3 sm:space-y-4">
        <div>
          <label className="block text-xs sm:text-sm font-bold mb-1">New Word (2+ letters)</label>
          <input
            type="text"
            value={replaceWord}
            onChange={(e) => onReplaceWordChange(e.target.value.toUpperCase())}
            maxLength={15}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-neo-black rounded-neo font-mono text-xl sm:text-2xl uppercase text-center"
            placeholder="WORD"
          />
        </div>

        <label className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-red-50 dark:bg-red-900/20 rounded-neo border-2 border-red-300 cursor-pointer">
          <input
            type="checkbox"
            checked={resetAllOnReplace}
            onChange={(e) => onResetAllChange(e.target.checked)}
            className="w-5 h-5 rounded flex-shrink-0 mt-0.5"
          />
          <div>
            <p className="font-bold text-red-700 dark:text-red-300 text-sm sm:text-base">
              Reset all attempts
            </p>
            <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">
              Delete attempts so players can replay
            </p>
          </div>
        </label>

        <div className="flex gap-2 sm:gap-3 pt-2 sm:pt-4">
          <Button onClick={onClose} variant="outline" size="sm" className="flex-1 sm:text-base">
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={saving || replaceWord.length < 2}
            size="sm"
            className="flex-1 bg-red-500 hover:bg-red-600 text-white sm:text-base"
          >
            {saving ? (
              <Loader size="sm" className="sm:mr-2" />
            ) : (
              <RotateCcw className="w-4 h-4 sm:mr-2" />
            )}
            <span className="hidden sm:inline">Replace Word</span>
            <span className="sm:hidden">Replace</span>
          </Button>
        </div>
      </div>
    </ModalBase>
  );
}

// Add New Word Modal
interface AddWordModalProps {
  open: boolean;
  onClose: () => void;
  newWordDate: string;
  newWordValue: string;
  selectedLang: Language;
  saving: boolean;
  onDateChange: (date: string) => void;
  onWordChange: (word: string) => void;
  onSubmit: () => void;
}

export function AddWordModal({
  open,
  onClose,
  newWordDate,
  newWordValue,
  selectedLang,
  saving,
  onDateChange,
  onWordChange,
  onSubmit,
}: AddWordModalProps): React.ReactElement {
  const langInfo = LANGUAGES.find((l) => l.code === selectedLang);

  return (
    <ModalBase open={open} onClose={onClose}>
      <h3 className="text-lg sm:text-xl font-black mb-3 sm:mb-4 flex items-center gap-2">
        <Edit2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
        Add Word of the Day
      </h3>

      <div className="space-y-3 sm:space-y-4">
        <div>
          <label className="block text-xs sm:text-sm font-bold mb-1">Date</label>
          <input
            type="date"
            value={newWordDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 border-2 border-neo-black rounded-neo text-sm sm:text-base"
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-bold mb-1">Word (2+ letters)</label>
          <input
            type="text"
            value={newWordValue}
            onChange={(e) => onWordChange(e.target.value.toUpperCase())}
            maxLength={15}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-neo-black rounded-neo font-mono text-xl sm:text-2xl uppercase text-center"
            placeholder="WORD"
          />
        </div>

        <div className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-neo border-2 border-blue-300">
          <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
            <strong>Language:</strong> {langInfo?.flag} {langInfo?.name}
          </p>
          <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 mt-1">
            Change language selector above for other languages.
          </p>
        </div>

        <div className="flex gap-2 sm:gap-3 pt-2 sm:pt-4">
          <Button
            onClick={() => {
              onClose();
              onWordChange('');
              onDateChange('');
            }}
            variant="outline"
            size="sm"
            className="flex-1 sm:text-base"
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={saving || newWordValue.length < 2 || !newWordDate}
            size="sm"
            className="flex-1 bg-green-500 hover:bg-green-600 text-white sm:text-base"
          >
            {saving ? (
              <Loader size="sm" className="sm:mr-2" />
            ) : (
              <Check className="w-4 h-4 sm:mr-2" />
            )}
            <span className="hidden sm:inline">Add Word</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>
    </ModalBase>
  );
}

// Set Today's Word Modal
interface SetTodayModalProps {
  open: boolean;
  onClose: () => void;
  todayWord: ScheduledWord | undefined;
  todayWordValue: string;
  resetTodayAttempts: boolean;
  selectedLang: Language;
  saving: boolean;
  onWordChange: (word: string) => void;
  onResetChange: (reset: boolean) => void;
  onSubmit: () => void;
}

export function SetTodayModal({
  open,
  onClose,
  todayWord,
  todayWordValue,
  resetTodayAttempts,
  selectedLang,
  saving,
  onWordChange,
  onResetChange,
  onSubmit,
}: SetTodayModalProps): React.ReactElement {
  const langInfo = LANGUAGES.find((l) => l.code === selectedLang);

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && todayWordValue.length >= 2) {
      onSubmit();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-neo border-3 sm:border-4 border-red-500 p-4 sm:p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-xl sm:text-2xl font-black mb-1 sm:mb-2 flex items-center gap-2 text-red-600">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
              Set Today&apos;s Word
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">
              {langInfo?.flag} {langInfo?.name} - {formatDate(getTodayDateString())}
            </p>

            <div className="space-y-3 sm:space-y-4">
              {/* Current word info */}
              {todayWord && (
                <div className="p-2 sm:p-3 bg-amber-50 dark:bg-amber-900/20 rounded-neo border-2 border-amber-300">
                  <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300">
                    <strong>Current:</strong>{' '}
                    <span className="font-mono font-bold">{getEffectiveWord(todayWord)}</span>
                    {todayWord.override_word
                      ? ' (Override)'
                      : todayWord.ai_selected
                        ? ' (AI)'
                        : ''}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm font-bold mb-1 sm:mb-2">
                  New Word (2+ letters)
                </label>
                <input
                  type="text"
                  value={todayWordValue}
                  onChange={(e) => onWordChange(e.target.value.toUpperCase())}
                  maxLength={15}
                  autoFocus
                  className="w-full px-3 sm:px-4 py-3 sm:py-4 border-3 sm:border-4 border-neo-black rounded-neo font-mono text-2xl sm:text-3xl uppercase text-center tracking-widest"
                  placeholder="WORD"
                  onKeyDown={handleKeyDown}
                />
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1 text-center">
                  Enter to save, Escape to cancel
                </p>
              </div>

              {todayWord && (
                <label className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-red-50 dark:bg-red-900/20 rounded-neo border-2 border-red-300 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={resetTodayAttempts}
                    onChange={(e) => onResetChange(e.target.checked)}
                    className="w-5 h-5 rounded flex-shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="font-bold text-red-700 dark:text-red-300 text-sm sm:text-base">
                      Reset all attempts
                    </p>
                    <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">
                      Let everyone replay
                    </p>
                  </div>
                </label>
              )}

              <div className="flex gap-2 sm:gap-3 pt-2">
                <Button
                  onClick={() => {
                    onClose();
                    onWordChange('');
                    onResetChange(false);
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:text-base"
                >
                  Cancel
                </Button>
                <Button
                  onClick={onSubmit}
                  disabled={saving || todayWordValue.length < 2}
                  size="sm"
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold sm:text-lg py-2 sm:py-3"
                >
                  {saving ? (
                    <Loader size="sm" className="sm:mr-2" />
                  ) : (
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                  )}
                  <span className="hidden sm:inline">Set Word</span>
                  <span className="sm:hidden">Set</span>
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

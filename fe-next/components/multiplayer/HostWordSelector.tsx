'use client';

import { useState, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Check, AlertTriangle, BookOpen, Save, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { Socket } from 'socket.io-client';
import { useVocabularySelection } from '@/hooks/useVocabularySelection';
import { useClassrooms } from '@/hooks/useClassroom';
import { cn } from '@/lib/utils';
import type { Language } from '@/shared/types';

/**
 * Word item from game results
 */
interface WordItem {
  word: string;
  score: number;
  foundBy?: string[];
}

/**
 * Props for HostWordSelector component
 */
interface HostWordSelectorProps {
  /** Socket.IO client instance */
  socket: Socket | null;
  /** Game code for the multiplayer session */
  gameCode: string;
  /** Language of the game words */
  language: Language;
  /** Whether current user is the host */
  isHost: boolean;
  /** Current game state */
  gameState: string;
  /** All words found during the game */
  allWords: WordItem[];
  /** Translation function */
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * Host Word Selector Component
 *
 * Allows multiplayer hosts (who are teachers) to select vocabulary words
 * after a game ends for creating vocabulary lessons. Shows integration status
 * (can embed in grids vs track only) and provides lesson save functionality.
 *
 * Features:
 * - Visual distinction for selected words (neo-cyan border)
 * - Integration status icons (checkmark for dictionary, warning for community words)
 * - Save as lesson modal with classroom assignment
 * - Neo-brutalist styling (shadow-hard, border-neo, dark theme)
 * - Mobile responsive grid layout
 *
 * @example
 * ```tsx
 * <HostWordSelector
 *   socket={socket}
 *   gameCode="ABCD"
 *   language="en"
 *   isHost={true}
 *   gameState="finished"
 *   allWords={[{word: "cat", score: 3}, {word: "dog", score: 3}]}
 *   t={t}
 * />
 * ```
 */
export function HostWordSelector({
  socket,
  gameCode,
  language,
  isHost,
  gameState,
  allWords,
  t,
}: HostWordSelectorProps) {
  // Vocabulary selection state and actions
  const { selectedWords, toggleWord, saveAsLesson, isSaving, canSelect } = useVocabularySelection({
    socket,
    gameCode,
    language,
    isHost,
    gameState,
  });

  // Classroom data for lesson assignment
  const { classrooms } = useClassrooms();

  // Save lesson dialog state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [lessonName, setLessonName] = useState('');
  const [selectedClassroom, setSelectedClassroom] = useState<string | undefined>();
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sort words by score (highest first) - must be before early return
  const sortedWords = useMemo(() => {
    return [...allWords].sort((a, b) => b.score - a.score);
  }, [allWords]);

  // Only show if host and game is finished
  if (!canSelect) return null;

  /**
   * Handle save lesson button click
   */
  const handleSave = async () => {
    if (!lessonName.trim()) {
      setSaveError(t('teacher.lesson.name') + ' is required');
      return;
    }

    setSaveError(null);

    try {
      await saveAsLesson(lessonName.trim(), selectedClassroom);
      setSaveDialogOpen(false);
      setLessonName('');
      setSelectedClassroom(undefined);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t('teacher.wordSelector.failedToSaveLesson'));
    }
  };

  return (
    <div className="bg-neo-navy/80 border-neo rounded-neo p-4 shadow-hard">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-neo-display text-lg text-neo-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-neo-cyan" />
          {t('teacher.wordSelector.title')}
        </h3>
        {selectedWords.length > 0 && (
          <button type="button"
            onClick={() => setSaveDialogOpen(true)}
            className="btn-neo-primary text-sm px-3 py-1 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {t('teacher.wordSelector.saveAsLesson')} ({selectedWords.length})
          </button>
        )}
      </div>

      {/* Words Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
        {sortedWords.map(({ word, score }) => {
          const isSelected = selectedWords.some((w) => w.word === word.toLowerCase());
          const integration = selectedWords.find((w) => w.word === word.toLowerCase());

          return (
            <m.button
              key={word}
              onClick={() => toggleWord(word)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'flex items-center justify-between p-2 rounded-neo border-2 transition-colors',
                isSelected
                  ? 'bg-neo-cyan/20 border-neo-cyan text-neo-white'
                  : 'bg-neo-navy/50 border-gray-600 text-gray-300 hover:border-gray-400'
              )}
            >
              <span className="font-neo-body text-sm uppercase">{word}</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">{score}</span>
                {isSelected && integration && (
                  integration.canIntegrate ? (
                    <span title={t('teacher.lesson.canIntegrate')}>
                      <Check className="w-4 h-4 text-green-400" />
                    </span>
                  ) : (
                    <span title={t('teacher.lesson.cannotIntegrate')}>
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    </span>
                  )
                )}
              </div>
            </m.button>
          );
        })}
      </div>

      {/* Save Lesson Dialog */}
      <Dialog.Root open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-neo-navy border-neo-thick rounded-neo p-6 shadow-hard-lg z-50 w-full max-w-md">
            <Dialog.Title className="font-neo-display text-xl text-neo-white mb-4">
              {t('teacher.wordSelector.saveLessonTitle')}
            </Dialog.Title>

            {/* Lesson Name Input */}
            <input
              type="text"
              value={lessonName}
              onChange={(e) => {
                setLessonName(e.target.value);
                setSaveError(null);
              }}
              placeholder={t('teacher.wordSelector.lessonNamePlaceholder')}
              aria-label={t('teacher.wordSelector.saveLessonTitle')}
              className="w-full p-3 bg-neo-navy/50 border-neo rounded-neo text-neo-white placeholder:text-gray-500 mb-4"
            />

            {/* Classroom Dropdown */}
            {classrooms && classrooms.length > 0 && (
              <select
                value={selectedClassroom || ''}
                onChange={(e) => setSelectedClassroom(e.target.value || undefined)}
                className="w-full p-3 bg-neo-navy/50 border-neo rounded-neo text-neo-white mb-4"
              >
                <option value="">{t('teacher.wordSelector.noClassroom')}</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.member_count || 0} {t('teacher.classroom.members', { count: c.member_count || 0 })})
                  </option>
                ))}
              </select>
            )}

            {/* Error Message */}
            <AnimatePresence>
              {saveError && (
                <m.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-500/20 border-2 border-red-500 text-red-200 p-3 rounded-neo mb-4"
                >
                  {saveError}
                </m.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <Dialog.Close asChild>
                <button type="button" className="btn-neo-secondary px-4 py-2">
                  {t('common.cancel')}
                </button>
              </Dialog.Close>
              <button type="button"
                onClick={handleSave}
                disabled={isSaving || !lessonName.trim()}
                className={cn(
                  'btn-neo-primary px-4 py-2',
                  (isSaving || !lessonName.trim()) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isSaving ? t('teacher.lesson.saving') : t('common.save')}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

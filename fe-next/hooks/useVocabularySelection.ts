'use client';

import { useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { checkWordIntegration, type WordIntegrationResult } from './useWordIntegration';
import type { Language } from '@/shared/types';
import logger from '@/utils/logger';

/**
 * Options for the vocabulary selection hook
 */
interface UseVocabularySelectionOptions {
  /** Socket.IO client instance */
  socket: Socket | null;
  /** Game code for the multiplayer session */
  gameCode: string;
  /** Language of the game words */
  language: Language;
  /** Whether current user is the host */
  isHost: boolean;
  /** Current game state (only allow selection when 'finished') */
  gameState: string;
}

/**
 * Selected word with integration status
 */
export interface SelectedWord extends WordIntegrationResult {
  // Inherits: word, canIntegrate, reason
}

/**
 * Hook for vocabulary word selection in multiplayer games
 *
 * Enables hosts to select words after game ends for creating teacher lessons.
 * Uses Socket.IO for real-time synchronization and checkWordIntegration to
 * determine if words can be embedded in future grids.
 *
 * @param options - Configuration options
 * @returns Selection state and actions
 *
 * @example
 * ```tsx
 * const { selectedWords, toggleWord, saveAsLesson, canSelect } = useVocabularySelection({
 *   socket,
 *   gameCode: 'ABCD',
 *   language: 'en',
 *   isHost: true,
 *   gameState: 'finished'
 * });
 * ```
 */
export function useVocabularySelection(options: UseVocabularySelectionOptions) {
  const { socket } = options;
  const [selectedWords, setSelectedWords] = useState<SelectedWord[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Calculate if selection is allowed
  const canSelect = options.isHost && options.gameState === 'finished';

  // Listen for selection updates from server
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (data: { selectedWords: string[] }) => {
      logger.debug('[useVocabularySelection] Selection updated:', data);

      // Enrich with canIntegrate status
      const enriched = data.selectedWords.map(word => {
        const integration = checkWordIntegration(word, options.language);
        return integration;
      });

      setSelectedWords(enriched);
    };

    socket.on('vocabularySelectionUpdated', handleUpdate);

    return () => {
      socket.off('vocabularySelectionUpdated', handleUpdate);
    };
  }, [socket, options.language]);

  /**
   * Toggle word selection (add/remove from lesson)
   *
   * @param word - Word to toggle
   */
  const toggleWord = useCallback((word: string) => {
    if (!socket || !canSelect) {
      logger.warn('[useVocabularySelection] Cannot select word:', { canSelect, hasSocket: !!socket });
      return;
    }

    const isSelected = selectedWords.some(w => w.word === word);

    logger.debug('[useVocabularySelection] Toggling word:', { word, isSelected });

    socket.emit('selectVocabularyWord', {
      word,
      include: !isSelected,
    });
  }, [socket, canSelect, selectedWords]);

  /**
   * Save selected words as a vocabulary lesson
   *
   * @param name - Lesson name
   * @param classroomId - Optional classroom ID to assign lesson to
   * @returns Promise that resolves when lesson is saved
   */
  const saveAsLesson = useCallback(async (name: string, classroomId?: string): Promise<void> => {
    if (!socket || selectedWords.length === 0) {
      logger.warn('[useVocabularySelection] Cannot save lesson:', {
        hasSocket: !!socket,
        wordCount: selectedWords.length,
      });
      throw new Error('Cannot save lesson - no socket or no words selected');
    }

    logger.info('[useVocabularySelection] Saving lesson:', {
      name,
      classroomId,
      wordCount: selectedWords.length,
    });

    setIsSaving(true);

    return new Promise<void>((resolve, reject) => {
      // Success handler
      const handleSaved = () => {
        logger.info('[useVocabularySelection] Lesson saved successfully');
        setIsSaving(false);
        socket.off('vocabularyLessonSaved', handleSaved);
        socket.off('vocabularyLessonError', handleError);
        resolve();
      };

      // Error handler
      const handleError = (error: { message: string }) => {
        logger.error('[useVocabularySelection] Lesson save error:', error);
        setIsSaving(false);
        socket.off('vocabularyLessonSaved', handleSaved);
        socket.off('vocabularyLessonError', handleError);
        reject(new Error(error.message));
      };

      // Register handlers
      socket.once('vocabularyLessonSaved', handleSaved);
      socket.once('vocabularyLessonError', handleError);

      // Emit save event
      socket.emit('saveVocabularyLesson', {
        name,
        classroomId,
        words: selectedWords.map(w => w.word),
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (isSaving) {
          socket.off('vocabularyLessonSaved', handleSaved);
          socket.off('vocabularyLessonError', handleError);
          setIsSaving(false);
          reject(new Error('Lesson save timeout'));
        }
      }, 10000);
    });
  }, [socket, selectedWords, isSaving]);

  return {
    /** Currently selected words with integration status */
    selectedWords,
    /** Toggle word selection (add/remove) */
    toggleWord,
    /** Save selected words as lesson */
    saveAsLesson,
    /** Whether currently saving */
    isSaving,
    /** Whether selection is allowed (host in finished state) */
    canSelect,
  };
}

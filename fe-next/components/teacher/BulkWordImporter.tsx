/**
 * BulkWordImporter Component
 *
 * Dialog for bulk importing words into a vocabulary lesson.
 * Supports multiple formats: newline, comma, or space separated.
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWordIntegration } from '@/hooks/useWordIntegration';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import * as Dialog from '@radix-ui/react-dialog';
import { X, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import type { Language, VocabularyWord } from '@/lib/supabase/education';

// ============================================
// TYPES
// ============================================

interface BulkWordImporterProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog closes */
  onClose: () => void;
  /** Callback when words are imported */
  onImport: (words: VocabularyWord[]) => void;
  /** Language for word validation */
  language: Language;
}

// ============================================
// COMPONENT
// ============================================

// Delimiter pattern: requires spaces around - – — or : to avoid splitting hyphenated words
const DEFINITION_DELIMITER = /^(.+?)\s+[-–—:]\s+(.+)$/;

export default function BulkWordImporter({
  isOpen,
  onClose,
  onImport,
  language,
}: BulkWordImporterProps) {
  const { t } = useLanguage();
  const { checkWordIntegration } = useWordIntegration();

  const [inputText, setInputText] = useState('');

  // Parse and validate words from input text
  const parsedWords = useMemo(() => {
    if (!inputText.trim()) return [];

    // Try to detect format:
    // 1. Newline separated
    // 2. Comma separated
    // 3. Space separated (if no commas or newlines)
    let lines: string[];

    if (inputText.includes('\n')) {
      lines = inputText.split('\n');
    } else if (inputText.includes(',')) {
      lines = inputText.split(',');
    } else {
      lines = inputText.split(/\s+/);
    }

    // Clean up: trim, filter empty, dedupe by raw line
    const cleanedLines = lines
      .map((w) => w.trim())
      .filter((w) => w.length > 0)
      .filter((w, i, arr) => arr.indexOf(w) === i);

    // Detect definition mode: if 50%+ lines match delimiter pattern
    const matchCount = cleanedLines.filter((line) => DEFINITION_DELIMITER.test(line)).length;
    const isDefinitionMode = cleanedLines.length > 0 && matchCount / cleanedLines.length >= 0.5;

    // Parse each line, extracting definitions in definition mode
    return cleanedLines.map((line) => {
      let word = line;
      let definition = '';

      if (isDefinitionMode) {
        const match = line.match(DEFINITION_DELIMITER);
        if (match) {
          word = match[1].trim();
          definition = match[2].trim();
        }
      }

      const result = checkWordIntegration(word, language);
      return {
        word: result.word,
        canIntegrate: result.canIntegrate,
        definition,
      } as VocabularyWord;
    });
  }, [inputText, language, checkWordIntegration]);

  // Count integrable words
  const integrableCount = parsedWords.filter((w) => w.canIntegrate).length;

  // Handle import
  const handleImport = useCallback(() => {
    if (parsedWords.length === 0) return;
    onImport(parsedWords);
    setInputText('');
    onClose();
  }, [parsedWords, onImport, onClose]);

  // Handle close
  const handleClose = useCallback(() => {
    setInputText('');
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-neo-black/80 z-50" />
        <Dialog.Content
          className={cn(
            'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-lg max-h-[90vh] overflow-y-auto p-6',
            'bg-neo-navy border-neo border-neo-black shadow-hard-lg z-50 rounded-neo'
          )}
        >
          <Dialog.Title className="text-2xl font-neo-display text-neo-white mb-4 text-balance">
            {t('teacher.lesson.bulkImportTitle')}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-neo-white mb-4 text-pretty">
            {t('teacher.lesson.bulkImportDescription')}
          </Dialog.Description>

          <div className="space-y-4">
            {/* Input textarea */}
            <div>
              <label className="block text-sm font-neo-body text-neo-white mb-2">
                {t('teacher.lesson.bulkImportLabel')}
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={t('teacher.lesson.bulkImportPlaceholder')}
                aria-label={t('teacher.lesson.bulkImportLabel')}
                className={cn(
                  'w-full h-40 px-4 py-3 bg-neo-black/50 border-neo border-neo-black',
                  'text-neo-white font-neo-body shadow-hard-sm resize-none',
                  'focus:outline-hidden focus:ring-2 focus:ring-neo-cyan',
                  'placeholder:text-neo-white/50'
                )}
              />
            </div>

            {/* Word count and preview */}
            {parsedWords.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm font-neo-body">
                  <span className="text-neo-cyan tabular-nums">
                    {t('teacher.lesson.bulkImportDetected', { count: parsedWords.length })}
                  </span>
                  <span className="text-neo-white tabular-nums">
                    {integrableCount} {t('teacher.lesson.canIntegrate')}
                  </span>
                </div>

                {/* Word preview (scrollable) */}
                <div className="bg-neo-black/30 border-neo border-neo-cyan/50 p-3 rounded-neo max-h-40 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {parsedWords.slice(0, 50).map((word, idx) => (
                      <div
                        key={`${word.word}-${idx}`}
                        className={cn(
                          'flex items-center gap-1 px-2 py-1 rounded text-sm font-neo-body',
                          word.canIntegrate
                            ? 'bg-neo-cyan/20 text-neo-cyan border border-neo-cyan/30'
                            : 'bg-neo-lime/20 text-neo-lime border border-neo-lime/30'
                        )}
                      >
                        {word.canIntegrate ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        <span>{word.word}</span>
                        {word.definition && (
                          <span className="text-xs opacity-70">— {word.definition}</span>
                        )}
                      </div>
                    ))}
                    {parsedWords.length > 50 && (
                      <span className="text-neo-white text-xs self-center">
                        +{parsedWords.length - 50} {t('common.more')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleImport}
                disabled={parsedWords.length === 0}
                className="flex-1 bg-neo-cyan text-neo-black font-bold shadow-hard hover:shadow-hard-pressed"
              >
                <Upload className="w-4 h-4 me-2" />
                {t('teacher.lesson.bulkImportButton')}
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-neo-pink text-neo-pink hover:bg-neo-pink/20"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>

          <Dialog.Close asChild>
            <button
              type="button"
              className="absolute top-4 right-4 text-neo-white hover:text-neo-white"
              aria-label={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

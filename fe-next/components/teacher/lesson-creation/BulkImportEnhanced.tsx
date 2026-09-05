/**
 * BulkImportEnhanced Component
 *
 * Enhanced bulk word import with:
 * - Row-level validation feedback
 * - Hebrew niqqud warnings
 * - CSV file upload
 * - Summary stats (ready/warning/error counts)
 */

'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWordIntegration } from '@/hooks/useWordIntegration';
import { containsHebrew, type Language, type VocabularyWord, type VocabularyLevel } from '@/lib/supabase/education/types';
import { sanitizeWord } from '@/shared/utils/wordNormalization';
import { withBlank } from '@/lib/education/vocabFocus';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import * as Dialog from '@radix-ui/react-dialog';
import { X, CheckCircle, AlertCircle, Upload, FileUp } from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface BulkImportEnhancedProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (words: VocabularyWord[]) => void;
  language: Language;
}

interface ValidationResult {
  word: string;
  originalWord: string;
  canIntegrate: boolean;
  reason?: string;
  definition?: string;
  rowNumber: number;
  hasNiqqud: boolean;
  extras: Omit<ParsedImportLine, 'word' | 'definition'>;
}

/** One pasted line, fully parsed. Optional keys are absent (not undefined) when missing. */
export interface ParsedImportLine {
  word: string;
  definition: string;
  synonyms?: string[];
  antonyms?: string[];
  example?: string;
  level?: VocabularyLevel;
}

// ============================================
// COMPONENT
// ============================================

// Delimiter pattern: requires spaces around - – — or : to avoid splitting hyphenated words
const DEFINITION_DELIMITER = /^(.+?)\s+[-–—:]\s+(.+)$/;
// Extra columns come after ` | ` segments: `syn: a, b | ant: c | ex: The ___ ran. | level: challenge`
const SEGMENT_SPLIT = /\s*\|\s*/;
const SEGMENT_KEY = /^([a-z]+)\s*:\s*(.+)$/i;
const LEVELS: readonly VocabularyLevel[] = ['support', 'core', 'challenge'];

const toList = (value: string): string[] =>
  value.split(/[,;、，]/).map((s) => s.trim()).filter((s) => s.length > 0);

/**
 * Parse one import line. Supports the legacy `word - definition` form plus
 * optional pipe-separated extras (any order, long or short keys):
 *   `word - definition | syn: a, b | ant: c | ex: The ___ ran. | level: challenge`
 */
export function parseBulkImportLine(line: string): ParsedImportLine {
  const [head = '', ...segments] = line.trim().split(SEGMENT_SPLIT);
  const match = head.match(DEFINITION_DELIMITER);
  const result: ParsedImportLine = match
    ? { word: match[1].trim(), definition: match[2].trim() }
    : { word: head.trim(), definition: '' };

  for (const segment of segments) {
    const keyed = segment.match(SEGMENT_KEY);
    if (!keyed) continue;
    const key = keyed[1].toLowerCase();
    const value = keyed[2].trim();
    if (!value) continue;
    if (key === 'syn' || key === 'synonym' || key === 'synonyms') {
      const list = toList(value);
      if (list.length) result.synonyms = list;
    } else if (key === 'ant' || key === 'antonym' || key === 'antonyms') {
      const list = toList(value);
      if (list.length) result.antonyms = list;
    } else if (key === 'ex' || key === 'example') {
      // Insert the blank when the teacher wrote the word out in full.
      result.example = withBlank(value, result.word) ?? value;
    } else if (key === 'level' || key === 'lvl') {
      const level = value.toLowerCase() as VocabularyLevel;
      if (LEVELS.includes(level)) result.level = level;
    }
  }
  return result;
}

export default function BulkImportEnhanced({
  isOpen,
  onClose,
  onImport,
  language,
}: BulkImportEnhancedProps) {
  const { t } = useLanguage();
  const { checkWordIntegration } = useWordIntegration();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inputText, setInputText] = useState('');

  // Parse and validate words from input text
  const validationResults = useMemo((): ValidationResult[] => {
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

    // Clean up: trim, filter empty
    const cleanedLines = lines
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    // Detect definition mode: if 50%+ lines match delimiter pattern (on the
    // part before any ` | ` extras)
    const matchCount = cleanedLines.filter((line) => DEFINITION_DELIMITER.test(line.split(SEGMENT_SPLIT)[0])).length;
    const isDefinitionMode = cleanedLines.length > 0 && matchCount / cleanedLines.length >= 0.5;

    // Parse and validate each line
    return cleanedLines.map((line, index) => {
      const parsed = parseBulkImportLine(line);
      const { word: parsedWord, definition: parsedDefinition, ...extras } = parsed;
      let originalWord = parsedWord;
      let definition = parsedDefinition;

      if (!isDefinitionMode && !line.includes('|')) {
        // Legacy behaviour: without definition mode the whole line is the word
        originalWord = line;
        definition = '';
      }

      // Check for Hebrew niqqud
      const hasNiqqud = language === 'he' && containsHebrew(originalWord) && /[\u0591-\u05C7]/.test(originalWord);

      // Sanitize Hebrew word (removes niqqud)
      const sanitizedWord = language === 'he' ? sanitizeWord(originalWord, 'he') : originalWord;

      // Validate word
      const result = checkWordIntegration(sanitizedWord, language);

      return {
        word: result.word,
        originalWord,
        canIntegrate: result.canIntegrate,
        reason: result.reason,
        definition,
        rowNumber: index + 1,
        hasNiqqud,
        extras,
      };
    });
  }, [inputText, language, checkWordIntegration]);

  // Calculate stats
  const stats = useMemo(() => {
    const ready = validationResults.filter((r) => r.canIntegrate).length;
    const errors = validationResults.filter((r) => !r.canIntegrate).length;
    const niqqudWarnings = validationResults.filter((r) => r.hasNiqqud).length;

    return { ready, errors, niqqudWarnings };
  }, [validationResults]);

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setInputText(text);
    };
    reader.readAsText(file);
  }, []);

  // Handle import
  const handleImport = useCallback(() => {
    if (validationResults.length === 0) return;

    const words: VocabularyWord[] = validationResults.map((r) => ({
      word: r.word,
      definition: r.definition || undefined,
      canIntegrate: r.canIntegrate,
      ...r.extras,
    }));

    onImport(words);
    setInputText('');
    onClose();
  }, [validationResults, onImport, onClose]);

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
          <Dialog.Description className="text-sm text-neo-white mb-2 text-pretty">
            {t('teacher.lesson.bulkImportDescription')}
          </Dialog.Description>
          <p className="text-xs text-neo-white/80 font-neo-body mb-4 text-pretty">
            {t('teacher.wordDetails.importFormatHelp')}
            <code className="block mt-1 px-2 py-1 rounded bg-neo-black/40 text-neo-cyan text-[11px] whitespace-pre-wrap" dir="ltr">
              {t('teacher.wordDetails.importFormatExample')}
            </code>
          </p>

          <div className="space-y-4">
            {/* File upload area */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'w-full p-4 border-neo border-dashed border-neo-cyan/50 rounded-neo',
                  'bg-neo-black/30 hover:bg-neo-black/50 transition-all',
                  'flex items-center justify-center gap-2 text-neo-cyan font-neo-body'
                )}
              >
                <FileUp className="w-5 h-5" />
                <span>Drop CSV file here or click to browse</span>
              </button>
            </div>

            {/* Input textarea */}
            <div>
              <label className="block text-sm font-neo-body text-neo-white mb-2">
                {t('teacher.lesson.bulkImportLabel')}
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={t('teacher.lesson.bulkImportPlaceholder')}
                className={cn(
                  'w-full h-40 px-4 py-3 bg-neo-black/50 border-neo border-neo-black',
                  'text-neo-white font-neo-body shadow-hard-sm resize-none',
                  'focus:outline-hidden focus:ring-2 focus:ring-neo-cyan',
                  'placeholder:text-neo-white/50'
                )}
              />
            </div>

            {/* Validation results */}
            {validationResults.length > 0 && (
              <div className="space-y-3">
                {/* Stats bar */}
                <div className="flex items-center gap-4 text-sm font-neo-body">
                  <span className="text-neo-cyan tabular-nums">
                    {t('teacher.lesson.bulkImportDetected', { count: validationResults.length })}
                  </span>
                  <div className="flex items-center gap-4 ms-auto">
                    {stats.ready > 0 && (
                      <div className="flex items-center gap-1 text-neo-cyan">
                        <CheckCircle className="w-4 h-4" />
                        <span className="tabular-nums">{stats.ready} {t('teacher.lesson.canIntegrate')}</span>
                      </div>
                    )}
                    {stats.errors > 0 && (
                      <div className="flex items-center gap-1 text-neo-lime">
                        <AlertCircle className="w-4 h-4" />
                        <span className="tabular-nums">{stats.errors} errors</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Niqqud warning */}
                {stats.niqqudWarnings > 0 && (
                  <div className="p-3 bg-neo-lime/20 border-neo border-neo-lime/50 rounded-neo">
                    <div className="flex items-center gap-2 text-sm font-neo-body text-neo-lime">
                      <AlertCircle className="w-4 h-4" />
                      <span>
                        {stats.niqqudWarnings} words contain niqqud (vowel points will be removed)
                      </span>
                    </div>
                  </div>
                )}

                {/* Word preview (scrollable) */}
                <div className="bg-neo-black/30 border-neo border-neo-cyan/50 p-3 rounded-neo max-h-40 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {validationResults.slice(0, 50).map((result, idx) => (
                      <div
                        key={`${result.word}-${idx}`}
                        className={cn(
                          'flex items-center gap-1 px-2 py-1 rounded text-sm font-neo-body',
                          result.canIntegrate
                            ? 'bg-neo-cyan/20 text-neo-cyan border border-neo-cyan/30'
                            : 'bg-neo-lime/20 text-neo-lime border border-neo-lime/30'
                        )}
                      >
                        {result.canIntegrate ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        <span>{result.word}</span>
                        {!result.canIntegrate && (
                          <span className="text-xs opacity-70">(row {result.rowNumber})</span>
                        )}
                      </div>
                    ))}
                    {validationResults.length > 50 && (
                      <span className="text-neo-white text-xs self-center">
                        +{validationResults.length - 50} {t('common.more')}
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
                disabled={validationResults.length === 0}
                className="flex-1 bg-neo-cyan text-neo-black font-bold shadow-hard hover:shadow-hard-pressed"
              >
                <Upload className="w-4 h-4 me-2" />
                {t('teacher.lesson.bulkImportButton')}
                {stats.ready > 0 && ` ${stats.ready} words`}
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
            <button type="button"
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

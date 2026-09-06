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
import { containsHebrew, type Language, type VocabularyWord, type VocabularyLevel, type WordMorphology } from '@/lib/supabase/education/types';
import { sanitizeWord } from '@/shared/utils/wordNormalization';
import { withBlank } from '@/lib/education/vocabFocus';
import { stripHyphens } from '@/lib/education/vocabFocusSkills';
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
  /** The row looks like several words crammed onto one line. */
  tooManyWords: boolean;
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
  /** `mean:` — senses for multiple-meaning practice. */
  meanings?: string[];
  /** `root: / pre: / suf:` — word parts for roots/affixes practice. */
  morphology?: WordMorphology;
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

/**
 * A row carries structure — pipe segments, or a `word - definition` pair —
 * rather than being one bare word in a list.
 */
const isStructuredRow = (text: string): boolean =>
  text.includes('|') || DEFINITION_DELIMITER.test(text);

/**
 * Turn pasted text into rows.
 *
 * Newlines win when present. Otherwise a SINGLE structured row is kept whole:
 * splitting it on commas cuts it apart at `syn: a, b`, which silently
 * truncated the synonyms and stranded the later segments on a wordless row.
 * Only a plain list of bare words is split on commas or whitespace.
 */
export function splitImportLines(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  let rows: string[];
  if (trimmed.includes('\n')) rows = trimmed.split('\n');
  else if (isStructuredRow(trimmed)) rows = [trimmed];
  else if (trimmed.includes(',')) rows = trimmed.split(',');
  else rows = trimmed.split(/\s+/);

  return rows.map((row) => row.trim()).filter((row) => row.length > 0);
}

/**
 * Roughly how many words a line is trying to carry.
 *
 * Pasting several `word - definition` pairs onto one line used to merge them
 * into a single garbled record, silently. One line is genuinely ambiguous —
 * a definition may legitimately contain a dash — so this only reports "more
 * than one" where the evidence is strong, and the caller then refuses the row
 * rather than guessing which reading was meant.
 *
 * Two strong signals:
 *  - three or more ` - ` delimiters in the head (a lone definition almost
 *    never has that many, while four crammed pairs always do)
 *  - a repeated segment key, e.g. two `level:` or two `syn:`, which no single
 *    word can justify
 */
export function countWordBoundaries(line: string): number {
  const [head = '', ...segments] = line.trim().split(SEGMENT_SPLIT);

  const keys = segments
    .map((segment) => segment.match(SEGMENT_KEY)?.[1]?.toLowerCase())
    .filter((key): key is string => Boolean(key));
  const repeatedKey = keys.length !== new Set(keys).size;

  const delimiters = head.match(/\s+[-–—:]\s+/g)?.length ?? 0;

  return repeatedKey || delimiters >= 3 ? 2 : 1;
}

const toList = (value: string): string[] =>
  value.split(/[,;、，]/).map((s) => s.trim()).filter((s) => s.length > 0);

// A sense is a phrase and routinely contains a comma ("the boot of a car, at
// the back"), so meanings split on semicolons only.
const toSenses = (value: string): string[] =>
  value.split(/[;；]/).map((s) => s.trim()).filter((s) => s.length > 0);

/**
 * Parse one import line. Supports the legacy `word - definition` form plus
 * optional pipe-separated extras (any order, long or short keys):
 *   `word - definition | syn: a, b | ant: c | ex: The ___ ran. | level: challenge`
 *   `| mean: a river edge; a money place | root: aqua = water | pre: un | suf: ful`
 */
export function parseBulkImportLine(line: string): ParsedImportLine {
  const [head = '', ...segments] = line.trim().split(SEGMENT_SPLIT);
  const match = head.match(DEFINITION_DELIMITER);
  const result: ParsedImportLine = match
    ? { word: match[1].trim(), definition: match[2].trim() }
    : { word: head.trim(), definition: '' };
  const morphology: WordMorphology = {};

  const setMorpheme = (key: keyof WordMorphology, raw: string) => {
    const value = key === 'rootMeaning' ? raw.trim() : stripHyphens(raw);
    if (value) morphology[key] = value;
  };

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
    } else if (key === 'mean' || key === 'meaning' || key === 'meanings') {
      const senses = toSenses(value);
      if (senses.length) result.meanings = senses;
    } else if (key === 'root') {
      // `root: aqua = water` sets the root and what it means in one go.
      const [rootPart, meaningPart] = value.split('=');
      setMorpheme('root', rootPart ?? '');
      if (meaningPart !== undefined) setMorpheme('rootMeaning', meaningPart);
    } else if (key === 'rootmean' || key === 'rootmeaning' || key === 'rmean') {
      setMorpheme('rootMeaning', value);
    } else if (key === 'pre' || key === 'prefix') {
      setMorpheme('prefix', value);
    } else if (key === 'suf' || key === 'suffix') {
      setMorpheme('suffix', value);
    }
  }

  // A root meaning with no root of its own would never build a question.
  if (morphology.rootMeaning && !morphology.root) delete morphology.rootMeaning;
  if (Object.keys(morphology).length > 0) result.morphology = morphology;
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

    const cleanedLines = splitImportLines(inputText);

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
        tooManyWords: countWordBoundaries(line) > 1,
        extras,
      };
    });
  }, [inputText, language, checkWordIntegration]);

  // Calculate stats
  // A row whose word came out empty (stray segments, a lone `|`) can never
  // become a word. It is shown as an error row and excluded from the import —
  // importing it would create a nameless entry, and dropping it in silence
  // would leave the teacher believing the paste worked.
  const isUnreadable = (r: ValidationResult) => r.word.trim().length === 0 || r.tooManyWords;
  const unreadableRows = useMemo(() => validationResults.filter(isUnreadable), [validationResults]);
  const importableRows = useMemo(
    () => validationResults.filter((r) => !isUnreadable(r)),
    [validationResults]
  );
  const crammedRows = useMemo(
    () => validationResults.filter((r) => r.tooManyWords),
    [validationResults]
  );

  const stats = useMemo(() => {
    const ready = importableRows.filter((r) => r.canIntegrate).length;
    const errors = importableRows.filter((r) => !r.canIntegrate).length;
    const niqqudWarnings = importableRows.filter((r) => r.hasNiqqud).length;

    return { ready, errors, niqqudWarnings, unreadable: unreadableRows.length };
  }, [importableRows, unreadableRows]);

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
    if (importableRows.length === 0) return;

    const words: VocabularyWord[] = importableRows.map((r) => ({
      word: r.word,
      definition: r.definition || undefined,
      canIntegrate: r.canIntegrate,
      ...r.extras,
    }));

    onImport(words);
    setInputText('');
    onClose();
  }, [importableRows, onImport, onClose]);

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
                    {t('teacher.lesson.bulkImportDetected', { count: importableRows.length })}
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

                {/* Rows that could not be read at all — named, never dropped quietly */}
                {unreadableRows.length > 0 && (
                  <div
                    data-testid="bulk-import-unreadable"
                    role="alert"
                    className="p-3 bg-neo-pink/20 border-neo border-neo-pink/50 rounded-neo"
                  >
                    <div className="flex items-start gap-2 text-sm font-neo-body text-neo-pink">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                      <span className="text-pretty">
                        {t('teacher.lesson.bulkImportUnreadable', {
                          count: unreadableRows.length,
                          rows: unreadableRows.map((r) => r.rowNumber).join(', '),
                        })}
                        {crammedRows.length > 0 && (
                          <span className="block mt-1">
                            {t('teacher.lesson.bulkImportOneWordPerLine', {
                              rows: crammedRows.map((r) => r.rowNumber).join(', '),
                            })}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Word preview (scrollable) */}
                <div className="bg-neo-black/30 border-neo border-neo-cyan/50 p-3 rounded-neo max-h-40 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {importableRows.slice(0, 50).map((result, idx) => (
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
                    {importableRows.length > 50 && (
                      <span className="text-neo-white text-xs self-center">
                        +{importableRows.length - 50} {t('common.more')}
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
                disabled={importableRows.length === 0}
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
              className="absolute top-4 end-4 text-neo-white hover:text-neo-white"
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

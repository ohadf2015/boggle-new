'use client';

import { useState, useCallback, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWordIntegration } from '@/hooks/useWordIntegration';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, CheckCircle, AlertCircle, Trash2, Upload, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
import type { Language, VocabularyWord, VocabularyLevel } from '@/lib/supabase/education';
import { lessonWordStats, withBlank } from '@/lib/education/vocabFocus';
import {
  mergeEnrichment,
  wordsNeedingEnrichment,
  MAX_ENRICH_WORDS,
  type EnrichableField,
  type EnrichmentMap,
} from '@/lib/education/vocabEnrich';
import logger from '@/utils/logger';

interface WordListEditorProps {
  words: VocabularyWord[];
  onWordsChange: (words: VocabularyWord[]) => void;
  language: Language;
  showAddInput?: boolean;
  showBulkImport?: boolean;
  onBulkImportOpen?: () => void;
  maxHeight?: string;
  /** Show the "fill in missing … (AI)" button. Defaults to on. */
  showAiFill?: boolean;
}

const LEVELS: readonly { value: VocabularyLevel; key: string; activeClass: string }[] = [
  { value: 'support', key: 'teacher.wordDetails.levelSupport', activeClass: 'bg-neo-lime text-neo-black' },
  { value: 'core', key: 'teacher.wordDetails.levelCore', activeClass: 'bg-neo-cyan text-neo-black' },
  { value: 'challenge', key: 'teacher.wordDetails.levelChallenge', activeClass: 'bg-neo-pink text-neo-black' },
];

type ListField = 'synonyms' | 'antonyms';

const parseList = (value: string): string[] =>
  value.split(/[,;、，]/).map((s) => s.trim()).filter((s) => s.length > 0);

const joinList = (list: string[] | undefined): string => (list && list.length ? list.join(', ') : '');

export default function WordListEditor({
  words,
  onWordsChange,
  language,
  showAddInput = false,
  showBulkImport = false,
  onBulkImportOpen,
  maxHeight = 'max-h-60',
  showAiFill = true,
}: WordListEditorProps) {
  const { t } = useLanguage();
  const { checkWordIntegration } = useWordIntegration();
  const [currentWord, setCurrentWord] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  // Local drafts so comma-typing / blank-insertion never fights the controlled value
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'error'>('idle');
  // word → fields the AI filled, so the teacher can review them before saving
  const [aiFilled, setAiFilled] = useState<Record<string, EnrichableField[]>>({});

  const stats = useMemo(() => lessonWordStats(words), [words]);
  const incompleteWords = useMemo(() => wordsNeedingEnrichment(words), [words]);

  const updateWord = useCallback(
    (index: number, patch: Partial<VocabularyWord>) => {
      onWordsChange(words.map((w, i) => (i === index ? { ...w, ...patch } : w)));
    },
    [onWordsChange, words]
  );

  const handleAddWord = useCallback(() => {
    if (!currentWord.trim()) return;
    const result = checkWordIntegration(currentWord.trim(), language);
    const newWord: VocabularyWord = {
      word: result.word,
      canIntegrate: result.canIntegrate,
      definition: '',
    };
    onWordsChange([...words, newWord]);
    setCurrentWord('');
  }, [currentWord, checkWordIntegration, language, onWordsChange, words]);

  const handleRemoveWord = useCallback((index: number) => {
    onWordsChange(words.filter((_, i) => i !== index));
    setExpanded((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    });
  }, [onWordsChange, words]);

  const handleDefinitionChange = useCallback((index: number, definition: string) => {
    updateWord(index, { definition });
  }, [updateWord]);

  const toggleExpanded = useCallback((index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const draftKey = (index: number, field: string) => `${index}:${field}`;
  const clearDraft = (key: string) =>
    setDrafts((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleListChange = (index: number, field: ListField, value: string) => {
    setDrafts((prev) => ({ ...prev, [draftKey(index, field)]: value }));
    const list = parseList(value);
    updateWord(index, { [field]: list.length ? list : undefined });
  };

  const handleExampleChange = (index: number, value: string) => {
    setDrafts((prev) => ({ ...prev, [draftKey(index, 'example')]: value }));
    updateWord(index, { example: value });
  };

  const handleExampleBlur = (index: number) => {
    const key = draftKey(index, 'example');
    const raw = drafts[key] ?? words[index]?.example ?? '';
    const blanked = withBlank(raw, words[index]?.word ?? '');
    if (blanked && blanked !== raw) {
      updateWord(index, { example: blanked });
    }
    clearDraft(key);
  };

  const handleAiFill = useCallback(async () => {
    const targets = incompleteWords.slice(0, MAX_ENRICH_WORDS);
    if (targets.length === 0) return;
    setAiState('loading');
    try {
      const response = await fetch('/api/education/lesson-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: targets, language }),
      });
      if (!response.ok) throw new Error(`lesson-enrich ${response.status}`);
      const data = (await response.json()) as { enrichment?: EnrichmentMap };
      const { words: merged, filled } = mergeEnrichment(words, data.enrichment ?? {});
      setAiFilled(filled);
      setAiState('idle');
      if (Object.keys(filled).length > 0) {
        setDrafts({});
        setExpanded(new Set(words.map((w, i) => (filled[w.word] ? i : -1)).filter((i) => i >= 0)));
        onWordsChange(merged);
      }
    } catch (error) {
      logger.error('AI lesson enrichment failed:', error);
      setAiState('error');
    }
  }, [incompleteWords, language, words, onWordsChange]);

  const isAiFilled = (word: VocabularyWord, field: EnrichableField) => aiFilled[word.word]?.includes(field) ?? false;
  const aiHighlight = 'ring-2 ring-neo-yellow border-neo-yellow';

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-neo-body text-neo-white">
          {t('teacher.lesson.words', { count: words.length })} ({words.length})
        </label>
        {showBulkImport && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onBulkImportOpen}
            className="text-neo-cyan border-neo-cyan hover:bg-neo-cyan/20 text-xs"
          >
            <Upload className="w-3 h-3 me-1" />
            {t('teacher.lesson.bulkImport')}
          </Button>
        )}
      </div>

      {showAddInput && (
        <div className="flex gap-2 mb-3">
          <Input
            value={currentWord}
            onChange={(e) => setCurrentWord(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddWord();
              }
            }}
            placeholder={t('teacher.lesson.wordPlaceholder')}
            className="flex-1 border-neo border-neo-black shadow-hard-sm"
          />
          <Button
            onClick={handleAddWord}
            disabled={!currentWord.trim()}
            className="bg-neo-cyan text-neo-black font-bold shadow-hard hover:shadow-hard-pressed"
            aria-label={t('teacher.lesson.addWord')}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      )}

      {words.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <p data-testid="word-list-summary" className="text-xs text-neo-white/80 font-neo-body tabular-nums">
            {t('teacher.wordDetails.summary', {
              count: stats.total,
              definitions: stats.withDefinitions,
              synonyms: stats.withSynonyms,
              antonyms: stats.withAntonyms,
              examples: stats.withExamples,
            })}
          </p>
          {showAiFill && incompleteWords.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAiFill}
              disabled={aiState === 'loading'}
              className="text-neo-yellow border-neo-yellow hover:bg-neo-yellow/20 text-xs"
            >
              {aiState === 'loading' ? (
                <Loader2 className="w-3 h-3 me-1 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3 me-1" />
              )}
              {aiState === 'loading' ? t('teacher.wordDetails.aiFilling') : t('teacher.wordDetails.aiFill')}
            </Button>
          )}
        </div>
      )}

      {aiState === 'error' && (
        <p role="alert" className="text-xs text-neo-pink font-neo-body mb-2">
          {t('teacher.wordDetails.aiError')}
        </p>
      )}
      {Object.keys(aiFilled).length > 0 && (
        <p className="text-xs text-neo-yellow font-neo-body mb-2 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          {t('teacher.wordDetails.aiFilledNote')}
        </p>
      )}

      {words.length > 0 ? (
        <div className={cn('bg-neo-black/30 border-neo border-neo-cyan p-4 rounded-neo overflow-y-auto', maxHeight)}>
          <div className="space-y-2">
            {words.map((word, idx) => {
              const isOpen = expanded.has(idx);
              const level: VocabularyLevel = word.level ?? 'core';
              return (
                <div
                  key={`word-${idx}-${word.word}`}
                  className="bg-neo-navy/50 p-2 rounded border border-neo-black"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {word.canIntegrate ? (
                        <div className="flex items-center gap-1 text-neo-cyan">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs">{t('teacher.lesson.canIntegrate')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-neo-lime">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-xs">{t('teacher.lesson.cannotIntegrate')}</span>
                        </div>
                      )}
                      <span className="text-neo-white font-neo-body ms-2 truncate">{word.word}</span>
                      {word.level && word.level !== 'core' && (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-neo-black/40 text-neo-white/80">
                          {t(LEVELS.find((l) => l.value === word.level)?.key ?? 'teacher.wordDetails.levelCore')}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleExpanded(idx)}
                      aria-expanded={isOpen}
                      aria-controls={`word-details-${idx}`}
                      className="text-neo-cyan hover:bg-neo-cyan/20 text-xs"
                    >
                      {isOpen ? <ChevronUp className="w-4 h-4 me-1" /> : <ChevronDown className="w-4 h-4 me-1" />}
                      {t('teacher.wordDetails.more')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveWord(idx)}
                      className="text-neo-pink hover:bg-neo-pink/20"
                      aria-label={t('teacher.lesson.removeWord')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <Input
                    value={word.definition || ''}
                    onChange={(e) => handleDefinitionChange(idx, e.target.value)}
                    placeholder={t('teacher.lesson.definitionPlaceholder')}
                    data-ai-filled={isAiFilled(word, 'definition') ? 'true' : undefined}
                    className={cn(
                      'mt-1 text-xs h-8 border-neo-black/50 bg-neo-black/20',
                      isAiFilled(word, 'definition') && aiHighlight
                    )}
                  />

                  {isOpen && (
                    <div
                      id={`word-details-${idx}`}
                      data-testid={`word-details-${idx}`}
                      className="mt-2 space-y-2 border-t border-neo-black/40 pt-2"
                    >
                      {/* Level */}
                      <div
                        role="radiogroup"
                        aria-label={t('teacher.wordDetails.level')}
                        className="flex items-center gap-2 flex-wrap"
                      >
                        <span className="text-xs text-neo-white/80 font-neo-body me-1">
                          {t('teacher.wordDetails.level')}
                        </span>
                        {LEVELS.map((option) => {
                          const active = level === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => updateWord(idx, { level: option.value })}
                              className={cn(
                                'min-h-9 px-3 rounded-neo border-2 border-neo-black text-xs font-bold transition-all',
                                active ? cn(option.activeClass, 'shadow-hard-sm') : 'bg-neo-black/30 text-neo-white hover:bg-neo-black/50'
                              )}
                            >
                              {t(option.key)}
                            </button>
                          );
                        })}
                      </div>

                      {/* Synonyms / antonyms */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(['synonyms', 'antonyms'] as const).map((field) => (
                          <label key={field} className="block">
                            <span className="text-xs text-neo-white/80 font-neo-body">
                              {t(`teacher.wordDetails.${field}`)}
                            </span>
                            <Input
                              value={drafts[draftKey(idx, field)] ?? joinList(word[field])}
                              onChange={(e) => handleListChange(idx, field, e.target.value)}
                              onBlur={() => clearDraft(draftKey(idx, field))}
                              placeholder={t(`teacher.wordDetails.${field}Placeholder`)}
                              data-ai-filled={isAiFilled(word, field) ? 'true' : undefined}
                              className={cn(
                                'mt-1 text-xs h-9 border-neo-black/50 bg-neo-black/20',
                                isAiFilled(word, field) && aiHighlight
                              )}
                            />
                          </label>
                        ))}
                      </div>

                      {/* Example sentence */}
                      <label className="block">
                        <span className="text-xs text-neo-white/80 font-neo-body">
                          {t('teacher.wordDetails.example')}
                        </span>
                        <Input
                          value={drafts[draftKey(idx, 'example')] ?? word.example ?? ''}
                          onChange={(e) => handleExampleChange(idx, e.target.value)}
                          onBlur={() => handleExampleBlur(idx)}
                          placeholder={t('teacher.wordDetails.examplePlaceholder')}
                          data-ai-filled={isAiFilled(word, 'example') ? 'true' : undefined}
                          className={cn(
                            'mt-1 text-xs h-9 border-neo-black/50 bg-neo-black/20',
                            isAiFilled(word, 'example') && aiHighlight
                          )}
                        />
                        <span className="block mt-1 text-[11px] text-neo-white/60 font-neo-body">
                          {t('teacher.wordDetails.exampleHelp')}
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-neo-white text-center py-4">
          {t('teacher.lesson.noWords')}
        </p>
      )}
    </div>
  );
}

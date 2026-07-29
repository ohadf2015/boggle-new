'use client';

import { useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWordIntegration } from '@/hooks/useWordIntegration';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, CheckCircle, AlertCircle, Trash2, Upload } from 'lucide-react';
import type { Language, VocabularyWord } from '@/lib/supabase/education';

interface WordListEditorProps {
  words: VocabularyWord[];
  onWordsChange: (words: VocabularyWord[]) => void;
  language: Language;
  showAddInput?: boolean;
  showBulkImport?: boolean;
  onBulkImportOpen?: () => void;
  maxHeight?: string;
}

export default function WordListEditor({
  words,
  onWordsChange,
  language,
  showAddInput = false,
  showBulkImport = false,
  onBulkImportOpen,
  maxHeight = 'max-h-60',
}: WordListEditorProps) {
  const { t } = useLanguage();
  const { checkWordIntegration } = useWordIntegration();
  const [currentWord, setCurrentWord] = useState('');

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
  }, [onWordsChange, words]);

  const handleDefinitionChange = useCallback((index: number, definition: string) => {
    const updated = words.map((w, i) => i === index ? { ...w, definition } : w);
    onWordsChange(updated);
  }, [onWordsChange, words]);

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

      {words.length > 0 ? (
        <div className={cn('bg-neo-black/30 border-neo border-neo-cyan p-4 rounded-neo overflow-y-auto', maxHeight)}>
          <div className="space-y-2">
            {words.map((word, idx) => (
              <div
                key={`word-${idx}-${word.word}`}
                className="bg-neo-navy/50 p-2 rounded border border-neo-black"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
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
                    <span className="text-neo-white font-neo-body ms-2">{word.word}</span>
                  </div>
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
                  className="mt-1 text-xs h-8 border-neo-black/50 bg-neo-black/20"
                />
              </div>
            ))}
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

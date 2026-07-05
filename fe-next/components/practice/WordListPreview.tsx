'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Search,
  CheckCircle,
  AlertCircle,
  BookOpen
} from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import type { VocabularyWord } from '@/lib/supabase/education';

interface WordListPreviewProps {
  lessonName: string;
  words: VocabularyWord[];
  onBack: () => void;
  onViewComplete?: () => void;
}

export default function WordListPreview({
  lessonName,
  words,
  onBack,
  onViewComplete,
}: WordListPreviewProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedWord, setExpandedWord] = useState<string | null>(null);

  // Filter words based on search
  const filteredWords = words.filter((word) =>
    word.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (word.definition?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleToggleExpand = (word: string) => {
    setExpandedWord((prev) => (prev === word ? null : word));
  };

  return (
    <div className="min-h-screen bg-neo-navy p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onViewComplete?.();
              onBack();
            }}
            className="text-slate-400 hover:text-neo-white"
          >
            <DirectionalIcon icon={ArrowLeft} className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-neo-display text-neo-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-neo-yellow" />
              {t('education.practice.wordList')}
            </h1>
            <p className="text-sm text-slate-400">{lessonName}</p>
          </div>
        </div>

        {/* Stats bar */}
        <Card className="border-neo border-neo-black shadow-hard bg-neo-navy/80 mb-4">
          <CardContent className="py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">
                {words.length} {t('education.practice.wordCount')} {t('education.practice.total')}
              </span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-neo-cyan">
                  <CheckCircle className="w-4 h-4" />
                  {words.filter((w) => w.canIntegrate).length} {t('education.practice.canEmbed')}
                </span>
                <span className="flex items-center gap-1 text-neo-yellow">
                  <AlertCircle className="w-4 h-4" />
                  {words.filter((w) => !w.canIntegrate).length} {t('education.practice.trackOnly')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative mb-4">
          <Search className={cn(
            'absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400',
            isRTL ? 'right-3' : 'left-3'
          )} />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('education.practice.searchWords')}
            className={cn(
              'border-neo border-neo-black shadow-hard-sm bg-neo-navy/50',
              'ps-10'
            )}
          />
        </div>

        {/* Word list */}
        <div className="space-y-2">
          {filteredWords.length === 0 ? (
            <Card className="border-neo border-neo-black shadow-hard bg-neo-navy/50">
              <CardContent className="py-8 text-center">
                <p className="text-slate-400">
                  {searchQuery
                    ? t('education.practice.noResults')
                    : t('education.practice.noWords')}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredWords.map((word, idx) => (
              <Card
                key={`word-${idx}-${word.word}`}
                onClick={() => handleToggleExpand(word.word)}
                className={cn(
                  'border-neo border-neo-black shadow-hard cursor-pointer',
                  'transition-all hover:shadow-hard-lg',
                  expandedWord === word.word
                    ? 'bg-neo-cyan/10'
                    : 'bg-neo-navy/80 hover:bg-neo-navy/60'
                )}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {word.canIntegrate ? (
                        <CheckCircle className="w-4 h-4 text-neo-cyan shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-neo-yellow shrink-0" />
                      )}
                      <span className="text-lg font-neo-body text-neo-white">
                        {word.word}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {expandedWord === word.word ? '▲' : '▼'}
                    </span>
                  </div>

                  {/* Expanded definition */}
                  {expandedWord === word.word && (
                    <div className="mt-3 pt-3 border-t border-neo-black/30">
                      {word.definition ? (
                        <p className="text-sm text-slate-300">{word.definition}</p>
                      ) : (
                        <p className="text-sm text-slate-500 italic">
                          {t('education.practice.noDefinition')}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-2">
                        {word.canIntegrate
                          ? t('teacher.lesson.canIntegrate')
                          : t('teacher.lesson.cannotIntegrate')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Done button */}
        <div className="mt-6">
          <Button
            onClick={() => {
              onViewComplete?.();
              onBack();
            }}
            className={cn(
              'w-full bg-neo-cyan text-neo-black font-bold',
              'border-neo border-neo-black shadow-hard hover:shadow-hard-pressed'
            )}
          >
            {t('common.understood')}
          </Button>
        </div>
      </div>
    </div>
  );
}
